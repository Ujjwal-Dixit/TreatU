import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

let tokens: TokenPair | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Called once at app start (see AuthProvider). Reads whatever session was
 * persisted from a previous launch before any screen renders auth-gated UI. */
export async function hydrateTokenStore(): Promise<void> {
  if (hydrated) return;
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  hydrated = true;
  notify();
}

export function getTokens(): TokenPair | null {
  return tokens;
}

export function isTokenStoreHydrated(): boolean {
  return hydrated;
}

export async function setTokens(next: TokenPair): Promise<void> {
  tokens = next;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, next.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken),
  ]);
  notify();
}

export async function clearTokens(): Promise<void> {
  tokens = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  notify();
}

/** Plain module-level store, not a React Context, on purpose — the HTTP
 * client (auth header injection, refresh-and-retry on 401) is a plain
 * module too and needs synchronous read access outside of any component
 * tree. AuthProvider subscribes to this via useSyncExternalStore to stay
 * reactive for UI. */
export function subscribeToTokenStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
