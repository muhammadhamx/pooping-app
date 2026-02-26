import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '@/stores/sessionStore';
import { STILL_POOPING_INTERVALS } from '@/utils/constants';
import { STILL_POOPING_MESSAGES } from '@/humor/jokes';
import { COLORS } from '@/utils/constants';

export function StillPoopingPopup() {
  // Subscribe directly — only this component re-renders on tick
  const isActive = useSessionStore((s) => s.isActive);
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [shownIntervals, setShownIntervals] = useState<Set<number>>(new Set());
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const prevActiveRef = useRef(isActive);

  useEffect(() => {
    if (!isActive && prevActiveRef.current) {
      setShownIntervals(new Set());
    }
    prevActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    for (const interval of STILL_POOPING_INTERVALS) {
      if (elapsedSeconds >= interval && !shownIntervals.has(interval)) {
        const msg = STILL_POOPING_MESSAGES[interval];
        if (msg) {
          setMessage(msg);
          setVisible(true);
          setShownIntervals((prev) => new Set([...prev, interval]));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        break;
      }
    }
  }, [isActive, elapsedSeconds]);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.popup,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.emoji}>🤔</Text>
          <Text style={styles.title}>Still pooping?</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Yes, still going!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  popup: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  buttonText: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
