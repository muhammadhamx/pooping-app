import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_TITLE_KEY = '@throne_selected_title';
const UNLOCKED_TITLES_KEY = '@throne_unlocked_titles';

export interface ThroneTitle {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockCondition: string; // human-readable
  check: (ctx: TitleCheckContext) => boolean;
}

export interface TitleCheckContext {
  totalSessions: number;
  currentStreak: number;
  totalXP: number;
  hasSpeedrun: boolean;     // any session < 60s
  hasMarathon: boolean;     // any session > 30min
  hasNightOwl: boolean;     // session between midnight-4am
  hasEarlyBird: boolean;    // session before 6am
  hasBuddyChat: boolean;
  rankId: string;
}

export const THRONE_TITLES: ThroneTitle[] = [
  {
    id: 'the_newbie',
    name: 'The Newbie',
    description: 'Just getting started',
    emoji: '🐣',
    unlockCondition: 'Default title',
    check: () => true,
  },
  {
    id: 'the_philosopher',
    name: 'The Philosopher',
    description: 'Deep thinker, deep sitter',
    emoji: '🤔',
    unlockCondition: 'Complete 10 sessions',
    check: (ctx) => ctx.totalSessions >= 10,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'In and out before anyone noticed',
    emoji: '⚡',
    unlockCondition: 'Complete a session under 60 seconds',
    check: (ctx) => ctx.hasSpeedrun,
  },
  {
    id: 'marathon_monarch',
    name: 'Marathon Monarch',
    description: 'Rules from the throne for ages',
    emoji: '🏰',
    unlockCondition: 'Complete a session over 30 minutes',
    check: (ctx) => ctx.hasMarathon,
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Consistency is key',
    emoji: '🔥',
    unlockCondition: 'Reach a 7-day streak',
    check: (ctx) => ctx.currentStreak >= 7,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'The throne never sleeps',
    emoji: '🦉',
    unlockCondition: 'Log a session after midnight',
    check: (ctx) => ctx.hasNightOwl,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'First one up, first one down',
    emoji: '🐦',
    unlockCondition: 'Log a session before 6 AM',
    check: (ctx) => ctx.hasEarlyBird,
  },
  {
    id: 'social_sitter',
    name: 'Social Sitter',
    description: 'Never poops alone',
    emoji: '🤝',
    unlockCondition: 'Chat with a poop buddy',
    check: (ctx) => ctx.hasBuddyChat,
  },
  {
    id: 'the_regular',
    name: 'The Regular',
    description: 'Like clockwork',
    emoji: '⏰',
    unlockCondition: 'Complete 50 sessions',
    check: (ctx) => ctx.totalSessions >= 50,
  },
  {
    id: 'throne_veteran',
    name: 'Throne Veteran',
    description: 'Seen it all, sat through it all',
    emoji: '🎖️',
    unlockCondition: 'Complete 100 sessions',
    check: (ctx) => ctx.totalSessions >= 100,
  },
  {
    id: 'xp_hunter',
    name: 'XP Hunter',
    description: 'Always grinding',
    emoji: '💰',
    unlockCondition: 'Earn 1,000 XP',
    check: (ctx) => ctx.totalXP >= 1000,
  },
  {
    id: 'royal_highness',
    name: 'Royal Highness',
    description: 'Bow before the throne',
    emoji: '👑',
    unlockCondition: 'Reach Throne King rank',
    check: (ctx) => ['king', 'royal_flush', 'almighty'].includes(ctx.rankId),
  },
  {
    id: 'the_legend',
    name: 'The Legend',
    description: 'They speak of you in whispered flushes',
    emoji: '🌟',
    unlockCondition: 'Earn 5,000 XP',
    check: (ctx) => ctx.totalXP >= 5000,
  },
  {
    id: 'streak_inferno',
    name: 'Streak Inferno',
    description: 'Unstoppable force of nature',
    emoji: '☄️',
    unlockCondition: 'Reach a 30-day streak',
    check: (ctx) => ctx.currentStreak >= 30,
  },
];

/** Rank-gated avatar emojis — [rankId, emoji] */
export const LOCKED_AVATARS: Array<{ emoji: string; rankId: string; rankName: string }> = [
  { emoji: '🦅', rankId: 'knight', rankName: 'Knight of the Bowl' },
  { emoji: '🐉', rankId: 'prince', rankName: 'Porcelain Prince' },
  { emoji: '🦁', rankId: 'king', rankName: 'Throne King' },
  { emoji: '🐲', rankId: 'royal_flush', rankName: 'Royal Flush' },
  { emoji: '👾', rankId: 'almighty', rankName: 'The Almighty Dump' },
];

const RANK_ORDER = ['trainee', 'seat_warmer', 'apprentice', 'knight', 'prince', 'king', 'royal_flush', 'almighty'];

export function isAvatarUnlocked(emoji: string, currentRankId: string): boolean {
  const locked = LOCKED_AVATARS.find((a) => a.emoji === emoji);
  if (!locked) return true; // Not in locked list = always available
  const currentIdx = RANK_ORDER.indexOf(currentRankId);
  const requiredIdx = RANK_ORDER.indexOf(locked.rankId);
  return currentIdx >= requiredIdx;
}

export function getUnlockedTitles(ctx: TitleCheckContext): ThroneTitle[] {
  return THRONE_TITLES.filter((t) => t.check(ctx));
}

export async function getSelectedTitle(): Promise<string> {
  const id = await AsyncStorage.getItem(SELECTED_TITLE_KEY);
  return id ?? 'the_newbie';
}

export async function setSelectedTitle(id: string): Promise<void> {
  await AsyncStorage.setItem(SELECTED_TITLE_KEY, id);
}

export async function getPersistedUnlockedTitles(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(UNLOCKED_TITLES_KEY);
  return stored ? JSON.parse(stored) : ['the_newbie'];
}

export async function persistUnlockedTitles(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(UNLOCKED_TITLES_KEY, JSON.stringify(ids));
}
