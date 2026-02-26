import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useGamificationStore } from '@/stores/gamificationStore';
import { getDailyChallenges, type DailyChallenge } from '@/gamification/challenges';
import { COLORS, SHADOWS } from '@/utils/constants';

export function DailyChallengesCard() {
  const { dailyChallenges, loadDailyChallenges } = useGamificationStore();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [expanded, setExpanded] = useState(false);
  const expandHeight = useSharedValue(0);

  useEffect(() => {
    loadDailyChallenges().then(setChallenges);
  }, [loadDailyChallenges]);

  const completedCount = dailyChallenges?.completed.length ?? 0;
  const totalCount = challenges.length;
  const allDone = totalCount > 0 && completedCount >= totalCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const animatedExpandStyle = useAnimatedStyle(() => ({
    height: withTiming(expandHeight.value, { duration: 250 }),
    overflow: 'hidden' as const,
  }));

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    expandHeight.value = newExpanded ? totalCount * 56 + 12 : 0;
  };

  if (challenges.length === 0) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, allDone && styles.iconCircleDone]}>
            <Text style={styles.headerEmoji}>{allDone ? '🎉' : '🎯'}</Text>
          </View>
          <View>
            <Text style={styles.headerText}>Daily Challenges</Text>
            <Text style={styles.headerSubtext}>
              {allDone ? 'All done! Nice work.' : `${completedCount} of ${totalCount} complete`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Progress ring */}
          <View style={styles.progressRing}>
            <View style={[styles.progressFill, {
              borderColor: allDone ? COLORS.success : COLORS.accent,
              borderWidth: 3,
              borderLeftColor: progress >= 0.25 ? (allDone ? COLORS.success : COLORS.accent) : COLORS.border,
              borderBottomColor: progress >= 0.5 ? (allDone ? COLORS.success : COLORS.accent) : COLORS.border,
              borderRightColor: progress >= 0.75 ? (allDone ? COLORS.success : COLORS.accent) : COLORS.border,
            }]}>
              <Text style={styles.progressText}>{completedCount}/{totalCount}</Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      <Animated.View style={animatedExpandStyle}>
        <View style={styles.challengeList}>
          {challenges.map((challenge, i) => {
            const done = dailyChallenges?.completed.includes(challenge.id) ?? false;
            return (
              <View
                key={challenge.id}
                style={[
                  styles.challengeRow,
                  done && styles.challengeRowDone,
                  i < challenges.length - 1 && styles.challengeRowBorder,
                ]}
              >
                <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                  <Text style={styles.checkText}>{done ? '✓' : ''}</Text>
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, done && styles.challengeTitleDone]}>
                    {challenge.emoji} {challenge.title}
                  </Text>
                  <Text style={styles.challengeDesc}>{challenge.description}</Text>
                </View>
                <View style={[styles.xpBadge, done && styles.xpBadgeDone]}>
                  <Text style={[styles.xpText, done && styles.xpTextDone]}>
                    +{challenge.xpReward}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDone: {
    backgroundColor: COLORS.success + '20',
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressFill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.border,
    borderWidth: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  chevron: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  challengeList: {
    marginTop: 12,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  challengeRowDone: {
    opacity: 0.65,
  },
  challengeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  challengeTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight,
  },
  challengeDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  xpBadgeDone: {
    backgroundColor: COLORS.success + '20',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
  },
  xpTextDone: {
    color: COLORS.success,
  },
});
