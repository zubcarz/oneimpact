import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@oneimpact/api-client';

// Catalog data (plans, zones, projects) is admin-curated content that changes
// on the order of days, not seconds. A five-minute staleTime avoids refetching
// on every screen focus while still picking up admin edits within a session.
const STALE_TIME_MS = 5 * 60 * 1000;

// A retry policy that understands *why* a request failed, not just whether it
// failed:
// - 401 is already handled by `callApi` (src/api/client.ts), which refreshes
//   the session and retries once before the error ever reaches React Query.
//   If a 401 still gets here, the session is genuinely dead; retrying more
//   would just repeat the same failure.
// - 403 is a role/permission problem. The user's role does not change between
//   retries, so retrying is pointless.
// - 404 means the resource does not exist. Retrying does not make it appear.
// - Anything else (network hiccup, 5xx) is worth a couple of attempts, capped
//   low so a genuinely broken backend fails fast instead of hanging the UI.
const NON_RETRYABLE_STATUSES = new Set([401, 403, 404]);
const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      retry: shouldRetry,
    },
    mutations: {
      // Mutations (register, login, create subscription, follow/unfollow) are
      // user-initiated actions with side effects on the server; silently
      // retrying one behind the user's back (e.g. double-submitting a
      // subscription) is worse than surfacing the error once.
      retry: false,
    },
  },
});
