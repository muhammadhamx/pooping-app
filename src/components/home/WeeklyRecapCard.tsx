import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';
import { getSessionsByDateRange } from '@/lib/database';
import { formatDuration } from '@/utils/formatters';
import { COLORS, SHADOWS } from '@/utils/constants';

interface WeeklyStats {
  sessions: number;
  totalDuration: number;
  avgDuration: number;
  longestSession: number;
  mostActiveHour: number;
}

function getLastWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  // End of last week (last Saturday midnight)
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - dayOfWeek);
  endDate.setHours(0, 0, 0, 0);
  // Start of last week (last Sunday midnight)
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 7);
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function WeeklyRecapCard() {
  const userId = useAuthStore((s) => s.user?.id);
  const [stats, setStats] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Only show on Sun-Tue (days 0-2)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek > 2) return;

    const { start, end } = getLastWeekRange();
    getSessionsByDateRange(userId, start, end).then((sessions) => {
      if (sessions.length === 0) return;

      const durations = sessions
        .filter((s) => s.duration_seconds)
        .map((s) => s.duration_seconds!);
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      const avgDuration = Math.round(totalDuration / durations.length);
      const longestSession = Math.max(...durations);

      // Most active hour
      const hourCounts: Record<number, number> = {};
      for (const s of sessions) {
        const hour = new Date(s.started_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
      const mostActiveHour = Object.entries(hourCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      setStats({
        sessions: sessions.length,
        totalDuration,
        avgDuration,
        longestSession,
        mostActiveHour: parseInt(mostActiveHour[0], 10),
      });
    }).catch(() => {});
  }, [userId]);

  if (!stats) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(250).springify().damping(18)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📊</Text>
        <View>
          <Text style={styles.headerTitle}>Last Week's Throne Report</Text>
          <Text style={styles.headerSub}>Your weekly recap is here</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.sessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(stats.avgDuration)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(stats.longestSession)}</Text>
          <Text style={styles.statLabel}>Longest</Text>
        </View>
      </View>

      <View style={styles.funFact}>
        <Text style={styles.funFactText}>
          🕐 You were most active around {formatHour(stats.mostActiveHour)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  statItem: {
    width: '50%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  funFact: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  funFactText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
