import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_COUNT_KEY = '@throne_session_count';
const LUCKY_CHANCE = 0.20; // 20% chance per session
const MYSTERY_BOX_INTERVAL = 5; // every 5th session

export interface LuckyPoop {
  multiplier: number; // 2–5
  label: string;
  emoji: string;
}

export interface MysteryReward {
  type: 'xp_bonus' | 'streak_freeze';
  amount: number; // XP amount or freeze count
  label: string;
  emoji: string;
}

export interface SessionReward {
  baseXP: number;
  luckyPoop: LuckyPoop | null;
  mysteryBox: MysteryReward | null;
  totalXP: number;
}

const LUCKY_TIERS: LuckyPoop[] = [
  { multiplier: 2, label: 'Double Dump!', emoji: '💩💩' },
  { multiplier: 3, label: 'Triple Threat!', emoji: '💩💩💩' },
  { multiplier: 5, label: 'GOLDEN FLUSH!', emoji: '✨💩👑' },
];

const MYSTERY_REWARDS: MysteryReward[] = [
  { type: 'xp_bonus', amount: 50, label: '50 Bonus XP', emoji: '🎁' },
  { type: 'xp_bonus', amount: 75, label: '75 Bonus XP', emoji: '🎁' },
  { type: 'xp_bonus', amount: 100, label: '100 Bonus XP', emoji: '💎' },
  { type: 'xp_bonus', amount: 150, label: '150 Bonus XP', emoji: '💎' },
  { type: 'xp_bonus', amount: 200, label: '200 Bonus XP!', emoji: '🏆' },
  { type: 'streak_freeze', amount: 1, label: 'Streak Freeze', emoji: '🧊' },
];

function rollLucky(): LuckyPoop | null {
  if (Math.random() > LUCKY_CHANCE) return null;
  // Weighted: 60% 2x, 30% 3x, 10% 5x
  const roll = Math.random();
  if (roll < 0.60) return LUCKY_TIERS[0];
  if (roll < 0.90) return LUCKY_TIERS[1];
  return LUCKY_TIERS[2];
}

function rollMysteryBox(): MysteryReward {
  return MYSTERY_REWARDS[Math.floor(Math.random() * MYSTERY_REWARDS.length)];
}

/** Increment session count and return the new total */
export async function incrementSessionCount(): Promise<number> {
  const stored = await AsyncStorage.getItem(SESSION_COUNT_KEY);
  const count = (stored ? parseInt(stored, 10) : 0) + 1;
  await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count));
  return count;
}

export async function getSessionCount(): Promise<number> {
  const stored = await AsyncStorage.getItem(SESSION_COUNT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Roll rewards for a completed session.
 * Call AFTER incrementing session count.
 */
export function rollSessionReward(baseXP: number, sessionCount: number): SessionReward {
  const lucky = rollLucky();
  const isMysteryBox = sessionCount > 0 && sessionCount % MYSTERY_BOX_INTERVAL === 0;
  const mystery = isMysteryBox ? rollMysteryBox() : null;

  const multiplier = lucky?.multiplier ?? 1;
  const multipliedXP = baseXP * multiplier;
  const mysteryXP = mystery?.type === 'xp_bonus' ? mystery.amount : 0;
  const totalXP = multipliedXP + mysteryXP;

  return {
    baseXP,
    luckyPoop: lucky,
    mysteryBox: mystery,
    totalXP,
  };
}
