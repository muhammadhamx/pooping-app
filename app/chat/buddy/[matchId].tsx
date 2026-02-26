import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { getChannel, removeChannel } from '@/lib/realtime';
import { getProfile } from '@/lib/database';
import { getRandomItem, BUDDY_ICEBREAKERS } from '@/humor/jokes';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/utils/constants';

export default function BuddyChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const user = useAuthStore((s) => s.user);
  const {
    buddyMessages,
    loadBuddyMessages,
    addBuddyMessage,
    sendBuddyMessage,
    endMatch,
  } = useChatStore();

  const flatListRef = useRef<FlatList>(null);
  const [icebreaker] = useState(() => getRandomItem(BUDDY_ICEBREAKERS));
  const [myProfile, setMyProfile] = useState({ display_name: 'You', avatar_emoji: '💩' });
  const [buddyProfile, setBuddyProfile] = useState({ name: 'Poop Buddy', emoji: '💩' });

  useEffect(() => {
    if (user?.id) {
      getProfile(user.id).then((p) => {
        if (p) setMyProfile({ display_name: p.display_name, avatar_emoji: p.avatar_emoji });
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!matchId) return;

    loadBuddyMessages(matchId);

    const channel = getChannel(`buddy:${matchId}`);
    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        if (payload.payload) {
          const msg = payload.payload as any;
          if (msg.senderName && msg.sender_id !== user?.id) {
            setBuddyProfile({ name: msg.senderName, emoji: msg.senderEmoji || '💩' });
          }
          addBuddyMessage(msg);
        }
      })
      .on('broadcast', { event: 'end' }, () => {
        // Clear match state so chat screen doesn't show stale "Active Poop Buddy"
        useChatStore.getState().clearMatch();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Chat ended', 'Your poop buddy left. Until next time!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      })
      .subscribe();

    return () => {
      removeChannel(`buddy:${matchId}`);
    };
  }, [matchId]);

  const handleSend = async (content: string) => {
    if (!user?.id || !matchId) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await sendBuddyMessage(user.id, matchId, content);

      const channel = getChannel(`buddy:${matchId}`);
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          id: `temp-${Date.now()}`,
          match_id: matchId,
          sender_id: user.id,
          content,
          created_at: new Date().toISOString(),
          senderName: myProfile.display_name,
          senderEmoji: myProfile.avatar_emoji,
        },
      });
    } catch {
      // Error already set in store
    }
  };

  const handleEnd = () => {
    Alert.alert('End chat?', 'Your poop buddy will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Chat',
        style: 'destructive',
        onPress: async () => {
          if (!matchId || !user?.id) return;

          // Broadcast end event first and wait for it to send
          const channel = getChannel(`buddy:${matchId}`);
          await channel.send({ type: 'broadcast', event: 'end', payload: {} });

          // Small delay to ensure broadcast reaches the other side
          await new Promise((r) => setTimeout(r, 300));

          await endMatch(matchId, user.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Poop Buddy',
          headerRight: () => (
            <TouchableOpacity onPress={handleEnd}>
              <Text style={styles.endButton}>End</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {buddyMessages.length === 0 && (
        <View style={styles.icebreakerContainer}>
          <Text style={styles.icebreakerEmoji}>💡</Text>
          <Text style={styles.icebreakerText}>
            Icebreaker: "{icebreaker}"
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={buddyMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.content}
            senderName={
              item.sender_id === user?.id ? myProfile.display_name : buddyProfile.name
            }
            senderEmoji={
              item.sender_id === user?.id ? myProfile.avatar_emoji : buddyProfile.emoji
            }
            isOwn={item.sender_id === user?.id}
            createdAt={item.created_at}
          />
        )}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      <ChatInput onSend={handleSend} placeholder="Say something..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  endButton: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  icebreakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  icebreakerEmoji: {
    fontSize: 16,
  },
  icebreakerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
