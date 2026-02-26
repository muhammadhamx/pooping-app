// TypeScript types matching the Supabase database schema

export interface Profile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  is_in_session: boolean;
  session_started_at: string | null;
  looking_for_buddy: boolean;
  xp: number;
  streak_count: number;
  streak_last_date: string;
  streak_freezes: number;
  selected_title_id: string;
  unlocked_title_ids: string[];
  unlocked_achievement_ids: string[];
  reward_session_count: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_quick_log: boolean;
  notes: string | null;
  rating: number | null;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  max_participants: number;
  created_at: string;
}

export interface ChatRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface BuddyMatch {
  id: string;
  user_a: string;
  user_b: string;
  status: 'active' | 'ended';
  created_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  room_id: string | null;
  match_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
}

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at'>;
        Update: Partial<Omit<Session, 'id' | 'user_id' | 'created_at'>>;
      };
      chat_rooms: {
        Row: ChatRoom;
        Insert: Omit<ChatRoom, 'id' | 'created_at'>;
        Update: Partial<Omit<ChatRoom, 'id' | 'created_at'>>;
      };
      chat_room_participants: {
        Row: ChatRoomParticipant;
        Insert: Omit<ChatRoomParticipant, 'id'>;
        Update: Partial<Omit<ChatRoomParticipant, 'id'>>;
      };
      buddy_matches: {
        Row: BuddyMatch;
        Insert: Omit<BuddyMatch, 'id' | 'created_at'>;
        Update: Partial<Omit<BuddyMatch, 'id' | 'created_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      get_user_stats: {
        Args: { p_user_id: string };
        Returns: UserStats;
      };
      create_buddy_match: {
        Args: { p_user_a: string; p_user_b: string };
        Returns: BuddyMatch | null;
      };
    };
  };
}

export interface UserStats {
  total_sessions: number;
  total_duration: number;
  avg_duration: number;
  longest_session: number;
  first_session: string | null;
  hourly_distribution: Array<{ hour: number; count: number }> | null;
}
