import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LOADING_MESSAGES, getRandomItem } from '@/humor/jokes';
import { COLORS, SHADOWS } from '@/utils/constants';

export default function WelcomeScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const bounceY = useSharedValue(0);

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
  }, [bounceY]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

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

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password.trim());

      // Restore gamification data from Supabase
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await useGamificationStore.getState().restoreFromRemote(userId);
      }

      router.replace('/(tabs)/session');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in.');
      } else if (msg.includes('rate') || msg.includes('limit')) {
        setError('Too many attempts. Please wait a moment.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Animated.Text
          entering={FadeInDown.duration(600).springify()}
          style={[styles.emoji, bounceStyle]}
        >
          💩
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(200).duration(500)} style={styles.title}>
          Throne
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(400).duration(500)} style={styles.subtitle}>
          Every king needs a throne.{'\n'}
          Yours just happens to be porcelain.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.bottom}>
        {error && <Text style={styles.error}>{error}</Text>}
        {loading && (
          <Text style={styles.loadingMessage}>{loadingMessage}</Text>
        )}

        {showSignIn ? (
          <View style={styles.signInForm}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { marginTop: 14 }]}
              onPress={handleEmailSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFB020', '#E8940A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchLink}
              onPress={() => { setShowSignIn(false); setError(null); }}
              disabled={loading}
            >
              <Text style={styles.switchLinkText}>New here? Get started anonymously</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleGetStarted}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFB020', '#E8940A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Hold on...' : 'Get Started'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.privacy}>
              No email required. Completely anonymous.
            </Text>
            <TouchableOpacity
              style={styles.switchLink}
              onPress={() => { setShowSignIn(true); setError(null); }}
              disabled={loading}
            >
              <Text style={styles.switchLinkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.accent,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  bottom: {
    alignItems: 'center',
  },
  loadingMessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    borderRadius: 30,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.primaryDark,
    fontSize: 20,
    fontWeight: '800',
  },
  error: {
    color: COLORS.error,
    marginBottom: 12,
    fontSize: 14,
  },
  privacy: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 16,
  },
  signInForm: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  passwordInput: {
    flex: 1,
    marginTop: 0,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  switchLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchLinkText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
