import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/utils/constants';

interface XPProgressBarProps {
  current: number;
  needed: number;
  percentage: number;
  rankEmoji?: string;
  showLabel?: boolean;
  height?: number;
  labelColor?: string;
  trackColor?: string;
  fillColor?: string;
}

export function XPProgressBar({
  current,
  needed,
  percentage,
  rankEmoji,
  showLabel = true,
  height = 8,
  labelColor,
  trackColor,
  fillColor,
}: XPProgressBarProps) {
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          {rankEmoji && <Text style={styles.emoji}>{rankEmoji}</Text>}
          <Text style={[styles.xpText, labelColor ? { color: labelColor } : undefined]}>
            {current} / {needed} XP
          </Text>
          <Text style={[styles.percentText, labelColor ? { color: labelColor } : undefined]}>
            {Math.round(clampedPercent)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height }, trackColor ? { backgroundColor: trackColor } : undefined]}>
        <View
          style={[
            styles.fill,
            { height, width: `${clampedPercent}%` },
            fillColor ? { backgroundColor: fillColor } : undefined,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  track: {
    backgroundColor: COLORS.border,
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: COLORS.accent,
    borderRadius: 100,
  },
});
