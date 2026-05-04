import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface QueuedEvent {
  eventType: string;
  page?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

// Module-level queue so it survives re-renders and is shared across hook instances
const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await apiFetch('/api/usage/events', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  } catch {
    // analytics never breaks the app
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 30_000);
}

export function useAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const pageEntryRef = useRef<number>(Date.now());
  const lastPageRef = useRef<string>(location.pathname);

  const track = useCallback((
    eventType: string,
    page?: string,
    metadata?: Record<string, unknown>,
    durationMs?: number,
  ) => {
    if (!user) return;
    queue.push({ eventType, page, metadata, durationMs, createdAt: new Date().toISOString() });
    scheduleFlush();
  }, [user]);

  // Page visit tracking on route change
  useEffect(() => {
    const prev = lastPageRef.current;
    const elapsed = Date.now() - pageEntryRef.current;

    if (prev !== location.pathname && elapsed > 1000) {
      track('page_visit', prev, undefined, elapsed);
    }

    lastPageRef.current = location.pathname;
    pageEntryRef.current = Date.now();
    track('session_start', location.pathname);
  }, [location.pathname, track]);

  // Flush on tab close
  useEffect(() => {
    const onUnload = () => {
      const elapsed = Date.now() - pageEntryRef.current;
      if (elapsed > 1000) track('page_visit', lastPageRef.current, undefined, elapsed);
      flush();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [track]);

  const trackAIQuery = useCallback((durationMs: number) => {
    track('ai_query', location.pathname, undefined, durationMs);
  }, [track, location.pathname]);

  const trackUpload = useCallback((durationMs: number, fileCount = 1) => {
    track('file_upload', location.pathname, { fileCount }, durationMs);
  }, [track, location.pathname]);

  const trackTabClick = useCallback((tabName: string) => {
    track('tab_click', location.pathname, { tab: tabName });
  }, [track, location.pathname]);

  return { trackAIQuery, trackUpload, trackTabClick };
}
