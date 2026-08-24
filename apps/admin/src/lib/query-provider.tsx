'use client';

import { ApiError } from '@oneimpact/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * TanStack Query provider of the panel.
 *
 * The retry policy mirrors `apps/mobile/src/api/queryClient.ts:9-44` on purpose:
 * both clients talk to the same API, so "which failures are worth repeating" is
 * a property of that API, not of the platform.
 *
 * - 401/403/404 are not retried: the session is dead, the role does not change
 *   between attempts, and a missing resource does not appear on the second try.
 * - Anything else (a network hiccup, a 5xx) gets a couple of attempts, capped
 *   low so a broken backend fails fast instead of hanging the screen.
 * - Mutations are never retried. They are user-initiated actions with side
 *   effects on the server; silently re-sending one (creating the same project
 *   twice) is worse than surfacing the error once.
 */
const NON_RETRYABLE_STATUSES = new Set([401, 403, 404]);
const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

/**
 * Zones and projects are admin-curated content that changes on the order of
 * days. Thirty seconds is enough to avoid refetching the same list while a form
 * is open, and short enough that a change made in another tab shows up without
 * a reload. It is deliberately lower than the five minutes of the mobile app:
 * this is the tool that *writes* that content, so staleness here is confusing in
 * a way it is not for a reader.
 */
const STALE_TIME_MS = 30 * 1000;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}

/**
 * The client is created **per mount**, inside `useState`, never as a module
 * constant.
 *
 * A module-level `new QueryClient()` is evaluated once per server process, so on
 * the server every request would share one cache: the zones one admin fetched
 * would be served to the next, and anything user-scoped would leak straight
 * across sessions. `useState` with an initializer also keeps a re-render from
 * throwing away the cache, which `new QueryClient()` written inline in the body
 * would do on every render.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
