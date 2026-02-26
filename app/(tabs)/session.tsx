import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSession } from '@/hooks/useSession';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useConfetti } from '@/contexts/ConfettiContext';
import { SessionTimer } from '@/components/session/SessionTimer';
import { QuickLogForm } from '@/components/session/QuickLogForm';
import { SessionCard } from '@/components/session/SessionCard';
import { StillPoopingPopup } from '@/components/session/StillPoopingPopup';
import { SessionStartPopup } from '@/components/session/SessionStartPopup';
import { PostSessionSummary } from '@/components/session/PostSessionSummary';
import { GreetingBanner } from '@/components/home/GreetingBanner';
import { StreakCard } from '@/components/home/StreakCard';
import { DailyChallengesCard } from '@/components/home/DailyChallengesCard';
import { WeeklyComparison } from '@/components/home/WeeklyComparison';
import { LeaderboardCard } from '@/components/home/LeaderboardCard';
import { WeeklyRecapCard } from '@/components/home/WeeklyRecapCard';
import { getRandomItem, EMPTY_STATE_MESSAGES } from '@/humor/jokes';
import { COLORS, SHADOWS } from '@/utils/constants';
import type { Session } from '@/types/database';
import type { SessionReward } from '@/gamification/rewards';

// ─── Stable header components (defined OUTSIDE the screen) ───

const StaticCards = memo(function StaticCards() {
  return (
    <>
      <GreetingBanner />
      <WeeklyRecapCard />
      <StreakCard />
      <DailyChallengesCard />
    </>
  );
});

// Header component defined outside SessionScreen so its identity is stable.
// It receives only the props it needs — no elapsedSeconds, so it won't
// re-render on every timer tick.
const ListHeader = memo(function ListHeader({
  isActive,
  onStart,
  onStop,
  showQuickLog,
  onToggleQuickLog,
  onQuickLog,
  sessionCount,
}: {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  showQuickLog: boolean;
  onToggleQuickLog: () => void;
  onQuickLog: (startedAt: string, durationSeconds: number, notes?: string) => Promise<void>;
  sessionCount: number;
}) {
  return (
    <View>
      <StaticCards />

      {/* SessionTimer reads elapsedSeconds from store internally —
          only it re-renders per second, not this whole header */}
      <SessionTimer onStart={onStart} onStop={onStop} />

      <LeaderboardCard />

      <WeeklyComparison />

      {/* Quick Log */}
      {!isActive && (
        <TouchableOpacity
          style={styles.quickLogToggle}
          onPress={onToggleQuickLog}
        >
          <View style={styles.quickLogPill}>
            <Text style={styles.quickLogIcon}>📝</Text>
            <Text style={styles.quickLogToggleText}>
              {showQuickLog ? 'Hide Quick Log' : 'Quick Log a Past Session'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {showQuickLog && !isActive && <QuickLogForm onSubmit={onQuickLog} />}

      {/* History Header */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>History</Text>
        <View style={styles.historyBadge}>
          <Text style={styles.historyCount}>{sessionCount}</Text>
        </View>
      </View>
    </View>
  );
});

// ─── Main Screen ───

const RECENT_SESSIONS_LIMIT = 3;

export default function SessionScreen() {
  const {
    isActive,
    sessions,
    startSession,
    stopSession,
    quickLog,
    updateMeta,
    refreshSessions,
  } = useSession();

  const user = useAuthStore((s) => s.user);
  const { initialize: initGamification, isLoaded: gamificationLoaded, rank, streak } = useGamificationStore();
  const { fire: fireConfetti } = useConfetti();
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track rank changes — only show popup for real rank ups, not initial load
  const prevRankId = useRef<string | null>(null);

  // Post-session summary state
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    reward: SessionReward;
  } | null>(null);

  useEffect(() => {
    if (!gamificationLoaded) {
      initGamification();
    }
  }, [gamificationLoaded, initGamification]);

  useEffect(() => {
    if (!gamificationLoaded) return;

    // First load — just record the current rank, don't show popup
    if (prevRankId.current === null) {
      prevRankId.current = rank.id;
      return;
    }

    // Only show popup when rank actually changes after initial load
    if (rank.id !== prevRankId.current) {
      prevRankId.current = rank.id;
      fireConfetti();
      Alert.alert(
        `${rank.emoji} Rank Up!`,
        `You've ascended to ${rank.name}!\n\n"${rank.description}"`
      );
    }
  }, [rank.id, gamificationLoaded]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await refreshSessions(user.id);
    setRefreshing(false);
  }, [user?.id, refreshSessions]);

  const handleStop = useCallback(async () => {
    try {
      const result = await stopSession();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result?.session?.duration_seconds) {
        // Show the post-session summary modal with rewards
        setSummaryData({
          duration: result.session.duration_seconds,
          reward: result.reward,
        });
        setSummaryVisible(true);

        // Fire confetti for lucky poop or mystery box
        if (result.reward.luckyPoop || result.reward.mysteryBox) {
          fireConfetti();
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to end session.');
    }
  }, [stopSession, fireConfetti]);

  const handleRate = useCallback(async (session: Session, rating: number) => {
    await updateMeta(session.id, { rating });
  }, [updateMeta]);

  const handleDismissSummary = useCallback(() => setSummaryVisible(false), []);
  const handleToggleQuickLog = useCallback(() => setShowQuickLog((v) => !v), []);
  const handleToggleAllSessions = useCallback(() => setShowAllSessions((v) => !v), []);

  const displaySessions = showAllSessions
    ? sessions
    : sessions.slice(0, RECENT_SESSIONS_LIMIT);

  const hasMoreSessions = sessions.length > RECENT_SESSIONS_LIMIT;

  const renderItem = useCallback(({ item }: { item: Session }) => (
    <SessionCard
      session={item}
      onRate={!item.rating ? (rating: number) => handleRate(item, rating) : undefined}
    />
  ), [handleRate]);

  const keyExtractor = useCallback((item: Session) => item.id, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🧻</Text>
      <Text style={styles.emptyText}>
        {getRandomItem(EMPTY_STATE_MESSAGES.sessions)}
      </Text>
    </View>
  ), []);

  // Stable header element — only re-renders when its props change,
  // NOT on every timer tick
  const headerElement = (
    <ListHeader
      isActive={isActive}
      onStart={startSession}
      onStop={handleStop}
      showQuickLog={showQuickLog}
      onToggleQuickLog={handleToggleQuickLog}
      onQuickLog={quickLog}
      sessionCount={sessions.length}
    />
  );

  return (
    <View style={styles.container}>
      <StillPoopingPopup />
      <SessionStartPopup isActive={isActive} />

      {/* Post-session summary modal with rewards */}
      {summaryData && (
        <PostSessionSummary
          visible={summaryVisible}
          duration={summaryData.duration}
          reward={summaryData.reward}
          streak={streak.count}
          onClose={handleDismissSummary}
        />
      )}

      <FlatList
        data={displaySessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          hasMoreSessions ? (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleToggleAllSessions}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                {showAllSessions
                  ? 'Show less'
                  : `View all ${sessions.length} sessions 📜`}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    paddingBottom: 32,
  },
  quickLogToggle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickLogIcon: {
    fontSize: 14,
  },
  quickLogToggleText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 10,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  historyBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  viewAllButton: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
