import { View, Text, StyleSheet } from 'react-native';
import { getComparison } from '@/humor/comparisons';
import { useStatsStore } from '@/stores/statsStore';
import { COLORS } from '@/utils/constants';

export function WeeklyComparison() {
  const totalDuration = useStatsStore((s) => s.data?.totalDuration ?? 0);
  const totalMinutes = Math.round(totalDuration / 60);

  const comparison = getComparison(totalMinutes);

  if (!comparison) return null;

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.text}>
          {totalMinutes} min this week — {comparison}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
