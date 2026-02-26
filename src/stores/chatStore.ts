import { create } from 'zustand';
import type { ChatRoom, Message, BuddyMatch } from '@/types/database';
import {
  getChatRooms,
  getMessages,
  sendMessage,
  joinChatRoom,
  leaveChatRoom,
  createBuddyMatch,
  endBuddyMatch,
  getActiveMatch,
} from '@/lib/database';
import { updateProfile } from '@/lib/database';
import { getChannel, removeChannel } from '@/lib/realtime';
import { useGamificationStore } from '@/stores/gamificationStore';
import { XP_REWARDS } from '@/gamification/xp';

interface ChatState {
  rooms: ChatRoom[];
  roomMessages: Record<string, Message[]>;
  buddyMessages: Message[];
  currentMatch: BuddyMatch | null;
  isSearchingBuddy: boolean;
  activePoopersCount: number;
  isLoading: boolean;

  // Actions
  loadRooms: () => Promise<void>;
  loadRoomMessages: (roomId: string) => Promise<void>;
  addRoomMessage: (roomId: string, message: Message) => void;
  sendRoomMessage: (
    userId: string,
    roomId: string,
    content: string
  ) => Promise<void>;
  joinRoom: (roomId: string, userId: string) => Promise<void>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;

  // Buddy
  startSearching: (userId: string) => Promise<void>;
  stopSearching: (userId: string) => Promise<void>;
  setMatch: (match: BuddyMatch) => void;
  clearMatch: () => void;
  loadBuddyMessages: (matchId: string) => Promise<void>;
  addBuddyMessage: (message: Message) => void;
  sendBuddyMessage: (
    userId: string,
    matchId: string,
    content: string
  ) => Promise<void>;
  endMatch: (matchId: string, userId: string) => Promise<void>;
  checkActiveMatch: (userId: string) => Promise<void>;

  setActivePoopersCount: (count: number) => void;
  subscribeToPresence: (userId: string) => void;
  unsubscribeFromPresence: () => void;
  error: string | null;
  roomErrors: Record<string, string | null>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  roomMessages: {},
  buddyMessages: [],
  currentMatch: null,
  isSearchingBuddy: false,
  activePoopersCount: 0,
  isLoading: false,
  error: null,
  roomErrors: {},

  loadRooms: async () => {
    try {
      set({ error: null });
      const rooms = await getChatRooms();
      set({ rooms });
    } catch {
      set({ error: 'Failed to load chat rooms' });
    }
  },

  loadRoomMessages: async (roomId: string) => {
    try {
      set((state) => ({
        roomErrors: { ...state.roomErrors, [roomId]: null },
      }));
      const messages = await getMessages({ roomId });
      set((state) => ({
        roomMessages: { ...state.roomMessages, [roomId]: messages },
      }));
    } catch {
      set((state) => ({
        roomErrors: { ...state.roomErrors, [roomId]: 'Failed to load messages' },
      }));
    }
  },

  addRoomMessage: (roomId: string, message: Message) => {
    set((state) => {
      const existing = state.roomMessages[roomId] ?? [];
      // Avoid duplicates
      if (existing.find((m) => m.id === message.id)) return state;
      return {
        roomMessages: {
          ...state.roomMessages,
          [roomId]: [...existing, message],
        },
      };
    });
  },

  sendRoomMessage: async (userId, roomId, content) => {
    try {
      const message = await sendMessage(userId, content, { roomId });
      get().addRoomMessage(roomId, message);
    } catch (err) {
      set({ error: 'Failed to send message' });
      throw err;
    }
  },

  joinRoom: async (roomId, userId) => {
    await joinChatRoom(roomId, userId);

    // Award XP for joining a room
    const gamification = useGamificationStore.getState();
    gamification.addXP(XP_REWARDS.room_join);
    gamification.trackActivity('roomJoinDone');
  },

  leaveRoom: async (roomId, userId) => {
    await leaveChatRoom(roomId, userId);
  },

  // Buddy
  startSearching: async (userId) => {
    await updateProfile(userId, { looking_for_buddy: true });
    set({ isSearchingBuddy: true });

    const channel = getChannel('buddy-matchmaking');

    // Listen for match broadcasts from the user who created the match
    channel.on('broadcast', { event: 'buddy-matched' }, async (payload) => {
      const match = payload.payload?.match as BuddyMatch;
      if (match && (match.user_a === userId || match.user_b === userId)) {
        set({ currentMatch: match, isSearchingBuddy: false });
        await updateProfile(userId, { looking_for_buddy: false });
        removeChannel('buddy-matchmaking');
      }
    });

    // When a new user joins, the already-present user tries to create the match
    channel.on('presence', { event: 'join' }, async ({ newPresences }) => {
      const { isSearchingBuddy: searching, currentMatch: existing } = get();
      if (!searching || existing) return;

      for (const presence of newPresences) {
        const otherUserId = (presence as any).user_id as string;
        if (otherUserId === userId) continue;

        try {
          const match = await createBuddyMatch(userId, otherUserId);
          if (match) {
            set({ currentMatch: match, isSearchingBuddy: false });
            await updateProfile(userId, { looking_for_buddy: false });
            // Notify the other user about the match
            await channel.send({
              type: 'broadcast',
              event: 'buddy-matched',
              payload: { match },
            });
            removeChannel('buddy-matchmaking');
          }
        } catch (err) {
          set({ error: 'Failed to create buddy match' });
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;

      // Track our presence in the channel
      await channel.track({ user_id: userId, searching_at: new Date().toISOString() });

      // Check if someone is already searching
      const state = channel.presenceState();
      const otherUserIds = Object.values(state)
        .flat()
        .filter((p: any) => p.user_id !== userId)
        .map((p: any) => p.user_id as string);

      if (otherUserIds.length > 0) {
        const { isSearchingBuddy: searching, currentMatch: existing } = get();
        if (!searching || existing) return;

        try {
          const match = await createBuddyMatch(userId, otherUserIds[0]);
          if (match) {
            set({ currentMatch: match, isSearchingBuddy: false });
            await updateProfile(userId, { looking_for_buddy: false });
            await channel.send({
              type: 'broadcast',
              event: 'buddy-matched',
              payload: { match },
            });
            removeChannel('buddy-matchmaking');
          }
        } catch (err) {
          set({ error: 'Failed to create buddy match' });
        }
      }
    });
  },

  stopSearching: async (userId) => {
    await updateProfile(userId, { looking_for_buddy: false });
    set({ isSearchingBuddy: false });
    removeChannel('buddy-matchmaking');
  },

  setMatch: (match) => {
    set({ currentMatch: match, isSearchingBuddy: false });
  },

  clearMatch: () => {
    set({ currentMatch: null, buddyMessages: [] });
  },

  loadBuddyMessages: async (matchId) => {
    try {
      const messages = await getMessages({ matchId });
      set({ buddyMessages: messages });
    } catch {
      // Silently fail
    }
  },

  addBuddyMessage: (message) => {
    set((state) => {
      if (state.buddyMessages.find((m) => m.id === message.id)) return state;
      return { buddyMessages: [...state.buddyMessages, message] };
    });
  },

  sendBuddyMessage: async (userId, matchId, content) => {
    try {
      const message = await sendMessage(userId, content, { matchId });
      get().addBuddyMessage(message);

      // Award XP for first buddy message per match
      const messageCount = get().buddyMessages.filter((m) => m.sender_id === userId).length;
      if (messageCount === 0) {
        const gamification = useGamificationStore.getState();
        gamification.addXP(XP_REWARDS.buddy_chat);
        gamification.trackActivity('buddyChatDone');
      }
    } catch (err) {
      set({ error: 'Failed to send message' });
      throw err;
    }
  },

  endMatch: async (matchId, userId) => {
    await endBuddyMatch(matchId);
    await updateProfile(userId, { looking_for_buddy: false });
    set({ currentMatch: null, buddyMessages: [] });
  },

  checkActiveMatch: async (userId) => {
    try {
      const match = await getActiveMatch(userId);
      if (match) {
        set({ currentMatch: match });
      }
    } catch {
      // Silent fail — buddy check is non-critical
    }
  },

  setActivePoopersCount: (count) => set({ activePoopersCount: count }),

  subscribeToPresence: (userId) => {
    const channel = getChannel('active-poopers');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        set({ activePoopersCount: count });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });
  },

  unsubscribeFromPresence: () => {
    removeChannel('active-poopers');
  },
}));
