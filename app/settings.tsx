import { useState, useEffect } from 'react';
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
import { useGamificationStore } from '@/stores/gamificationStore';
import { getProfile, updateProfile, syncGamificationUp, type GamificationSyncData } from '@/lib/database';
import { linkEmail, deleteAccount } from '@/lib/auth';
import { useAchievements } from '@/hooks/useAchievements';
import { useConfetti } from '@/contexts/ConfettiContext';
import { XPProgressBar } from '@/components/ui/XPProgressBar';
import {
  THRONE_TITLES,
  LOCKED_AVATARS,
  isAvatarUnlocked,
  getUnlockedTitles,
  getSelectedTitle,
  setSelectedTitle as persistSelectedTitle,
  type TitleCheckContext,
} from '@/gamification/cosmetics';
import { useSessionStore } from '@/stores/sessionStore';
import type { Profile } from '@/types/database';
import { COLORS, SHADOWS } from '@/utils/constants';
import {
  scheduleEngagementNotifications,
  cancelEngagementNotifications,
} from '@/lib/notifications';

const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';

const BASE_AVATAR_EMOJIS = ['💩', '🚽', '📰', '🧻', '👑', '🦆', '🐻', '🌟', '🎯', '🔥', '🌈', '🍀'];
const LOCKED_AVATAR_EMOJIS = LOCKED_AVATARS.map((a) => a.emoji);

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { rank, xp, xpProgress, initialize: initGamification, isLoaded: gamificationLoaded } = useGamificationStore();
  const { achievements, unlockedIds, newlyUnlockedQueue, dismissNewlyUnlocked, unlockedCount, totalCount } = useAchievements();
  const { fire: fireConfetti } = useConfetti();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💩');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLinkEmail, setShowLinkEmail] = useState(false);
  const [linkEmailValue, setLinkEmailValue] = useState('');
  const [linkPasswordValue, setLinkPasswordValue] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTitleId, setSelectedTitleId] = useState('the_newbie');
  const sessions = useSessionStore((s) => s.sessions);

  // Check if user is truly anonymous — no email, no email identity, or explicitly anonymous
  const hasEmailIdentity = user?.identities?.some((i) => i.provider === 'email') ?? false;
  const pendingEmail = (user as any)?.new_email || (user as any)?.email_change || user?.user_metadata?.email;
  const hasEmail = !!user?.email || !!pendingEmail;
  const isAnonymous = !hasEmail && !hasEmailIdentity && user?.is_anonymous !== false;
  const linkedEmail = user?.email
    || pendingEmail
    || user?.identities?.find((i) => i.provider === 'email')?.identity_data?.email as string | undefined
    || null;

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '1.0.0';

  // Build title check context
  const titleContext: TitleCheckContext = {
    totalSessions: sessions.length,
    currentStreak: useGamificationStore.getState().streak.count,
    totalXP: xp,
    hasSpeedrun: sessions.some((s) => s.duration_seconds != null && s.duration_seconds < 60),
    hasMarathon: sessions.some((s) => s.duration_seconds != null && s.duration_seconds > 1800),
    hasNightOwl: sessions.some((s) => {
      const h = new Date(s.started_at).getHours();
      return h >= 0 && h < 4;
    }),
    hasEarlyBird: sessions.some((s) => new Date(s.started_at).getHours() < 6),
    hasBuddyChat: false, // Could be tracked more precisely
    rankId: rank.id,
  };

  const unlockedTitles = getUnlockedTitles(titleContext);
  const allAvatarEmojis = [...BASE_AVATAR_EMOJIS, ...LOCKED_AVATAR_EMOJIS];

  useEffect(() => {
    if (!gamificationLoaded) initGamification();
  }, [gamificationLoaded, initGamification]);

  // Load selected title
  useEffect(() => {
    getSelectedTitle().then(setSelectedTitleId);
  }, []);

  // Fire confetti on new achievement unlock
  useEffect(() => {
    if (newlyUnlockedQueue.length > 0) {
      fireConfetti();
      const a = newlyUnlockedQueue[0];
      Alert.alert(
        `${a.emoji} Achievement Unlocked!`,
        `${a.name}\n\n"${a.flavor}"`,
        [{ text: 'Nice!', onPress: dismissNewlyUnlocked }]
      );
    }
  }, [newlyUnlockedQueue.length]);

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
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY).then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, [user?.id]);

  /** Build full sync payload from current local state */
  const buildSyncData = async (): Promise<GamificationSyncData> => {
    const { xp: currentXP, streak } = useGamificationStore.getState();
    const [titleStr, titlesStr, achievementsStr, sessionCountStr] = await Promise.all([
      AsyncStorage.getItem('@throne_selected_title'),
      AsyncStorage.getItem('@throne_unlocked_titles'),
      AsyncStorage.getItem('@achievements_unlocked'),
      AsyncStorage.getItem('@throne_session_count'),
    ]);
    return {
      xp: currentXP,
      streakCount: streak.count,
      streakLastDate: streak.lastDate,
      streakFreezes: streak.freezesRemaining,
      selectedTitleId: titleStr ?? 'the_newbie',
      unlockedTitleIds: titlesStr ? JSON.parse(titlesStr) : ['the_newbie'],
      unlockedAchievementIds: achievementsStr ? JSON.parse(achievementsStr) : [],
      rewardSessionCount: sessionCountStr ? parseInt(sessionCountStr, 10) : 0,
    };
  };

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
      const emailToLink = linkEmailValue.trim();
      const updatedUser = await linkEmail(emailToLink, linkPasswordValue.trim());

      // Update auth store directly with the returned user (has email set immediately)
      // Don't rely on refreshUser/getUser — it may return stale pre-confirmation data
      if (updatedUser) {
        useAuthStore.setState({ user: updatedUser });
      }

      // Push ALL local data to Supabase so it's fully recoverable
      const userId = updatedUser?.id ?? user?.id;
      if (userId) {
        const syncData = await buildSyncData();
        await syncGamificationUp(userId, syncData).catch(() => {});
      }

      Alert.alert(
        'Email Linked!',
        `Your email ${emailToLink} has been linked successfully. You can now sign in on any device to recover your data.`
      );
      setShowLinkEmail(false);
      setLinkEmailValue('');
      setLinkPasswordValue('');
    } catch (err: any) {
      Alert.alert('Link Failed', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      isAnonymous
        ? 'You haven\'t linked an email — you will lose all your data. Are you sure?'
        : 'You can sign back in with your email to restore your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Clear all local data so the next user starts fresh
            await useGamificationStore.getState().reset();
            useSessionStore.getState().clearLocal();
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
          {allAvatarEmojis.map((emoji) => {
            const unlocked = isAvatarUnlocked(emoji, rank.id);
            const lockedInfo = LOCKED_AVATARS.find((a) => a.emoji === emoji);
            return (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                  !unlocked && styles.emojiButtonLocked,
                ]}
                onPress={() => {
                  if (unlocked) {
                    setSelectedEmoji(emoji);
                  } else if (lockedInfo) {
                    Alert.alert(
                      '🔒 Locked',
                      `Reach ${lockedInfo.rankName} to unlock this avatar.`
                    );
                  }
                }}
              >
                <Text style={[styles.emojiText, !unlocked && { opacity: 0.35 }]}>
                  {unlocked ? emoji : '🔒'}
                </Text>
              </TouchableOpacity>
            );
          })}
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

      {/* Throne Rank Section */}
      <Text style={styles.sectionTitle}>Throne Rank</Text>
      <View style={styles.card}>
        <View style={styles.rankHeader}>
          <Text style={styles.rankEmoji}>{rank.emoji}</Text>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{rank.name}</Text>
            <Text style={styles.rankDescription}>{rank.description}</Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <XPProgressBar
            current={xpProgress.current}
            needed={xpProgress.needed}
            percentage={xpProgress.percentage}
            showLabel={true}
          />
        </View>
        <Text style={styles.totalXP}>{xp} total XP</Text>
      </View>

      {/* Throne Titles Section */}
      <Text style={styles.sectionTitle}>Throne Titles</Text>
      <View style={styles.card}>
        <Text style={styles.titleHint}>
          Tap a title to equip it. Unlock more by playing!
        </Text>
        <View style={styles.titleGrid}>
          {THRONE_TITLES.map((title) => {
            const isUnlocked = unlockedTitles.some((t) => t.id === title.id);
            const isSelected = selectedTitleId === title.id;
            return (
              <TouchableOpacity
                key={title.id}
                style={[
                  styles.titleItem,
                  isSelected && styles.titleItemSelected,
                  !isUnlocked && styles.titleItemLocked,
                ]}
                onPress={async () => {
                  if (isUnlocked) {
                    setSelectedTitleId(title.id);
                    await persistSelectedTitle(title.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Sync title selection to Supabase
                    if (user?.id) {
                      const syncData = await buildSyncData();
                      syncGamificationUp(user.id, syncData).catch(() => {});
                    }
                  } else {
                    Alert.alert(
                      `🔒 ${title.name}`,
                      `${title.unlockCondition}\n\n"${title.description}"`
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.titleEmoji}>
                  {isUnlocked ? title.emoji : '🔒'}
                </Text>
                <Text
                  style={[
                    styles.titleName,
                    isSelected && styles.titleNameSelected,
                    !isUnlocked && styles.titleNameLocked,
                  ]}
                  numberOfLines={1}
                >
                  {title.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Achievements Section */}
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.card}>
        <View style={styles.achievementGrid}>
          {achievements.map((a) => {
            const isUnlocked = unlockedIds.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.achievementItem,
                  isUnlocked && styles.achievementUnlocked,
                ]}
                onPress={() => {
                  Alert.alert(
                    `${a.emoji} ${a.name}`,
                    `${a.description}${
                      isUnlocked
                        ? `\n\n"${a.flavor}"`
                        : '\n\nKeep going to unlock!'
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
          {unlockedCount}/{totalCount} unlocked
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
      {isAnonymous ? (
        <View style={styles.card}>
          <Text style={styles.accountInfo}>
            Anonymous account (no email linked)
          </Text>

          {!showLinkEmail ? (
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
          ) : (
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
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={linkPasswordValue}
                  onChangeText={setLinkPasswordValue}
                  placeholder="Password (min 6 chars)"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPassword}
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
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.emailLinkedRow}>
            <Text style={styles.emailLinkedIcon}>✅</Text>
            <View style={styles.emailLinkedInfo}>
              <Text style={styles.emailLinkedLabel}>Email Linked</Text>
              <Text style={styles.emailLinkedValue}>{linkedEmail ?? 'Confirmed'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.disabled]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankEmoji: {
    fontSize: 40,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  rankDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  totalXP: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
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
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  emojiText: {
    fontSize: 24,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.primaryDark,
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
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  linkButtonText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  linkForm: {
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  emailLinkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emailLinkedIcon: {
    fontSize: 24,
  },
  emailLinkedInfo: {
    flex: 1,
  },
  emailLinkedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  emailLinkedValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signOutButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
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
  emojiButtonLocked: {
    opacity: 0.6,
    borderColor: COLORS.border,
  },
  titleHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  titleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  titleItemSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  titleItemLocked: {
    opacity: 0.5,
  },
  titleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  titleName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  titleNameSelected: {
    color: COLORS.accent,
  },
  titleNameLocked: {
    color: COLORS.textLight,
  },
});
