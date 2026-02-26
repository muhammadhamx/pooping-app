import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/stores/sessionStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import {
  ACHIEVEMENTS,
  checkAchievements,
  type Achievement,
  type AchievementContext,
} from '@/humor/achievements';
import { XP_REWARDS } from '@/gamification/xp';

const ACHIEVEMENTS_KEY = '@achievements_unlocked';

export function useAchievements() {
  const sessions = useSessionStore((s) => s.sessions);
  const addXP = useGamificationStore((s) => s.addXP);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [newlyUnlockedQueue, setNewlyUnlockedQueue] = useState<Achievement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(ACHIEVEMENTS_KEY).then((val) => {
      if (val) setUnlockedIds(JSON.parse(val));
      setIsLoaded(true);
    });
  }, []);

  // TODO: get real counts from chat store when available
  const context: AchievementContext = useMemo(
    () => ({ totalBuddyChats: 0, totalRoomJoins: 0 }),
    []
  );

  // Check for newly unlocked achievements
  const newlyUnlocked = useMemo(
    () => (isLoaded ? checkAchievements(sessions, context, unlockedIds) : []),
    [sessions, context, unlockedIds, isLoaded]
  );

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const newIds = [...unlockedIds, ...newlyUnlocked.map((a) => a.id)];
      setUnlockedIds(newIds);
      AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(newIds));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Award XP for each new achievement
      addXP(XP_REWARDS.achievement_unlock * newlyUnlocked.length);

      // Queue for celebration display
      setNewlyUnlockedQueue((prev) => [...prev, ...newlyUnlocked]);
    }
  }, [newlyUnlocked.length]);

  const dismissNewlyUnlocked = useCallback(() => {
    setNewlyUnlockedQueue([]);
  }, []);

  return {
    achievements: ACHIEVEMENTS,
    unlockedIds,
    newlyUnlockedQueue,
    dismissNewlyUnlocked,
    unlockedCount: unlockedIds.length,
    totalCount: ACHIEVEMENTS.length,
  };
}
