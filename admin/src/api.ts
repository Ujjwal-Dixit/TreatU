export const API_URL: string =
  import.meta.env.VITE_API_URL ??
  'https://treatu-production.up.railway.app/api/v1';

export interface Overview {
  cityName: string;
  registeredUsers: number;
  totalBookings: number;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  area: string;
  status: string;
  ownerPhoneNumber: string | null;
}

export interface NewRestaurant {
  name: string;
  description?: string;
  cuisines: string[];
  priceTier: number;
  streetAddress: string;
  area: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string;
  ownerPhoneNumber?: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** Thrown for any non-2xx response; `message` is the backend's
 * human-readable error, safe to show as-is. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const TOKENS_KEY = 'treatu-admin-tokens';

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: Tokens | null): void {
  try {
    if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {
    // Storage blocked: the session just won't survive a reload.
  }
}

let tokens = readTokens();
let onSignedOut: () => void = () => {};

export function isSignedIn(): boolean {
  return tokens !== null;
}

/** Called when a refresh fails, so the app can drop back to the login
 * screen instead of showing errors on every request. */
export function setSignedOutHandler(handler: () => void): void {
  onSignedOut = handler;
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...init.headers,
    },
  });
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiError(
      body.error?.message ?? `Request failed (${res.status}).`,
      res.status,
      body.error?.code,
    );
  } catch {
    return new ApiError(`Request failed (${res.status}).`, res.status);
  }
}

// Shared so parallel requests that all hit an expired access token wait on
// one refresh rather than each rotating (and revoking) the refresh token.
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    if (!tokens) return false;
    const res = await send('/auth/token/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) return false;
    tokens = (await res.json()) as Tokens;
    writeTokens(tokens);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && tokens) {
    if (await refreshTokens()) {
      res = await send(path, init);
    } else {
      signOut();
      throw new ApiError('Your session expired. Please log in again.', 401);
    }
  }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function requestOtp(phoneNumber: string): Promise<void> {
  await request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
): Promise<void> {
  const result = await request<Tokens & { user: { role: string } }>(
    '/auth/otp/verify',
    { method: 'POST', body: JSON.stringify({ phoneNumber, code }) },
  );
  if (result.user.role !== 'admin') {
    // Don't leave a customer/owner session behind in this browser.
    void fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: result.refreshToken }),
    });
    throw new ApiError('This number is not an admin account.', 403);
  }
  tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
  writeTokens(tokens);
}

export function signOut(): void {
  if (tokens) {
    void fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => {});
  }
  tokens = null;
  writeTokens(null);
  onSignedOut();
}

export const getOverview = () => request<Overview>('/admin/overview');

export const listRestaurants = () =>
  request<AdminRestaurant[]>('/admin/restaurants');

export const createRestaurant = (body: NewRestaurant) =>
  request<AdminRestaurant>('/admin/restaurants', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const removeRestaurant = (id: string) =>
  request<void>(`/admin/restaurants/${id}`, { method: 'DELETE' });
