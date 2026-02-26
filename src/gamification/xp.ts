// XP reward table — points earned for each action
export const XP_REWARDS = {
  complete_session: 25,
  quick_log: 10,
  rate_session: 5,
  daily_streak: 15,
  streak_milestone_3: 50,
  streak_milestone_7: 100,
  streak_milestone_14: 250,
  streak_milestone_30: 500,
  streak_milestone_60: 1000,
  streak_milestone_100: 2000,
  streak_milestone_365: 5000,
  achievement_unlock: 50,
  buddy_chat: 10,
  room_join: 5,
  daily_challenge: 40,
} as const;

export interface ThroneRank {
  id: string;
  name: string;
  title: string;
  minXP: number;
  emoji: string;
  description: string;
}

export const THRONE_RANKS: ThroneRank[] = [
  {
    id: 'trainee',
    name: 'Toilet Trainee',
    title: 'Trainee',
    minXP: 0,
    emoji: '🧒',
    description: 'Everyone starts somewhere. You just started on a toilet.',
  },
  {
    id: 'seat_warmer',
    name: 'Seat Warmer',
    title: 'Seat Warmer',
    minXP: 100,
    emoji: '🪑',
    description: "You've warmed more seats than a school bus.",
  },
  {
    id: 'apprentice',
    name: 'Porcelain Apprentice',
    title: 'Apprentice',
    minXP: 300,
    emoji: '🏺',
    description: 'Learning the ancient art of the porcelain throne.',
  },
  {
    id: 'knight',
    name: 'Knight of the Bowl',
    title: 'Knight',
    minXP: 750,
    emoji: '⚔️',
    description: 'Sir Sits-a-Lot, defender of the realm.',
  },
  {
    id: 'prince',
    name: 'Porcelain Prince',
    title: 'Prince',
    minXP: 1500,
    emoji: '🤴',
    description: 'Born to rule — one flush at a time.',
  },
  {
    id: 'king',
    name: 'Throne King',
    title: 'King',
    minXP: 3000,
    emoji: '👑',
    description: 'All hail the King of the Throne Room.',
  },
  {
    id: 'royal_flush',
    name: 'Royal Flush',
    title: 'Royal Flush',
    minXP: 6000,
    emoji: '🃏',
    description: 'The rarest hand in the bathroom poker game of life.',
  },
  {
    id: 'almighty',
    name: 'The Almighty Dump',
    title: 'The Almighty',
    minXP: 10000,
    emoji: '💩👑',
    description: 'Legend. Myth. Mostly myth. But also a lot of toilet time.',
  },
];

export function getRank(xp: number): ThroneRank {
  for (let i = THRONE_RANKS.length - 1; i >= 0; i--) {
    if (xp >= THRONE_RANKS[i].minXP) return THRONE_RANKS[i];
  }
  return THRONE_RANKS[0];
}

export function getNextRank(xp: number): ThroneRank | null {
  const currentRank = getRank(xp);
  const idx = THRONE_RANKS.indexOf(currentRank);
  return idx < THRONE_RANKS.length - 1 ? THRONE_RANKS[idx + 1] : null;
}

export function getXPProgress(xp: number): {
  current: number;
  needed: number;
  percentage: number;
} {
  const rank = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current: xp, needed: xp, percentage: 100 };
  const rangeTotal = next.minXP - rank.minXP;
  const rangeProgress = xp - rank.minXP;
  return {
    current: rangeProgress,
    needed: rangeTotal,
    percentage: Math.round((rangeProgress / rangeTotal) * 100),
  };
}
