import { cookies } from 'next/headers';
import { createApiClient } from '@oneimpact/api-client';
import type { ApiClient } from '@oneimpact/api-client';
import { API_URL } from '@/lib/env';
import { ACCESS_COOKIE } from '@/lib/session';

/**
 * API client for the server side: Server Components, route handlers and the
 * gateway. It talks to the API directly (`API_URL`) and reads the access token
 * from the httpOnly cookie, which is only reachable from here.
 *
 * It is a function and not a module-level constant because `cookies()` needs a
 * request scope: a shared instance created at import time would leak the token
 * of the first request into every other one.
 */
export function getServerApi(): ApiClient {
  return createApiClient({
    baseUrl: API_URL,
    // `ApiClientOptions['getToken']` accepts `Promise<string | null> | string | null`
    // (packages/api-client/src/http.ts:3), so the async `cookies()` of Next 16
    // fits without any adapter.
    getToken: async () => (await cookies()).get(ACCESS_COOKIE)?.value ?? null,
  });
}
