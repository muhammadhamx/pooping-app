import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { getProfile, updateProfile } from '@/lib/database';
import { linkEmail, deleteAccount } from '@/lib/auth';
import {
  ACHIEVEMENTS,
  checkAchievements,
  type AchievementContext,
} from '@/humor/achievements';
import { ACHIEVEMENT_HUMOR } from '@/humor/jokes';
import type { Profile } from '@/types/database';
import { COLORS } from '@/utils/constants';
import {
  scheduleEngagementNotifications,
  cancelEngagementNotifications,
} from '@/lib/notifications';

const ACHIEVEMENTS_KEY = '@achievements_unlocked';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';

const AVATAR_EMOJIS = ['💩', '🚽', '📰', '🧻', '👑', '🦆', '🐻', '🌟', '🎯', '🔥', '🌈', '🍀'];

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const sessions = useSessionStore((s) => s.sessions);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💩');
  const [isSaving, setIsSaving] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLinkEmail, setShowLinkEmail] = useState(false);
  const [linkEmailValue, setLinkEmailValue] = useState('');
  const [linkPasswordValue, setLinkPasswordValue] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '1.0.0';

  useEffect(() => {
    if (user?.id) {
      getProfile(user.id).then((p) => {
        if (p) {
          setProfile(p);
          setDisplayName(p.display_name);
          setSelectedEmoji(p.avatar_emoji);
        }
      });
    }
    AsyncStorage.getItem(ACHIEVEMENTS_KEY).then((val) => {
      if (val) setUnlockedIds(JSON.parse(val));
    });
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY).then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, [user?.id]);

  // Check for newly unlocked achievements
  const context: AchievementContext = useMemo(
    () => ({ totalBuddyChats: 0, totalRoomJoins: 0 }),
    []
  );
  const newlyUnlocked = useMemo(
    () => checkAchievements(sessions, context, unlockedIds),
    [sessions, context, unlockedIds]
  );

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const newIds = [...unlockedIds, ...newlyUnlocked.map((a) => a.id)];
      setUnlockedIds(newIds);
      AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(newIds));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [newlyUnlocked.length]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: displayName.trim() || 'Anonymous Pooper',
        avatar_emoji: selectedEmoji,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkEmail = async () => {
    if (!linkEmailValue.trim() || !linkPasswordValue.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setIsLinking(true);
    try {
      await linkEmail(linkEmailValue.trim(), linkPasswordValue.trim());
      Alert.alert('Success', 'Email linked! Your data is now recoverable.');
      setShowLinkEmail(false);
      setLinkEmailValue('');
      setLinkPasswordValue('');
    } catch {
      Alert.alert('Error', 'Failed to link email. It may already be in use.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'If you haven\'t linked an email, you may lose your data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Last chance — all sessions, stats, and chat history will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await deleteAccount();
                      await AsyncStorage.clear();
                      router.replace('/(auth)/welcome');
                    } catch {
                      setIsDeleting(false);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, value.toString());
    if (value) {
      await scheduleEngagementNotifications();
    } else {
      await cancelEngagementNotifications();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Profile Section */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Anonymous Pooper"
          placeholderTextColor={COLORS.textLight}
          maxLength={30}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Avatar</Text>
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                selectedEmoji === emoji && styles.emojiButtonSelected,
              ]}
              onPress={() => setSelectedEmoji(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Achievements Section */}
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.card}>
        <View style={styles.achievementGrid}>
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlockedIds.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.achievementItem,
                  isUnlocked && styles.achievementUnlocked,
                ]}
                onPress={() => {
                  const humor = ACHIEVEMENT_HUMOR[a.id];
                  Alert.alert(
                    `${a.emoji} ${a.name}`,
                    `${a.description}${
                      isUnlocked && humor ? `\n\n"${humor}"` : '\n\nKeep going to unlock!'
                    }`
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.achievementEmoji}>
                  {isUnlocked ? a.emoji : '🔒'}
                </Text>
                <Text
                  style={[
                    styles.achievementName,
                    !isUnlocked && styles.achievementLocked,
                  ]}
                  numberOfLines={1}
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.achievementCount}>
          {unlockedIds.length}/{ACHIEVEMENTS.length} unlocked
        </Text>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Prediction Alerts</Text>
            <Text style={styles.settingDescription}>
              Get notified before your predicted session time
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textLight}
          />
        </View>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.accountInfo}>
          {user?.email
            ? `Signed in as ${user.email}`
            : 'Anonymous account (no email linked)'}
        </Text>

        {!user?.email && !showLinkEmail && (
          <>
            <Text style={styles.linkHint}>
              Link an email to access your data from other devices and prevent data loss.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowLinkEmail(true)}
            >
              <Text style={styles.linkButtonText}>Link Email</Text>
            </TouchableOpacity>
          </>
        )}

        {showLinkEmail && (
          <View style={styles.linkForm}>
            <TextInput
              style={styles.input}
              value={linkEmailValue}
              onChangeText={setLinkEmailValue}
              placeholder="Email address"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={linkPasswordValue}
              onChangeText={setLinkPasswordValue}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
            />
            <View style={styles.linkActions}>
              <TouchableOpacity
                style={styles.linkCancelButton}
                onPress={() => setShowLinkEmail(false)}
              >
                <Text style={styles.linkCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1 }, isLinking && styles.disabled]}
                onPress={handleLinkEmail}
                disabled={isLinking}
              >
                <Text style={styles.saveButtonText}>
                  {isLinking ? 'Linking...' : 'Link Email'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, { marginTop: 8, borderColor: COLORS.error }, isDeleting && styles.disabled]}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
        >
          <Text style={styles.dangerButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>
          Throne v{appVersion}{'\n'}
          Built with love (and fiber).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  emojiText: {
    fontSize: 24,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  accountInfo: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  linkHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
  },
  achievementUnlocked: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  achievementEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  achievementLocked: {
    color: COLORS.textLight,
  },
  achievementCount: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  linkForm: {
    marginBottom: 12,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
