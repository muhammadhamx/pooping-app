import type { Session } from '@/types/database';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockMessage: string;
  flavor: string;
  check: (sessions: Session[], context: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalBuddyChats: number;
  totalRoomJoins: number;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    name: 'First Plop',
    description: 'Complete your first session',
    emoji: '🎉',
    unlockMessage: "And so it begins! Your throne journey has officially started.",
    flavor: "Every legend has an origin story. Yours started on the toilet.",
    check: (sessions) => sessions.length >= 1,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a session before 6 AM',
    emoji: '🐦',
    unlockMessage: "The early bird gets the... relief. Impressive dedication!",
    flavor: "While the world sleeps, you reign supreme on the porcelain throne.",
    check: (sessions) =>
      sessions.some((s) => new Date(s.started_at).getHours() < 6),
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a session after midnight',
    emoji: '🦉',
    unlockMessage: "A midnight mission to the throne room. The owls salute you.",
    flavor: "Some call it insomnia. You call it a strategic late-night deployment.",
    check: (sessions) =>
      sessions.some((s) => {
        const hour = new Date(s.started_at).getHours();
        return hour >= 0 && hour < 4;
      }),
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    description: 'Complete a session in under 2 minutes',
    emoji: '⚡',
    unlockMessage: "In and out! That was faster than a microwave burrito.",
    flavor: "You didn't even have time to open your phone. A true professional.",
    check: (sessions) =>
      sessions.some(
        (s) => s.duration_seconds !== null && s.duration_seconds < 120
      ),
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Survive a session over 30 minutes',
    emoji: '🏅',
    unlockMessage: "30 minutes?! Your legs must be numb. You've earned this.",
    flavor: "Doctors hate this one weird trick. Actually, they probably do.",
    check: (sessions) =>
      sessions.some(
        (s) => s.duration_seconds !== null && s.duration_seconds > 1800
      ),
  },
  {
    id: 'regular',
    name: 'Regular as Clockwork',
    description: '7-day streak at the same time (within 15 min)',
    emoji: '⏰',
    unlockMessage: "Your body runs like a Swiss watch. A very specific Swiss watch.",
    flavor: "Consistency is key. Your colon got the memo.",
    check: (sessions) => {
      if (sessions.length < 7) return false;
      const sorted = [...sessions]
        .sort(
          (a, b) =>
            new Date(b.started_at).getTime() -
            new Date(a.started_at).getTime()
        )
        .slice(0, 14);

      // Check if any 7 consecutive days have sessions within 15 min of same time
      for (let i = 0; i <= sorted.length - 7; i++) {
        const window = sorted.slice(i, i + 7);
        const times = window.map((s) => {
          const d = new Date(s.started_at);
          return d.getHours() * 60 + d.getMinutes();
        });
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const allClose = times.every((t) => Math.abs(t - avg) <= 15);
        if (allClose) return true;
      }
      return false;
    },
  },
  {
    id: 'week_streak',
    name: 'Streaker',
    description: 'Log sessions 7 days in a row',
    emoji: '🔥',
    unlockMessage: "7 days! You're on fire! (Not literally, hopefully.)",
    flavor: "A week of unbroken throne dominance. The porcelain bows before you.",
    check: (sessions) => {
      if (sessions.length < 7) return false;
      const days = new Set(
        sessions.map((s) =>
          new Date(s.started_at).toISOString().slice(0, 10)
        )
      );
      const sortedDays = [...days].sort();
      let streak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diffDays =
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
          if (streak >= 7) return true;
        } else {
          streak = 1;
        }
      }
      return false;
    },
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Log 100 sessions',
    emoji: '💯',
    unlockMessage: "100 sessions! That's... a lot of toilet paper.",
    flavor: "If each session averaged 5 minutes, that's over 8 hours on the throne. Respect.",
    check: (sessions) => sessions.length >= 100,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Chat with 10 different poop buddies',
    emoji: '🦋',
    unlockMessage: "10 poop buddies! You're basically a bathroom networking expert.",
    flavor: "LinkedIn for the lavatory. Your connections are... unique.",
    check: (_sessions, ctx) => ctx.totalBuddyChats >= 10,
  },
  {
    id: 'throne_regular',
    name: 'Throne Room Regular',
    description: 'Join group chat 20 times',
    emoji: '👑',
    unlockMessage: "The Throne Room knows your name. You're basically royalty now.",
    flavor: "Where everybody knows your name... and what you're doing there.",
    check: (_sessions, ctx) => ctx.totalRoomJoins >= 20,
  },
];

export function checkAchievements(
  sessions: Session[],
  context: AchievementContext,
  alreadyUnlocked: string[]
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.includes(a.id) && a.check(sessions, context)
  );
}
