import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';

export function useSession() {
  const user = useAuthStore((s) => s.user);

  // Subscribe to individual fields — NOT the whole store.
  // Critically: do NOT subscribe to elapsedSeconds here.
  // SessionTimer reads it directly from the store so only it re-renders on tick.
  const isActive = useSessionStore((s) => s.isActive);
  const sessions = useSessionStore((s) => s.sessions);
  const isLoading = useSessionStore((s) => s.isLoading);
  const startSession = useSessionStore((s) => s.startSession);
  const stopSession = useSessionStore((s) => s.stopSession);
  const quickLog = useSessionStore((s) => s.quickLog);
  const updateMeta = useSessionStore((s) => s.updateMeta);
  const removeSession = useSessionStore((s) => s.removeSession);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const restoreActiveSession = useSessionStore((s) => s.restoreActiveSession);
  const tick = useSessionStore((s) => s.tick);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore active session on mount
  useEffect(() => {
    restoreActiveSession();
  }, [restoreActiveSession]);

  // Load session history
  useEffect(() => {
    if (user?.id) {
      loadSessions(user.id);
    }
  }, [user?.id, loadSessions]);

  // Timer tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, tick]);

  const handleStart = async () => {
    if (!user?.id) return;
    await startSession(user.id);
  };

  const handleStop = async () => {
    if (!user?.id) return;
    return await stopSession(user.id);
  };

  const handleQuickLog = async (
    startedAt: string,
    durationSeconds: number,
    notes?: string
  ) => {
    if (!user?.id) return;
    await quickLog(user.id, startedAt, durationSeconds, notes);
  };

  const refreshSessions = async (userId: string) => {
    await loadSessions(userId);
  };

  return {
    isActive,
    sessions,
    isLoading,
    startSession: handleStart,
    stopSession: handleStop,
    quickLog: handleQuickLog,
    updateMeta,
    removeSession,
    refreshSessions,
  };
}
