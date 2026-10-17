import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type PropsWithChildren } from 'react';

import * as authApi from '@/api/endpoints/auth';
import { ApiError } from '@/api/api-error';
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
  /** False until the persisted session has been read from SecureStore. */
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

  // Drop cached data whenever the session ends — explicit logout or a
  // failed token refresh — so a shared staff phone never shows the
  // previous account's restaurant, offers or customers.
  const wasAuthenticated = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const previous = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (previous === true && !isAuthenticated) queryClient.clear();
  }, [hydrated, isAuthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isHydrated: hydrated,
      requestOtp: authApi.requestOtp,
      verifyOtp: async (phoneNumber, code) => {
        const result = await authApi.verifyOtp(phoneNumber, code);
        // The backend's OTP login is shared with the customer app and
        // signs up unknown numbers as customers. Restaurant accounts are
        // created by us at onboarding, so anything else is turned away
        // here — and the session just issued is revoked, not kept. (The
        // owner endpoints enforce the role server-side regardless.)
        if (result.user.role !== 'restaurant_owner') {
          authApi.logout(result.refreshToken).catch(() => {});
          throw new ApiError(
            'NOT_A_PARTNER',
            "This number isn't linked to a TreatU partner restaurant. Contact us to list your restaurant.",
            403,
          );
        }
        await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      },
      logout: async () => {
        const current = getTokens();
        await clearTokens(); // the effect above clears the query cache
        if (current) {
          // Best-effort: logged out locally regardless of the server revoke.
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
