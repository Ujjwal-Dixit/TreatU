import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { API_BASE_URL } from '@/config/env';
import { getTokens, isTokenStoreHydrated, subscribeToTokenStore } from '@/auth/token-store';
import { openEventStream, type StreamEvent } from './event-stream';

const MAX_BACKOFF_MS = 30_000;

const getAccessToken = (): string | null => getTokens()?.accessToken ?? null;

/**
 * Keeps one GET /events connection open while the app is in the
 * foreground. Reconnects with exponential backoff, and again whenever the
 * access token changes (login, logout, refresh), so the stream always
 * carries the caller's private events. `onResync` fires on every
 * connection after the first — events sent while disconnected are gone,
 * so the caller should refetch what's on screen.
 */
export function useEventStream(onEvent: (event: StreamEvent) => void, onResync: () => void): void {
  const accessToken = useSyncExternalStore(subscribeToTokenStore, getAccessToken, () => null);
  const isHydrated = useSyncExternalStore(subscribeToTokenStore, isTokenStoreHydrated, () => false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Latest callbacks without reconnecting when their identity changes.
  const handlers = useRef({ onEvent, onResync });
  useEffect(() => {
    handlers.current = { onEvent, onResync };
  });
  const hasConnectedBefore = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Wait for the stored session so we don't open an anonymous stream
    // and immediately replace it; drop the connection in the background
    // (iOS would suspend it anyway) and resync on return.
    if (!isHydrated || appState !== 'active') return;

    const controller = new AbortController();
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async (): Promise<void> => {
      try {
        await openEventStream({
          url: `${API_BASE_URL}/events`,
          accessToken,
          signal: controller.signal,
          onOpen: () => {
            attempt = 0;
            if (hasConnectedBefore.current) handlers.current.onResync();
            hasConnectedBefore.current = true;
          },
          onEvent: (event) => handlers.current.onEvent(event),
        });
      } catch {
        // Network drop or server restart — fall through to the retry.
      }
      if (controller.signal.aborted) return;
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(() => void connect(), delay);
    };

    void connect();
    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
  }, [accessToken, isHydrated, appState]);
}
