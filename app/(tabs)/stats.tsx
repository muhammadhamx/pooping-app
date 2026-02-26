import { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useStatsStore, type StatsPeriod } from '@/stores/statsStore';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { formatDuration, formatHour } from '@/utils/formatters';
import { getRandomItem, EMPTY_STATE_MESSAGES } from '@/humor/jokes';
import { analyzeHealth, getOverallStatus, HEALTH_DISCLAIMER } from '@/health/insights';
import { COLORS, SHADOWS } from '@/utils/constants';

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All Time' },
];

export default function StatsScreen() {
  const user = useAuthStore((s) => s.user);
  const { period, data, isLoading, setPeriod, loadStats } = useStatsStore();
  const sessions = useSessionStore((s) => s.sessions);

  const refresh = useCallback(() => {
    if (user?.id) loadStats(user.id);
  }, [user?.id, loadStats]);

  useEffect(() => {
    refresh();
  }, [refresh, period]);

  const healthInsights = useMemo(() => analyzeHealth(sessions), [sessions]);
  const overallHealth = useMemo(
    () => getOverallStatus(healthInsights),
    [healthInsights]
  );

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <View style={styles.container}>
        <PeriodSelector period={period} onSelect={setPeriod} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>
            {getRandomItem(EMPTY_STATE_MESSAGES.stats)}
          </Text>
        </View>
      </View>
    );
  }

  const barData = data.hourlyDistribution
    .filter((h) => h.count > 0)
    .map((h) => ({
      value: h.count,
      label: h.hour % 6 === 0 ? formatHour(h.hour) : '',
      frontColor: COLORS.accent,
    }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
        />
      }
    >
      <PeriodSelector period={period} onSelect={setPeriod} />

      {/* Summary Cards */}
      <View style={styles.cardsRow}>
        <StatCard
          emoji="🚽"
          label="Sessions"
          value={data.totalSessions.toString()}
        />
        <StatCard
          emoji="⏱️"
          label="Total Time"
          value={formatDuration(data.totalDuration)}
        />
      </View>
      <View style={styles.cardsRow}>
        <StatCard
          emoji="📏"
          label="Average"
          value={formatDuration(data.avgDuration)}
        />
        <StatCard
          emoji="🏆"
          label="Longest"
          value={formatDuration(data.longestSession)}
        />
      </View>
      <View style={styles.cardsRow}>
        <StatCard
          emoji="🔥"
          label="Streak"
          value={`${data.streak} day${data.streak !== 1 ? 's' : ''}`}
        />
      </View>

      {/* Time of Day Chart */}
      {barData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Time of Day</Text>
          <BarChart
            data={barData}
            barWidth={12}
            spacing={4}
            roundedTop
            roundedBottom
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={COLORS.border}
            yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9 }}
            height={150}
            isAnimated
          />
        </View>
      )}

      {/* Health Insights */}
      {healthInsights.length > 0 && (
        <View style={styles.healthContainer}>
          <View style={styles.healthHeader}>
            <View
              style={[
                styles.healthDot,
                overallHealth === 'green' && styles.healthGreen,
                overallHealth === 'yellow' && styles.healthYellow,
                overallHealth === 'red' && styles.healthRed,
              ]}
            />
            <Text style={styles.chartTitle}>Health Insights</Text>
          </View>
          {healthInsights.map((insight, i) => (
            <View key={i} style={styles.healthInsight}>
              <Text style={styles.healthEmoji}>{insight.emoji}</Text>
              <View style={styles.healthTextContainer}>
                <Text style={styles.healthTitle}>{insight.title}</Text>
                <Text style={styles.healthMessage}>{insight.message}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.healthDisclaimer}>{HEALTH_DISCLAIMER}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function PeriodSelector({
  period,
  onSelect,
}: {
  period: StatsPeriod;
  onSelect: (p: StatsPeriod) => void;
}) {
  return (
    <View style={styles.periodContainer}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={[
            styles.periodButton,
            period === p.key && styles.periodButtonActive,
          ]}
          onPress={() => onSelect(p.key)}
        >
          <Text
            style={[
              styles.periodText,
              period === p.key && styles.periodTextActive,
            ]}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 32,
  },
  periodContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: COLORS.accent,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.primaryDark,
  },
  cardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  healthContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  healthGreen: {
    backgroundColor: COLORS.success,
  },
  healthYellow: {
    backgroundColor: COLORS.warning,
  },
  healthRed: {
    backgroundColor: COLORS.error,
  },
  healthInsight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  healthEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  healthTextContainer: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  healthMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  healthDisclaimer: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
