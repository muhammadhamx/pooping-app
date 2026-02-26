import { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useChatStore } from '@/stores/chatStore';
import { getRandomItem, EMPTY_STATE_MESSAGES, BUDDY_ICEBREAKERS } from '@/humor/jokes';
import { COLORS, SHADOWS } from '@/utils/constants';

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user);
  const isInSession = useSessionStore((s) => s.isActive);
  const {
    rooms,
    currentMatch,
    isSearchingBuddy,
    activePoopersCount,
    error,
    loadRooms,
    startSearching,
    stopSearching,
    checkActiveMatch,
    subscribeToPresence,
    unsubscribeFromPresence,
  } = useChatStore();

  useEffect(() => {
    loadRooms();
    if (user?.id) {
      checkActiveMatch(user.id);
    }
  }, [user?.id, loadRooms, checkActiveMatch]);

  useEffect(() => {
    if (user?.id && isInSession) {
      subscribeToPresence(user.id);
    }
    return () => {
      unsubscribeFromPresence();
    };
  }, [user?.id, isInSession, subscribeToPresence, unsubscribeFromPresence]);

  // Auto-navigate to buddy chat when match is found during active search
  const wasSearching = useRef(false);
  useEffect(() => {
    if (isSearchingBuddy) {
      wasSearching.current = true;
    }
  }, [isSearchingBuddy]);

  useEffect(() => {
    if (currentMatch && wasSearching.current) {
      wasSearching.current = false;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/chat/buddy/${currentMatch.id}`);
    }
  }, [currentMatch]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, [loadRooms]);

  const handleFindBuddy = async () => {
    if (!user?.id) return;
    if (isSearchingBuddy) {
      await stopSearching(user.id);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startSearching(user.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Poopers Count */}
      <View style={styles.activeCount}>
        <Text style={styles.activeCountEmoji}>🚽</Text>
        <Text style={styles.activeCountText}>
          {activePoopersCount} pooper{activePoopersCount !== 1 ? 's' : ''}{' '}
          online now
        </Text>
      </View>

      {/* Buddy Match Section */}
      <View style={styles.buddySection}>
        {currentMatch ? (
          <TouchableOpacity
            style={styles.activeMatchCard}
            onPress={() => router.push(`/chat/buddy/${currentMatch.id}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.matchEmoji}>🤝</Text>
            <View style={styles.matchInfo}>
              <Text style={styles.matchTitle}>Active Poop Buddy</Text>
              <Text style={styles.matchSubtitle}>Tap to continue chatting</Text>
            </View>
            <Text style={styles.matchArrow}>→</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.findBuddyButton,
              !isInSession && styles.findBuddyDisabled,
              isSearchingBuddy && styles.findBuddySearching,
            ]}
            onPress={handleFindBuddy}
            disabled={!isInSession}
            activeOpacity={0.8}
          >
            {isSearchingBuddy ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.findBuddyText}>
                  Searching for a poop buddy...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.findBuddyEmoji}>🔍</Text>
                <Text style={styles.findBuddyText}>Find a Poop Buddy</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {!isInSession && !currentMatch && (
          <Text style={styles.buddyHint}>
            Start a session to find a poop buddy
          </Text>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Group Rooms */}
      <Text style={styles.sectionTitle}>Group Rooms</Text>
      {!isInSession ? (
        <View style={styles.gatedContainer}>
          <Text style={styles.gatedEmoji}>🔒</Text>
          <Text style={styles.gatedText}>
            Start a session to join chat rooms
          </Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {getRandomItem(EMPTY_STATE_MESSAGES.chat)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomCard}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.roomEmoji}>💬</Text>
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.roomDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.roomArrow}>→</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.roomList}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  activeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  activeCountEmoji: {
    fontSize: 16,
  },
  activeCountText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  buddySection: {
    padding: 16,
  },
  findBuddyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    ...SHADOWS.cardElevated,
  },
  findBuddyDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  findBuddySearching: {
    backgroundColor: COLORS.primary,
  },
  findBuddyEmoji: {
    fontSize: 20,
  },
  findBuddyText: {
    color: COLORS.primaryDark,
    fontSize: 17,
    fontWeight: '700',
  },
  buddyHint: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 8,
  },
  activeMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...SHADOWS.cardElevated,
  },
  matchEmoji: {
    fontSize: 28,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  matchSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  matchArrow: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  roomList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  roomEmoji: {
    fontSize: 24,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  roomDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roomArrow: {
    fontSize: 18,
    color: COLORS.textLight,
  },
  gatedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  gatedEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  gatedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: COLORS.error + '15',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  retryText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
