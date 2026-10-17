import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type PropsWithChildren } from 'react';

import * as authApi from '@/api/endpoints/auth';
import { queryClient } from '@/lib/query-client';
import {
  clearTokens,
  getTokens,
  hydrateTokenStore,
  isTokenStoreHydrated,
  setTokens,
  subscribeToTokenStore,
} from './token-store';

interface AuthContextValue {
  isAuthenticated: boolean;
  /** False until the persisted session has been read from SecureStore —
   * screens that render different UI for logged-in/out should wait for
   * this rather than assuming "no token yet" means logged out. */
  isHydrated: boolean;
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    void hydrateTokenStore();
  }, []);

  const tokens = useSyncExternalStore(subscribeToTokenStore, getTokens, () => null);
  const hydrated = useSyncExternalStore(subscribeToTokenStore, isTokenStoreHydrated, () => false);
  const isAuthenticated = tokens !== null;

  // Cached responses belong to whoever was signed in when they were
  // fetched. Watching the signed-in state (rather than hooking logout())
  // also covers a session that ends because a token refresh failed.
  const wasAuthenticated = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const previous = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (previous === null || previous === isAuthenticated) return;

    if (isAuthenticated) {
      // Logged in: public data (home feed, restaurants) is still valid but
      // un-personalised — refetch so isFavorited etc. reflect this account.
      void queryClient.invalidateQueries();
    } else {
      // Logged out: drop everything so the next person on this phone never
      // sees the previous account's bookings, favourites or stats.
      queryClient.clear();
    }
  }, [hydrated, isAuthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isHydrated: hydrated,
      requestOtp: authApi.requestOtp,
      verifyOtp: async (phoneNumber, code) => {
        const result = await authApi.verifyOtp(phoneNumber, code);
        await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      },
      logout: async () => {
        const current = getTokens();
        await clearTokens();
        if (current) {
          // Best-effort: the user is logged out locally regardless of
          // whether the server-side revoke succeeds.
          authApi.logout(current.refreshToken).catch(() => {});
        }
      },
    }),
    [isAuthenticated, hydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
