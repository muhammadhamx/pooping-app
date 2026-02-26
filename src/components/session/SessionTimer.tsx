import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/stores/sessionStore';
import { formatTimerDisplay } from '@/utils/formatters';
import { COLORS, GRADIENTS, SHADOWS } from '@/utils/constants';

interface Props {
  onStart: () => void;
  onStop: () => void;
}

export function SessionTimer({ onStart, onStop }: Props) {
  // Subscribe directly — only this component re-renders on tick
  const isActive = useSessionStore((s) => s.isActive);
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);

  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [isActive, glowOpacity]);

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.timerArea}>
        <Text style={styles.timerLabel}>
          {isActive ? 'Session in progress' : 'Ready to go?'}
        </Text>
        <Text style={[styles.timerText, isActive && styles.timerTextActive]}>
          {formatTimerDisplay(elapsedSeconds)}
        </Text>
      </View>

      <View style={styles.buttonWrapper}>
        {isActive && (
          <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />
        )}

        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={buttonAnimatedStyle}>
            <LinearGradient
              colors={isActive ? GRADIENTS.buttonDanger : GRADIENTS.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonEmoji}>{isActive ? '🛑' : '🚽'}</Text>
              <Text style={[styles.buttonText, isActive && styles.buttonTextStop]}>
                {isActive ? 'End Session' : 'Start Session'}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {isActive
          ? "Tap to end when you're done"
          : 'Tap when you sit on the throne'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  timerArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '200',
    color: COLORS.textLight,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  timerTextActive: {
    color: COLORS.accent,
    fontWeight: '300',
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    width: 260,
    marginBottom: 8,
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '10',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 40,
    minWidth: 240,
    gap: 12,
    ...SHADOWS.glow,
  },
  buttonEmoji: {
    fontSize: 24,
  },
  buttonText: {
    color: COLORS.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonTextStop: {
    color: '#FFFFFF',
  },
  hint: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
