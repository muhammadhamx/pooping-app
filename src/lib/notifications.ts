import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENGAGEMENT_NOTIFICATIONS, getRandomItem } from '@/humor/jokes';

const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';
const ENGAGEMENT_SCHEDULED_KEY = '@engagement_scheduled_date';
const SESSION_NOTIFICATION_ID = 'active-session';

let _module: any = null;
let _initialized = false;

// Only load the module when we actually need it (avoids Expo Go console error on startup)
function getNotifications() {
  if (!_module) {
    _module = require('expo-notifications');
  }
  return _module as typeof import('expo-notifications');
}

async function ensureInitialized() {
  if (_initialized || Platform.OS === 'web') return;
  _initialized = true;

  const Notifications = getNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('session', {
      name: 'Active Session',
      description: 'Shows when a poop session is in progress',
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: undefined,
      enableVibrate: false,
    });
    await Notifications.setNotificationChannelAsync('engagement', {
      name: 'Tips & Fun',
      description: 'Funny tips, health advice, and poop facts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    await ensureInitialized();
    const Notifications = getNotifications();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return val !== 'false';
}

// ============ SESSION NOTIFICATION (persistent timer) ============

const SESSION_MESSAGES = [
  'Still going strong!',
  'The throne awaits your return.',
  'Your royal session continues.',
  'Tap to check your timer.',
  'A true throne sitter.',
  'Taking your sweet time.',
];

/**
 * Show or update the persistent session notification with current elapsed time.
 * Calling this repeatedly with the same identifier replaces the previous notification.
 */
export async function showSessionNotification(startTime: number) {
  if (Platform.OS === 'web') return;

  try {
    await ensureInitialized();
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const Notifications = getNotifications();

    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    await Notifications.scheduleNotificationAsync({
      identifier: SESSION_NOTIFICATION_ID,
      content: {
        title: `🚽 Session Active — ${timeStr}`,
        body: getRandomItem(SESSION_MESSAGES),
        sticky: Platform.OS === 'android',
        autoDismiss: false,
        ...(Platform.OS === 'android' && { channelId: 'session' }),
      },
      trigger: null,
    });
  } catch {
    // Gracefully fail
  }
}

export async function dismissSessionNotification() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = getNotifications();
    await Notifications.dismissNotificationAsync(SESSION_NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(SESSION_NOTIFICATION_ID);
  } catch {
    // Notification may not exist
  }
}

// ============ ENGAGEMENT NOTIFICATIONS ============

export async function scheduleEngagementNotifications() {
  if (Platform.OS === 'web') return;

  try {
    const enabled = await isNotificationsEnabled();
    if (!enabled) return;

    // Only re-schedule once per day to avoid triggering immediate notifications
    const today = new Date().toISOString().slice(0, 10);
    const lastScheduled = await AsyncStorage.getItem(ENGAGEMENT_SCHEDULED_KEY);
    if (lastScheduled === today) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    await cancelEngagementNotifications();

    const Notifications = getNotifications();

    const windows = [
      { minHour: 7, maxHour: 9 },
      { minHour: 12, maxHour: 14 },
      { minHour: 19, maxHour: 21 },
    ];

    const shuffled = [...ENGAGEMENT_NOTIFICATIONS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const hour = w.minHour + Math.floor(Math.random() * (w.maxHour - w.minHour));
      const minute = Math.floor(Math.random() * 60);
      const msg = shuffled[i % shuffled.length];

      await Notifications.scheduleNotificationAsync({
        identifier: `engagement-${i}`,
        content: {
          title: msg.title,
          body: msg.body,
          ...(Platform.OS === 'android' && { channelId: 'engagement' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    await AsyncStorage.setItem(ENGAGEMENT_SCHEDULED_KEY, today);
  } catch {
    // Gracefully fail
  }
}

export async function cancelEngagementNotifications() {
  if (Platform.OS === 'web') return;
  for (let i = 0; i < 3; i++) {
    try {
      const Notifications = getNotifications();
      await Notifications.cancelScheduledNotificationAsync(`engagement-${i}`);
    } catch {
      // Ignore
    }
  }
}

// ============ STREAK AT RISK NOTIFICATION ============

const STREAK_RISK_ID = 'streak-risk';
const STREAK_SCHEDULED_KEY = '@streak_risk_scheduled_date';

const STREAK_RISK_MESSAGES = [
  { title: '🔥 Streak at Risk!', body: "You haven't logged a session today. Don't let your streak die!" },
  { title: '⚠️ Your Streak Needs You!', body: 'One quick session is all it takes to keep your streak alive.' },
  { title: '🚨 Streak Emergency!', body: 'Your streak is about to break! Hit the throne before midnight.' },
  { title: '💀 R.I.P. Streak?', body: "Not on our watch! Log a session now and keep the fire burning." },
];

/**
 * Schedule a streak-at-risk notification for 8 PM today.
 * Should be called daily (e.g., on app open).
 * The notification only fires if the user hasn't dismissed or logged a session.
 */
export async function scheduleStreakRiskNotification(streakCount: number) {
  if (Platform.OS === 'web' || streakCount <= 0) return;

  try {
    // Only re-schedule once per day
    const today = new Date().toISOString().slice(0, 10);
    const lastScheduled = await AsyncStorage.getItem(STREAK_SCHEDULED_KEY);
    if (lastScheduled === today) return;

    await ensureInitialized();
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const Notifications = getNotifications();

    // Cancel any existing streak risk notification
    await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});

    const msg = STREAK_RISK_MESSAGES[Math.floor(Math.random() * STREAK_RISK_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_RISK_ID,
      content: {
        title: msg.title,
        body: `${msg.body} (${streakCount} day streak)`,
        ...(Platform.OS === 'android' && { channelId: 'engagement' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(STREAK_SCHEDULED_KEY, today);
  } catch {
    // Gracefully fail
  }
}

export async function cancelStreakRiskNotification() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = getNotifications();
    await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID);
  } catch {
    // Ignore
  }
}

// ============ WEEKLY RECAP NOTIFICATION ============

const WEEKLY_RECAP_ID = 'weekly-recap';
const WEEKLY_RECAP_SCHEDULED_KEY = '@weekly_recap_scheduled_date';

/**
 * Schedule a weekly recap notification for Sunday at 7 PM.
 */
export async function scheduleWeeklyRecapNotification() {
  if (Platform.OS === 'web') return;

  try {
    // Only re-schedule once per day
    const today = new Date().toISOString().slice(0, 10);
    const lastScheduled = await AsyncStorage.getItem(WEEKLY_RECAP_SCHEDULED_KEY);
    if (lastScheduled === today) return;

    await ensureInitialized();
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const Notifications = getNotifications();

    await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_RECAP_ID,
      content: {
        title: '📊 Your Weekly Throne Report',
        body: "Your throne stats for the week are ready! Open the app to see how you did.",
        ...(Platform.OS === 'android' && { channelId: 'engagement' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 19,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(WEEKLY_RECAP_SCHEDULED_KEY, today);
  } catch {
    // Gracefully fail
  }
}
