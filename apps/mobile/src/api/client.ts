import { ApiError, createApiClient, type ApiClient } from '@oneimpact/api-client';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  saveTokens,
} from '@/auth/token-store';

// The raw client is never exported. `@oneimpact/api-client` has no
// interception point (createRequestFn uses the global fetch directly and
// isn't injectable), so the 401-refresh-and-retry contract can only be
// enforced by making `callApi` the single door into the client. If the raw
// client were exported, any call site could bypass the retry logic simply by
// calling `client.projects.list()` directly.
const client = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  getToken: getAccessToken,
});

// In-flight refresh promise, shared by every concurrent 401. Without this,
// two requests failing at the same instant would each start their own
// `auth.refresh` call; since refresh tokens are rotated server-side, the
// second call would invalidate the token the first call just received,
// logging the user out. Keeping the promise in a module-level variable (not
// per-call) is what makes concurrent callers await the same refresh.
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRefresh(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token stored');
  }
  const tokens = await client.auth.refresh({ refreshToken });
  await saveTokens(tokens);
}

/**
 * Runs `fn` against the API client, with a single automatic 401 recovery:
 *
 * 1. Call `fn(client)`. If it resolves, done.
 * 2. If it throws something other than an `ApiError` with `status === 401`
 *    (in particular a 403, which is a role problem, not a token problem),
 *    re-throw as-is. No refresh is attempted.
 * 3. On a 401, refresh the session once (see `refreshSession` above for how
 *    concurrent 401s share a single refresh) and retry `fn(client)` once.
 *    If that retry also throws a 401, it is propagated without refreshing
 *    again -- refreshing in a loop would just hide a genuinely dead session.
 * 4. If the refresh itself fails (including "no refresh token stored"),
 *    clear the stored tokens, notify listeners that the session expired, and
 *    propagate the *original* 401 error.
 */
export async function callApi<T>(fn: (api: ApiClient) => Promise<T>): Promise<T> {
  try {
    return await fn(client);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    try {
      await refreshSession();
    } catch {
      await clearTokens();
      notifySessionExpired();
      throw error;
    }
    return fn(client);
  }
}
