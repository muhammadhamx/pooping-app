export interface StreakMilestone {
  days: number;
  emoji: string;
  name: string;
  xpBonus: number;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, emoji: '🔥', name: 'Getting Warm', xpBonus: 50 },
  { days: 7, emoji: '🔥🔥', name: 'On Fire', xpBonus: 100 },
  { days: 14, emoji: '🔥🔥🔥', name: 'Blazing', xpBonus: 250 },
  { days: 30, emoji: '☄️', name: 'Inferno', xpBonus: 500 },
  { days: 60, emoji: '🌋', name: 'Volcanic', xpBonus: 1000 },
  { days: 100, emoji: '💎🔥', name: 'Diamond Flame', xpBonus: 2000 },
  { days: 365, emoji: '🏆🔥', name: 'Eternal Flame', xpBonus: 5000 },
];

export const STREAK_FREEZE_CONFIG = {
  maxFreezes: 2,
  freezeDuration: 1, // each freeze covers 1 missed day
} as const;

/** Get the next milestone the user hasn't reached yet */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) ?? null;
}

/** Get the milestone just reached (if any) */
export function getReachedMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days === currentStreak) ?? null;
}

/** Get the current flame emoji based on streak length */
export function getStreakEmoji(streak: number): string {
  if (streak >= 365) return '🏆🔥';
  if (streak >= 100) return '💎🔥';
  if (streak >= 60) return '🌋';
  if (streak >= 30) return '☄️';
  if (streak >= 14) return '🔥🔥🔥';
  if (streak >= 7) return '🔥🔥';
  if (streak >= 3) return '🔥';
  return '🔥';
}
