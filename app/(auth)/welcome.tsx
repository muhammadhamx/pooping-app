import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LOADING_MESSAGES, getRandomItem } from '@/humor/jokes';
import { COLORS } from '@/utils/constants';

export default function WelcomeScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  useEffect(() => {
    if (!loading) return;
    setLoadingMessage(getRandomItem(LOADING_MESSAGES));
    const interval = setInterval(() => {
      setLoadingMessage(getRandomItem(LOADING_MESSAGES));
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGetStarted = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      router.replace('/(tabs)/session');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text
          style={[styles.emoji, { transform: [{ translateY: bounceAnim }] }]}
        >
          💩
        </Animated.Text>
        <Text style={styles.title}>Throne</Text>
        <Text style={styles.subtitle}>
          Every king needs a throne.{'\n'}
          Yours just happens to be porcelain.
        </Text>
      </View>

      <View style={styles.bottom}>
        {error && <Text style={styles.error}>{error}</Text>}
        {loading && (
          <Text style={styles.loadingMessage}>{loadingMessage}</Text>
        )}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Hold on...' : 'Get Started'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.privacy}>
          No email required. Completely anonymous.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 60,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.primaryLight,
    textAlign: 'center',
    lineHeight: 28,
  },
  bottom: {
    alignItems: 'center',
  },
  loadingMessage: {
    color: COLORS.primaryLight,
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  error: {
    color: COLORS.error,
    marginBottom: 12,
    fontSize: 14,
  },
  privacy: {
    color: COLORS.primaryLight,
    fontSize: 13,
    marginTop: 16,
    opacity: 0.8,
  },
});
