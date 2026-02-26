import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StreakFlame } from '@/components/ui/StreakFlame';
import { getNextMilestone } from '@/gamification/streaks';
import { useStatsStore } from '@/stores/statsStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { COLORS, SHADOWS } from '@/utils/constants';

function isStreakAtRisk(streak: number, lastDate: string, sessions: Array<{ started_at: string }>): boolean {
  if (streak <= 0) return false;
  const today = new Date().toISOString().slice(0, 10);
  // If they already logged today, streak is safe
  const hasSessionToday = sessions.some((s) => s.started_at.slice(0, 10) === today);
  if (hasSessionToday) return false;
  // If it's after 6 PM and no session today, show warning
  const hour = new Date().getHours();
  return hour >= 18;
}

export function StreakCard() {
  const streak = useStatsStore((s) => s.data?.streak ?? 0);
  const freezesRemaining = useGamificationStore((s) => s.streak.freezesRemaining);
  const streakLastDate = useGamificationStore((s) => s.streak.lastDate);
  const sessions = useSessionStore((s) => s.sessions);
  const nextMilestone = getNextMilestone(streak);

  const atRisk = useMemo(
    () => isStreakAtRisk(streak, streakLastDate, sessions),
    [streak, streakLastDate, sessions]
  );

  const hasStreak = streak > 0;

  // Pulse animation for at-risk warning
  const pulse = useSharedValue(1);
  if (atRisk) {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
    );
  }
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.card, atRisk && styles.cardAtRisk]}>
      {/* Accent bar */}
      {hasStreak && (
        <LinearGradient
          colors={atRisk ? ['#FB7185', '#E5475B'] : ['#FF6B35', COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />
      )}

      <View style={[styles.content, hasStreak && styles.contentWithAccent]}>
        <View style={styles.leftSection}>
          <StreakFlame streak={streak} size="large" />
          <View style={styles.streakInfo}>
            <Text style={styles.streakCount}>
              {streak} day{streak !== 1 ? 's' : ''}
            </Text>
            <View style={styles.subtitleRow}>
              {atRisk ? (
                <Animated.Text style={[styles.streakAtRisk, pulseStyle]}>
                  ⚠️ Streak at risk!
                </Animated.Text>
              ) : (
                <Text style={styles.streakLabel}>
                  {streak === 0 ? 'Start your streak today!' : 'Current streak'}
                </Text>
              )}
              {freezesRemaining > 0 && (
                <View style={styles.freezeBadge}>
                  <Text style={styles.freezeText}>🛡️ {freezesRemaining}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {nextMilestone && hasStreak && (
          <View style={styles.milestoneSection}>
            <Text style={styles.milestoneEmoji}>{nextMilestone.emoji}</Text>
            <Text style={styles.milestoneLabel}>{nextMilestone.days}d</Text>
            <View style={styles.milestoneBadge}>
              <Text style={styles.milestoneXP}>+{nextMilestone.xpBonus} XP</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  contentWithAccent: {
    paddingLeft: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  streakLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  freezeBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  freezeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  milestoneSection: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 64,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  milestoneEmoji: {
    fontSize: 18,
  },
  milestoneLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  milestoneBadge: {
    marginTop: 4,
  },
  milestoneXP: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  cardAtRisk: {
    borderColor: COLORS.error + '50',
  },
  streakAtRisk: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
  },
});
