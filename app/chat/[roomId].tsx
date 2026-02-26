import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { getChannel, removeChannel } from '@/lib/realtime';
import { getProfile } from '@/lib/database';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/utils/constants';

export default function RoomChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);
  const {
    rooms,
    roomMessages,
    roomErrors,
    loadRoomMessages,
    addRoomMessage,
    sendRoomMessage,
    joinRoom,
    leaveRoom,
  } = useChatStore();

  const flatListRef = useRef<FlatList>(null);
  const room = rooms.find((r) => r.id === roomId);
  const messages = roomMessages[roomId ?? ''] ?? [];
  const [myProfile, setMyProfile] = useState<{ display_name: string; avatar_emoji: string }>({
    display_name: 'Anonymous Pooper',
    avatar_emoji: '💩',
  });
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { name: string; emoji: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const error = roomErrors?.[roomId ?? ''] ?? null;

  useEffect(() => {
    if (user?.id) {
      getProfile(user.id).then((p) => {
        if (p) setMyProfile({ display_name: p.display_name, avatar_emoji: p.avatar_emoji });
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!roomId || !user?.id) return;

    joinRoom(roomId, user.id);
    setIsLoading(true);
    loadRoomMessages(roomId).finally(() => setIsLoading(false));

    const channel = getChannel(`room:${roomId}`);
    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        if (payload.payload) {
          const msg = payload.payload as any;
          if (msg.senderName && msg.sender_id) {
            setSenderProfiles((prev) => ({
              ...prev,
              [msg.sender_id]: { name: msg.senderName, emoji: msg.senderEmoji || '💩' },
            }));
          }
          addRoomMessage(roomId, msg);
        }
      })
      .subscribe();

    return () => {
      if (user?.id) {
        leaveRoom(roomId, user.id);
      }
      removeChannel(`room:${roomId}`);
    };
  }, [roomId, user?.id]);

  const handleRetry = async () => {
    if (!roomId) return;
    setIsLoading(true);
    await loadRoomMessages(roomId);
    setIsLoading(false);
  };

  const handleSend = async (content: string) => {
    if (!user?.id || !roomId) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await sendRoomMessage(user.id, roomId, content);

      const channel = getChannel(`room:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          id: `temp-${Date.now()}`,
          room_id: roomId,
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: room?.name ?? 'Chat Room' }} />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>😿</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const profile = senderProfiles[item.sender_id];
            return (
              <MessageBubble
                content={item.content}
                senderName={
                  item.sender_id === user?.id
                    ? myProfile.display_name
                    : profile?.name ?? 'Anonymous Pooper'
                }
                senderEmoji={
                  item.sender_id === user?.id
                    ? myProfile.avatar_emoji
                    : profile?.emoji ?? '💩'
                }
                isOwn={item.sender_id === user?.id}
                createdAt={item.created_at}
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />
      )}

      <ChatInput onSend={handleSend} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
