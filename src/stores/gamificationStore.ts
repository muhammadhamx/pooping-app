import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRank, getNextRank, getXPProgress, XP_REWARDS, type ThroneRank } from '@/gamification/xp';
import { getDailyChallenges, type DailyChallenge, type ChallengeContext } from '@/gamification/challenges';
import { getReachedMilestone, STREAK_FREEZE_CONFIG, type StreakMilestone } from '@/gamification/streaks';
import { syncGamificationUp, syncGamificationDown } from '@/lib/database';

const STORAGE_KEYS = {
  xp: '@throne_xp',
  streak: '@throne_streak',
  dailyChallenges: '@throne_daily_challenges',
  todayActivity: '@throne_today_activity',
} as const;

interface StreakData {
  count: number;
  lastDate: string; // ISO date string (YYYY-MM-DD)
  freezesRemaining: number;
}

interface DailyChallengesData {
  date: string; // YYYY-MM-DD
  challengeIds: string[];
  completed: string[];
}

/** Tracks today's activity for daily challenge checks */
interface TodayActivity {
  date: string; // YYYY-MM-DD
  buddyChatDone: boolean;
  roomJoinDone: boolean;
  quickLogDone: boolean;
  sessionBeforeNoon: boolean;
}

function getEmptyTodayActivity(): TodayActivity {
  return {
    date: new Date().toISOString().slice(0, 10),
    buddyChatDone: false,
    roomJoinDone: false,
    quickLogDone: false,
    sessionBeforeNoon: false,
  };
}

/** Fire-and-forget sync to Supabase — does not block the caller */
function syncToRemote(userId: string | undefined) {
  if (!userId) return;
  // Grab a snapshot from AsyncStorage and push to Supabase
  Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.xp),
    AsyncStorage.getItem(STORAGE_KEYS.streak),
    AsyncStorage.getItem('@throne_selected_title'),
    AsyncStorage.getItem('@throne_unlocked_titles'),
    AsyncStorage.getItem('@achievements_unlocked'),
    AsyncStorage.getItem('@throne_session_count'),
  ]).then(([xpStr, streakStr, titleStr, titlesStr, achievementsStr, sessionCountStr]) => {
    const xp = xpStr ? parseInt(xpStr, 10) : 0;
    const streak: StreakData = streakStr
      ? JSON.parse(streakStr)
      : { count: 0, lastDate: '', freezesRemaining: STREAK_FREEZE_CONFIG.maxFreezes };

    syncGamificationUp(userId, {
      xp,
      streakCount: streak.count,
      streakLastDate: streak.lastDate,
      streakFreezes: streak.freezesRemaining,
      selectedTitleId: titleStr ?? 'the_newbie',
      unlockedTitleIds: titlesStr ? JSON.parse(titlesStr) : ['the_newbie'],
      unlockedAchievementIds: achievementsStr ? JSON.parse(achievementsStr) : [],
      rewardSessionCount: sessionCountStr ? parseInt(sessionCountStr, 10) : 0,
    }).catch(() => {
      // Silent fail — local is source of truth during active use
    });
  });
}

/** Get the current user id from the auth store (lazy import to avoid circular deps) */
function getCurrentUserId(): string | undefined {
  try {
    const { useAuthStore } = require('@/stores/authStore');
    return useAuthStore.getState().user?.id;
  } catch {
    return undefined;
  }
}

interface GamificationState {
  xp: number;
  streak: StreakData;
  dailyChallenges: DailyChallengesData | null;
  todayActivity: TodayActivity;
  isLoaded: boolean;

  // Computed
  rank: ThroneRank;
  nextRank: ThroneRank | null;
  xpProgress: { current: number; needed: number; percentage: number };

  // Actions
  initialize: () => Promise<void>;
  restoreFromRemote: (userId: string) => Promise<void>;
  addXP: (amount: number) => Promise<{ newXP: number; rankedUp: boolean; newRank: ThroneRank | null }>;
  updateStreak: (currentStreak: number) => Promise<StreakMilestone | null>;
  useStreakFreeze: () => Promise<boolean>;
  loadDailyChallenges: () => Promise<DailyChallenge[]>;
  completeDailyChallenge: (challengeId: string) => Promise<void>;
  checkDailyChallenges: (ctx: ChallengeContext) => Promise<string[]>;
  addStreakFreeze: (amount: number) => Promise<void>;
  trackActivity: (key: keyof Omit<TodayActivity, 'date'>) => Promise<void>;
  buildChallengeContext: (sessionsToday: number, sessionsRatedToday: number) => ChallengeContext;
  reset: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  xp: 0,
  streak: { count: 0, lastDate: '', freezesRemaining: STREAK_FREEZE_CONFIG.maxFreezes },
  dailyChallenges: null,
  todayActivity: getEmptyTodayActivity(),
  isLoaded: false,

  rank: getRank(0),
  nextRank: getNextRank(0),
  xpProgress: getXPProgress(0),

  initialize: async () => {
    try {
      const [xpStr, streakStr, challengesStr, activityStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.xp),
        AsyncStorage.getItem(STORAGE_KEYS.streak),
        AsyncStorage.getItem(STORAGE_KEYS.dailyChallenges),
        AsyncStorage.getItem(STORAGE_KEYS.todayActivity),
      ]);

      const xp = xpStr ? parseInt(xpStr, 10) : 0;
      const streak: StreakData = streakStr
        ? JSON.parse(streakStr)
        : { count: 0, lastDate: '', freezesRemaining: STREAK_FREEZE_CONFIG.maxFreezes };
      const dailyChallenges: DailyChallengesData | null = challengesStr
        ? JSON.parse(challengesStr)
        : null;

      const today = new Date().toISOString().slice(0, 10);
      let todayActivity: TodayActivity = getEmptyTodayActivity();
      if (activityStr) {
        const parsed: TodayActivity = JSON.parse(activityStr);
        todayActivity = parsed.date === today ? parsed : getEmptyTodayActivity();
      }

      set({
        xp,
        streak,
        dailyChallenges,
        todayActivity,
        isLoaded: true,
        rank: getRank(xp),
        nextRank: getNextRank(xp),
        xpProgress: getXPProgress(xp),
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  /**
   * Pull ALL gamification data from Supabase and restore locally.
   * Restores XP, streak, titles, achievements, and session count.
   * Called after email sign-in.
   */
  restoreFromRemote: async (userId: string) => {
    try {
      const remote = await syncGamificationDown(userId);
      if (!remote) return;

      const localXP = get().xp;

      // Take whichever has more progress (prevents accidental downgrade)
      if (remote.xp >= localXP) {
        const streak: StreakData = {
          count: remote.streakCount,
          lastDate: remote.streakLastDate,
          freezesRemaining: remote.streakFreezes,
        };

        set({
          xp: remote.xp,
          streak,
          rank: getRank(remote.xp),
          nextRank: getNextRank(remote.xp),
          xpProgress: getXPProgress(remote.xp),
        });

        await AsyncStorage.setItem(STORAGE_KEYS.xp, String(remote.xp));
        await AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(streak));
      }

      // Always restore cosmetics, achievements, and session count from remote
      await Promise.all([
        AsyncStorage.setItem('@throne_selected_title', remote.selectedTitleId),
        AsyncStorage.setItem('@throne_unlocked_titles', JSON.stringify(remote.unlockedTitleIds)),
        AsyncStorage.setItem('@achievements_unlocked', JSON.stringify(remote.unlockedAchievementIds)),
        AsyncStorage.setItem('@throne_session_count', String(remote.rewardSessionCount)),
      ]);
    } catch {
      // Silent fail — local data stays as-is
    }
  },

  addXP: async (amount) => {
    const { xp: oldXP } = get();
    const oldRank = getRank(oldXP);
    const newXP = oldXP + amount;
    const newRank = getRank(newXP);
    const rankedUp = newRank.id !== oldRank.id;

    set({
      xp: newXP,
      rank: newRank,
      nextRank: getNextRank(newXP),
      xpProgress: getXPProgress(newXP),
    });

    await AsyncStorage.setItem(STORAGE_KEYS.xp, String(newXP));

    // Sync to Supabase in the background
    syncToRemote(getCurrentUserId());

    return {
      newXP,
      rankedUp,
      newRank: rankedUp ? newRank : null,
    };
  },

  updateStreak: async (currentStreak) => {
    const { streak: oldStreak } = get();
    const today = new Date().toISOString().slice(0, 10);

    const newStreak: StreakData = {
      count: currentStreak,
      lastDate: today,
      freezesRemaining: oldStreak.freezesRemaining,
    };

    // Award freeze at certain milestones
    if (currentStreak === 7 || currentStreak === 30) {
      newStreak.freezesRemaining = Math.min(
        newStreak.freezesRemaining + 1,
        STREAK_FREEZE_CONFIG.maxFreezes
      );
    }

    set({ streak: newStreak });
    await AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(newStreak));

    // Sync to Supabase in the background
    syncToRemote(getCurrentUserId());

    // Check if a milestone was reached
    const milestone = getReachedMilestone(currentStreak);
    if (milestone) {
      await get().addXP(milestone.xpBonus);
    }

    return milestone;
  },

  useStreakFreeze: async () => {
    const { streak } = get();
    if (streak.freezesRemaining <= 0) return false;

    const newStreak: StreakData = {
      ...streak,
      freezesRemaining: streak.freezesRemaining - 1,
    };

    set({ streak: newStreak });
    await AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(newStreak));

    syncToRemote(getCurrentUserId());

    return true;
  },

  addStreakFreeze: async (amount) => {
    const { streak } = get();
    const newStreak: StreakData = {
      ...streak,
      freezesRemaining: streak.freezesRemaining + amount,
    };
    set({ streak: newStreak });
    await AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(newStreak));
    syncToRemote(getCurrentUserId());
  },

  loadDailyChallenges: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { dailyChallenges: stored } = get();

    if (stored && stored.date === today) {
      const todayChallenges = getDailyChallenges(new Date());
      return todayChallenges.filter((c) => stored.challengeIds.includes(c.id));
    }

    const challenges = getDailyChallenges(new Date());
    const data: DailyChallengesData = {
      date: today,
      challengeIds: challenges.map((c) => c.id),
      completed: [],
    };

    set({ dailyChallenges: data });
    await AsyncStorage.setItem(STORAGE_KEYS.dailyChallenges, JSON.stringify(data));

    return challenges;
  },

  completeDailyChallenge: async (challengeId) => {
    const { dailyChallenges } = get();
    if (!dailyChallenges) return;
    if (dailyChallenges.completed.includes(challengeId)) return;

    const updated: DailyChallengesData = {
      ...dailyChallenges,
      completed: [...dailyChallenges.completed, challengeId],
    };

    set({ dailyChallenges: updated });
    await AsyncStorage.setItem(STORAGE_KEYS.dailyChallenges, JSON.stringify(updated));

    await get().addXP(XP_REWARDS.daily_challenge);
  },

  checkDailyChallenges: async (ctx) => {
    const { dailyChallenges } = get();
    if (!dailyChallenges) return [];

    const todayChallenges = getDailyChallenges(new Date());
    const activeChallenges = todayChallenges.filter(
      (c) => dailyChallenges.challengeIds.includes(c.id)
    );

    const newlyCompleted: string[] = [];
    for (const challenge of activeChallenges) {
      if (
        !dailyChallenges.completed.includes(challenge.id) &&
        challenge.check(ctx)
      ) {
        await get().completeDailyChallenge(challenge.id);
        newlyCompleted.push(challenge.id);
      }
    }

    return newlyCompleted;
  },

  trackActivity: async (key) => {
    const today = new Date().toISOString().slice(0, 10);
    let { todayActivity } = get();

    if (todayActivity.date !== today) {
      todayActivity = getEmptyTodayActivity();
    }

    const updated: TodayActivity = { ...todayActivity, [key]: true };
    set({ todayActivity: updated });
    await AsyncStorage.setItem(STORAGE_KEYS.todayActivity, JSON.stringify(updated));
  },

  buildChallengeContext: (sessionsToday, sessionsRatedToday) => {
    const { todayActivity } = get();
    return {
      sessionsToday,
      sessionsRatedToday,
      buddyChatToday: todayActivity.buddyChatDone,
      roomJoinToday: todayActivity.roomJoinDone,
      sessionBeforeNoon: todayActivity.sessionBeforeNoon,
      quickLogToday: todayActivity.quickLogDone,
    };
  },

  reset: async () => {
    // Clear all gamification + cosmetics + rewards + achievements + notification schedule keys
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.xp),
      AsyncStorage.removeItem(STORAGE_KEYS.streak),
      AsyncStorage.removeItem(STORAGE_KEYS.dailyChallenges),
      AsyncStorage.removeItem(STORAGE_KEYS.todayActivity),
      AsyncStorage.removeItem('@throne_selected_title'),
      AsyncStorage.removeItem('@throne_unlocked_titles'),
      AsyncStorage.removeItem('@throne_session_count'),
      AsyncStorage.removeItem('@achievements_unlocked'),
      AsyncStorage.removeItem('@engagement_scheduled_date'),
      AsyncStorage.removeItem('@streak_risk_scheduled_date'),
      AsyncStorage.removeItem('@weekly_recap_scheduled_date'),
    ]);

    set({
      xp: 0,
      streak: { count: 0, lastDate: '', freezesRemaining: STREAK_FREEZE_CONFIG.maxFreezes },
      dailyChallenges: null,
      todayActivity: getEmptyTodayActivity(),
      isLoaded: false,
      rank: getRank(0),
      nextRank: getNextRank(0),
      xpProgress: getXPProgress(0),
    });
  },
}));
