import { createApiClient } from '@oneimpact/api-client';

/**
 * API client for the browser: every request goes to the `/api/gateway` route
 * handler, which attaches the access token and forwards it to the API.
 *
 * Since `API_PATHS` already starts with `/v1`
 * (packages/shared/src/api-paths.ts:6), the URL the browser actually hits looks
 * like `/api/gateway/v1/projects`.
 *
 * The route handler is called `gateway` and not `proxy` on purpose: in Next 16
 * `middleware.ts` was deprecated and renamed to `proxy.ts`, so `src/proxy.ts`
 * is the auth middleware of this app and the name is already taken.
 *
 * Two deliberate decisions:
 *
 * 1. No `getToken`. The access token lives in an httpOnly cookie and must never
 *    reach client-side JavaScript nor the RSC payload; if this client could read
 *    it, any XSS would be enough to steal the session. Whoever is authenticated
 *    is decided on the server, by the route handler.
 * 2. No `credentials: 'include'`. `createRequestFn` calls `fetch` without a
 *    `credentials` option (packages/api-client/src/http.ts:22) and its default
 *    is `same-origin`; `/api/gateway` is same-origin, so the cookie travels
 *    anyway. There is nothing to patch in `packages/api-client`.
 */
export const browserApi = createApiClient({ baseUrl: '/api/gateway' });
