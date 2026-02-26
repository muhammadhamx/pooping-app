import { create } from 'zustand';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import type { Session } from '@/types/database';
import { getSessionsByDateRange } from '@/lib/database';

export type StatsPeriod = 'today' | 'week' | 'month' | 'all';

interface StatsData {
  totalSessions: number;
  totalDuration: number;
  avgDuration: number;
  longestSession: number;
  sessionsPerDay: Array<{ date: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  streak: number;
}

interface StatsState {
  period: StatsPeriod;
  data: StatsData | null;
  isLoading: boolean;
  setPeriod: (period: StatsPeriod) => void;
  loadStats: (userId: string, allSessions?: Session[]) => Promise<void>;
}

export function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.started_at).toISOString().slice(0, 10))
  );
  const sortedDays = [...days].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  if (!sortedDays.includes(today)) {
    // Check if yesterday is there; if not, streak is 0
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (!sortedDays.includes(yesterday)) return 0;
  }

  let streak = 0;
  const startDate = new Date(sortedDays[0]);
  for (let i = 0; i < sortedDays.length; i++) {
    const expected = new Date(startDate);
    expected.setDate(expected.getDate() - i);
    if (sortedDays.includes(expected.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeStats(sessions: Session[]): StatsData {
  const completed = sessions.filter((s) => s.duration_seconds !== null);

  const totalSessions = completed.length;
  const totalDuration = completed.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );
  const avgDuration =
    totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
  const longestSession = completed.reduce(
    (max, s) => Math.max(max, s.duration_seconds ?? 0),
    0
  );

  // Sessions per day
  const dayMap = new Map<string, number>();
  completed.forEach((s) => {
    const day = new Date(s.started_at).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  });
  const sessionsPerDay = [...dayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hourly distribution
  const hourCounts = new Array(24).fill(0);
  completed.forEach((s) => {
    const hour = new Date(s.started_at).getHours();
    hourCounts[hour]++;
  });
  const hourlyDistribution = hourCounts.map((count, hour) => ({
    hour,
    count,
  }));

  const streak = computeStreak(completed);

  return {
    totalSessions,
    totalDuration,
    avgDuration,
    longestSession,
    sessionsPerDay,
    hourlyDistribution,
    streak,
  };
}

export const useStatsStore = create<StatsState>((set, get) => ({
  period: 'week',
  data: null,
  isLoading: false,

  setPeriod: (period) => set({ period }),

  loadStats: async (userId, allSessions) => {
    set({ isLoading: true });
    try {
      let sessions: Session[];
      const { period } = get();
      const now = new Date();

      if (allSessions && period === 'all') {
        sessions = allSessions;
      } else {
        let startDate: Date;
        switch (period) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'week':
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            break;
          case 'month':
            startDate = startOfMonth(now);
            break;
          default:
            startDate = new Date(0);
        }
        sessions = await getSessionsByDateRange(
          userId,
          startDate.toISOString(),
          endOfDay(now).toISOString()
        );
      }

      const data = computeStats(sessions);
      set({ data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
