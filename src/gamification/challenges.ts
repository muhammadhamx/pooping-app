export interface ChallengeContext {
  sessionsToday: number;
  sessionsRatedToday: number;
  buddyChatToday: boolean;
  roomJoinToday: boolean;
  sessionBeforeNoon: boolean;
  quickLogToday: boolean;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  check: (ctx: ChallengeContext) => boolean;
}

export const CHALLENGE_POOL: DailyChallenge[] = [
  {
    id: 'log_before_noon',
    title: 'Early Throne',
    description: 'Log a session before noon',
    emoji: '🌅',
    xpReward: 40,
    check: (ctx) => ctx.sessionBeforeNoon,
  },
  {
    id: 'rate_all',
    title: 'Royal Critic',
    description: 'Rate all your sessions today',
    emoji: '⭐',
    xpReward: 30,
    check: (ctx) => ctx.sessionsToday > 0 && ctx.sessionsRatedToday >= ctx.sessionsToday,
  },
  {
    id: 'chat_buddy',
    title: 'Social Sitter',
    description: 'Chat with a poop buddy',
    emoji: '💬',
    xpReward: 35,
    check: (ctx) => ctx.buddyChatToday,
  },
  {
    id: 'two_sessions',
    title: 'Double Duty',
    description: 'Log 2 sessions today',
    emoji: '✌️',
    xpReward: 40,
    check: (ctx) => ctx.sessionsToday >= 2,
  },
  {
    id: 'quick_log',
    title: 'Catch-Up Logger',
    description: 'Quick log a past session',
    emoji: '📝',
    xpReward: 25,
    check: (ctx) => ctx.quickLogToday,
  },
  {
    id: 'join_room',
    title: 'Group Pooper',
    description: 'Join a group chat room',
    emoji: '🏠',
    xpReward: 30,
    check: (ctx) => ctx.roomJoinToday,
  },
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** Pick today's challenges deterministically — same date = same challenges for everyone */
export function getDailyChallenges(date: Date, count: number = 3): DailyChallenge[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    return simpleHash(a.id + seed) - simpleHash(b.id + seed);
  });
  return shuffled.slice(0, count);
}
