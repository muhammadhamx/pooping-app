import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDuration } from '@/utils/formatters';
import { getSessionSummaryMessage } from '@/humor/jokes';
import type { SessionReward } from '@/gamification/rewards';
import { COLORS, SHADOWS, GRADIENTS } from '@/utils/constants';

interface Props {
  visible: boolean;
  duration: number;
  reward: SessionReward;
  streak: number;
  onClose: () => void;
}

export function PostSessionSummary({ visible, duration, reward, streak, onClose }: Props) {
  const [summaryMessage] = useState(() => getSessionSummaryMessage(duration));
  const [showLucky, setShowLucky] = useState(false);
  const [showMystery, setShowMystery] = useState(false);

  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setShowLucky(false);
      setShowMystery(false);
      return;
    }

    // Stagger the reveals
    if (reward.luckyPoop) {
      const t1 = setTimeout(() => {
        setShowLucky(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);
      if (reward.mysteryBox) {
        const t2 = setTimeout(() => {
          setShowMystery(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      return () => clearTimeout(t1);
    } else if (reward.mysteryBox) {
      const t = setTimeout(() => {
        setShowMystery(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [visible, reward]);

  useEffect(() => {
    if (visible) {
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 }),
        ),
        -1,
      );
    }
  }, [visible, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <Animated.View entering={FadeInUp.delay(100).springify().damping(14)} style={styles.card}>
          {/* Glow ring behind the card */}
          <Animated.View style={[styles.glowRing, glowStyle]} />

          {/* Top emoji */}
          <Animated.Text entering={ZoomIn.delay(200).springify()} style={styles.bigEmoji}>
            {reward.luckyPoop ? reward.luckyPoop.emoji : '🎉'}
          </Animated.Text>

          {/* Duration */}
          <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={styles.duration}>
            {formatDuration(duration)}
          </Animated.Text>

          {/* Funny message */}
          <Animated.Text entering={FadeInDown.delay(400).duration(400)} style={styles.message}>
            {summaryMessage}
          </Animated.Text>

          {/* XP Earned */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.xpContainer}>
            <LinearGradient
              colors={GRADIENTS.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.xpBadge}
            >
              <Text style={styles.xpText}>+{reward.totalXP} XP</Text>
            </LinearGradient>
            {reward.luckyPoop && (
              <Text style={styles.xpBreakdown}>
                {reward.baseXP} x{reward.luckyPoop.multiplier} multiplier
              </Text>
            )}
          </Animated.View>

          {/* Lucky Poop reveal */}
          {showLucky && reward.luckyPoop && (
            <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>{reward.luckyPoop.emoji}</Text>
              <View>
                <Text style={styles.rewardLabel}>Lucky Poop!</Text>
                <Text style={styles.rewardDetail}>{reward.luckyPoop.label}</Text>
              </View>
            </Animated.View>
          )}

          {/* Mystery Box reveal */}
          {showMystery && reward.mysteryBox && (
            <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>{reward.mysteryBox.emoji}</Text>
              <View>
                <Text style={styles.rewardLabel}>Mystery Box!</Text>
                <Text style={styles.rewardDetail}>{reward.mysteryBox.label}</Text>
              </View>
            </Animated.View>
          )}

          {/* Streak */}
          {streak > 0 && (
            <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{streak} day streak</Text>
            </Animated.View>
          )}

          {/* Close button */}
          <Animated.View entering={FadeInUp.delay(900).duration(400)} style={{ width: '100%' }}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <LinearGradient
                colors={GRADIENTS.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.closeGradient}
              >
                <Text style={styles.closeText}>Noice!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    overflow: 'hidden',
    ...SHADOWS.cardElevated,
  },
  glowRing: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  bigEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  duration: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  xpContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  xpBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    ...SHADOWS.glow,
  },
  xpText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  xpBreakdown: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  rewardEmoji: {
    fontSize: 32,
  },
  rewardLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
  },
  rewardDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  closeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 24,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
});
