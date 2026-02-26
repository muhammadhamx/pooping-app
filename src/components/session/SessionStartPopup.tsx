import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { getPopupContent, getDismissText } from '@/humor/sessionPopups';
import { COLORS, SHADOWS } from '@/utils/constants';

interface Props {
  isActive: boolean;
}

export function SessionStartPopup({ isActive }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false); // Track if already shown this session
  const [content, setContent] = useState(() => getPopupContent(0));
  const [dismissText, setDismissText] = useState(() => getDismissText());

  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  const router = useRouter();
  const activePoopersCount = useChatStore((s) => s.activePoopersCount);
  const currentMatch = useChatStore((s) => s.currentMatch);
  const user = useAuthStore((s) => s.user);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(300, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setVisible)(false);
    });
  }, [translateY, backdropOpacity]);

  // Show popup 2s after session starts
  useEffect(() => {
    if (isActive && !shown && !currentMatch) {
      const timer = setTimeout(() => {
        setContent(getPopupContent(activePoopersCount));
        setDismissText(getDismissText());
        setVisible(true);
        setShown(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
        backdropOpacity.value = withTiming(1, { duration: 300 });
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Reset when session ends
    if (!isActive) {
      setShown(false);
      setVisible(false);
    }
  }, [isActive, shown, currentMatch, activePoopersCount, translateY, backdropOpacity]);

  const handleFindBuddy = () => {
    dismiss();
    if (user?.id) {
      useChatStore.getState().startSearching(user.id);
    }
    router.push('/(tabs)/chat');
  };

  const handleJoinChat = () => {
    dismiss();
    router.push('/(tabs)/chat');
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.4,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        <Text style={styles.emoji}>{content.emoji}</Text>
        <Text style={styles.message}>{content.message}</Text>

        {activePoopersCount > 1 && (
          <Text style={styles.poopersCount}>
            🚽 {activePoopersCount} poopers online now
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleFindBuddy}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>🤝</Text>
            <Text style={styles.primaryActionText}>Find a Poop Buddy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleJoinChat}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.secondaryActionText}>Join the Chat</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dismissAction}
          onPress={dismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>{dismissText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
    ...SHADOWS.cardElevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  poopersCount: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    ...SHADOWS.card,
  },
  primaryActionText: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  actionEmoji: {
    fontSize: 20,
  },
  dismissAction: {
    marginTop: 16,
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
});
