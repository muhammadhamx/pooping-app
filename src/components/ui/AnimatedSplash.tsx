import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '@/utils/constants';

const { width } = Dimensions.get('window');

// Each step appears like a system boot checklist — funny + builds anticipation
const BOOT_STEPS = [
  { text: 'Checking seat temperature', done: 'Warm.' },
  { text: 'Loading reading material', done: 'Loaded.' },
  { text: 'Verifying toilet paper supply', done: 'Stocked.' },
  { text: 'Calibrating flush power', done: 'Maximum.' },
  { text: 'Preparing the throne room', done: 'Ready.' },
];

const TAGLINES = [
  'Every king needs a throne.',
  'Where legends are made.',
  'Your porcelain palace awaits.',
  'Time well spent. Mostly.',
  'Built different. Seated different.',
];

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const [tagline] = useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
  );
  const [visibleSteps, setVisibleSteps] = useState(0);

  // --- Animation shared values ---
  // Logo icon
  const iconScale = useSharedValue(0.3);
  const iconOpacity = useSharedValue(0);
  const iconRotate = useSharedValue(-20);

  // Title
  const titleOpacity = useSharedValue(0);
  const titleX = useSharedValue(-30);

  // Tagline
  const taglineOpacity = useSharedValue(0);

  // Divider line
  const dividerWidth = useSharedValue(0);

  // Boot steps
  const stepsOpacity = useSharedValue(0);

  // Final glow pulse
  const glowOpacity = useSharedValue(0);

  // Whole container fade out
  const fadeOut = useSharedValue(1);

  const advanceStep = useCallback(() => {
    setVisibleSteps((v) => v + 1);
  }, []);

  useEffect(() => {
    // === Phase 1: Logo entrance (0-600ms) ===
    iconOpacity.value = withTiming(1, { duration: 400 });
    iconScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    iconRotate.value = withSpring(0, { damping: 10, stiffness: 100 });

    // === Phase 2: Title slides in (500ms) ===
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 350 }));
    titleX.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 100 }));

    // === Phase 3: Tagline (800ms) ===
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 350 }));

    // === Phase 4: Divider draws across (1100ms) ===
    dividerWidth.value = withDelay(
      1100,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })
    );

    // === Phase 5: Boot steps appear one by one (1400ms+) ===
    stepsOpacity.value = withDelay(1300, withTiming(1, { duration: 200 }));

    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < BOOT_STEPS.length; i++) {
      stepTimers.push(setTimeout(() => advanceStep(), 1400 + i * 350));
    }

    // === Phase 6: Glow pulse after all steps (after last step) ===
    const glowDelay = 1400 + BOOT_STEPS.length * 350 + 200;
    glowOpacity.value = withDelay(
      glowDelay,
      withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0, { duration: 500 }),
      )
    );

    // === Phase 7: Fade out ===
    const exitDelay = glowDelay + 600;
    fadeOut.value = withDelay(
      exitDelay,
      withTiming(0, { duration: 350 }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      })
    );

    return () => stepTimers.forEach(clearTimeout);
  }, []);

  // --- Animated styles ---
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateX: titleX.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    width: `${dividerWidth.value * 60}%` as any,
  }));

  const stepsContainerStyle = useAnimatedStyle(() => ({
    opacity: stepsOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOut.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Ambient glow flash */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Top section: Logo + Title */}
      <View style={styles.heroSection}>
        {/* Custom throne icon — a golden circle with T initial */}
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconLetter}>T</Text>
          </View>
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle]}>
          Throne
        </Animated.Text>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          {tagline}
        </Animated.Text>
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <Animated.View style={[styles.divider, dividerStyle]} />
      </View>

      {/* Boot-up checklist */}
      <Animated.View style={[styles.stepsSection, stepsContainerStyle]}>
        {BOOT_STEPS.map((step, i) => {
          const isVisible = i < visibleSteps;
          return (
            <View key={i} style={styles.stepRow}>
              <Text style={[styles.stepCheck, isVisible && styles.stepCheckDone]}>
                {isVisible ? '[ok]' : '[  ]'}
              </Text>
              <Text style={[styles.stepText, isVisible && styles.stepTextDone]}>
                {step.text}
              </Text>
              {isVisible && (
                <Text style={styles.stepResult}>{step.done}</Text>
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* Bottom branding */}
      <Animated.Text style={[styles.bottomText, taglineStyle]}>
        v1.0 — sit. track. conquer.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 32,
  },
  glow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.accent,
    opacity: 0,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    // Inner shadow effect
    borderWidth: 3,
    borderColor: '#E8940A',
  },
  iconLetter: {
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -2,
    marginTop: -2,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -3,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 28,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  stepsSection: {
    width: '100%',
    paddingHorizontal: 8,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 22,
  },
  stepCheck: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textLight,
    width: 30,
  },
  stepCheckDone: {
    color: COLORS.accent,
  },
  stepText: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 1,
    fontFamily: 'monospace',
  },
  stepTextDone: {
    color: COLORS.textSecondary,
  },
  stepResult: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  bottomText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: COLORS.textLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
