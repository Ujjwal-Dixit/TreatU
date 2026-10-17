import { API_BASE_URL } from '@/config/env';
import { getTokens, setTokens, clearTokens } from '@/auth/token-store';
import { ApiError } from './api-error';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Attach the access token if present. Defaults to true — most endpoints
   * either require auth or personalize when it's present (mirrors the
   * backend's OptionalJwtAuthGuard split). */
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

interface ErrorResponseBody {
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    if (body.error) {
      return new ApiError(body.error.code, body.error.message, response.status, body.error.details);
    }
  } catch {
    // Body wasn't JSON (e.g. an upstream proxy error page) — fall through.
  }
  return new ApiError('UNKNOWN_ERROR', `Request failed with status ${response.status}.`, response.status);
}

async function rawRequest<T>(path: string, options: RequestOptions, accessToken: string | undefined): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.', 0);
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

let refreshPromise: Promise<boolean> | null = null;

/** De-duplicates concurrent refresh attempts: if several requests 401 at
 * once (e.g. a screen firing multiple queries), only one refresh call goes
 * out and the rest wait on it instead of racing to replace the token. */
async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const current = getTokens();
    if (!current) return false;
    try {
      const result = await rawRequest<RefreshResponse>(
        '/auth/token/refresh',
        { method: 'POST', body: { refreshToken: current.refreshToken }, auth: false },
        undefined,
      );
      await setTokens(result);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  const tokens = getTokens();

  try {
    return await rawRequest<T>(path, options, useAuth ? tokens?.accessToken : undefined);
  } catch (error) {
    const shouldRetryAfterRefresh = useAuth && tokens !== null && error instanceof ApiError && error.status === 401;
    if (!shouldRetryAfterRefresh) throw error;

    const refreshed = await refreshAccessToken();
    if (!refreshed) throw error;

    return rawRequest<T>(path, options, getTokens()?.accessToken);
  }
}
