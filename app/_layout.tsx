import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { vexo, identifyDevice } from 'vexo-analytics';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  showSessionNotification,
  dismissSessionNotification,
  scheduleEngagementNotifications,
  scheduleStreakRiskNotification,
  scheduleWeeklyRecapNotification,
} from '@/lib/notifications';
import { useGamificationStore } from '@/stores/gamificationStore';
import { ConfettiProvider } from '@/contexts/ConfettiContext';
import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { COLORS } from '@/utils/constants';

// Initialize Vexo analytics
vexo('a81abd17-cd81-479b-aa13-2954bd4e23fc');

// Keep the native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

// How often to refresh the notification time while the app is in the foreground.
// Using the same identifier replaces the previous notification, so no stacking.
const NOTIFICATION_UPDATE_INTERVAL_MS = 15_000; // 15 seconds

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const isActive = useSessionStore((s) => s.isActive);
  const startTime = useSessionStore((s) => s.startTime);
  const appState = useRef(AppState.currentState);
  const [showSplash, setShowSplash] = useState(true);

  // Auth init — hide native splash once auth is ready, animated splash takes over
  useEffect(() => {
    initialize().then(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [initialize]);

  // Identify user for Vexo analytics
  useEffect(() => {
    if (user?.email) {
      identifyDevice(user.email);
    } else if (user?.id) {
      identifyDevice(user.id);
    }
  }, [user?.id, user?.email]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Schedule notifications (lazy — only loads module when needed)
  // Each function internally checks if already scheduled today, so no duplicate popups.
  useEffect(() => {
    if (showSplash) return; // Wait until splash is done

    const timer = setTimeout(() => {
      scheduleEngagementNotifications();
      scheduleWeeklyRecapNotification();

      // Streak at risk notification
      const streakCount = useGamificationStore.getState().streak.count;
      if (streakCount > 0) {
        scheduleStreakRiskNotification(streakCount);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // ─── Persistent session notification ───
  // Show immediately when session starts, update every 15s while foregrounded,
  // refresh on background transition, and dismiss when session ends.
  useEffect(() => {
    if (Platform.OS === 'web' || showSplash) return;

    if (!isActive || !startTime) {
      dismissSessionNotification();
      return;
    }

    showSessionNotification(startTime);

    const interval = setInterval(() => {
      if (appState.current === 'active') {
        showSessionNotification(startTime);
      }
    }, NOTIFICATION_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive, startTime, showSplash]);

  // Refresh the notification on app state transitions
  useEffect(() => {
    if (Platform.OS === 'web' || showSplash) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appState.current === 'active';
      const goingToBackground = !!nextState.match(/inactive|background/);
      const comingToForeground = nextState === 'active' && !wasActive;
      appState.current = nextState;

      const sessionActive = useSessionStore.getState().isActive;
      const sessionStart = useSessionStore.getState().startTime;

      if (!sessionActive || !sessionStart) return;

      if (goingToBackground && wasActive) {
        showSessionNotification(sessionStart);
      } else if (comingToForeground) {
        showSessionNotification(sessionStart);
      }
    });

    return () => subscription.remove();
  }, [showSplash]);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <AnimatedSplash onFinish={handleSplashFinish} />
      </>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfettiProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: '800', fontSize: 17, color: COLORS.text },
            contentStyle: { backgroundColor: COLORS.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[roomId]"
            options={{ title: 'Chat Room', presentation: 'card' }}
          />
          <Stack.Screen
            name="chat/buddy/[matchId]"
            options={{ title: 'Poop Buddy', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: 'Settings', presentation: 'card' }}
          />
          <Stack.Screen
            name="credits"
            options={{ title: 'Credits Wallet', presentation: 'card' }}
          />
          <Stack.Screen
            name="leagues/index"
            options={{ title: 'Royal Throne Leagues', presentation: 'card' }}
          />
          <Stack.Screen
            name="leagues/[leagueId]"
            options={{ title: 'League', presentation: 'card' }}
          />
          <Stack.Screen
            name="leagues/create"
            options={{ title: 'Create League', presentation: 'card' }}
          />
          <Stack.Screen
            name="leagues/join"
            options={{ title: 'Join League', presentation: 'card' }}
          />
          <Stack.Screen
            name="leagues/global"
            options={{ title: 'Global Rankings', presentation: 'card' }}
          />
          <Stack.Screen
            name="shop/index"
            options={{ title: 'Reward Shop', presentation: 'card' }}
          />
          <Stack.Screen
            name="about"
            options={{ title: 'About Royal Throne', presentation: 'card' }}
          />
          <Stack.Screen
            name="privacy"
            options={{ title: 'Privacy Policy', presentation: 'card' }}
          />
          <Stack.Screen
            name="contact"
            options={{ title: 'Contact Us', presentation: 'card' }}
          />
        </Stack>
      </ConfettiProvider>
    </GestureHandlerRootView>
  );
}
