import { create } from 'zustand';
import type { User, Session as AuthSession } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signInAnonymously, signInWithEmail as signInWithEmailFn } from '@/lib/auth';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        });
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signIn: async () => {
    set({ isLoading: true });
    try {
      const data = await signInAnonymously();
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to sign in');
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await signInWithEmailFn(email, password);
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  refreshUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      set({ user });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  },
}));
