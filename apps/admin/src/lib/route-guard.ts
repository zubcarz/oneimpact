import { Role } from '@oneimpact/shared';
import { decodeJwtPayload, isSessionExpired } from '@/lib/session';

/**
 * Pure routing decision behind `src/proxy.ts`.
 *
 * It lives here, apart from the proxy itself, for two reasons: the rule is the
 * interesting part and it is unit testable without `next/server`, and the proxy
 * file stays a thin translation from a decision to a `NextResponse`.
 *
 * **Security invariant**: this is a UX filter, it decides which screen to show.
 * The real authorization happens in the API, with `JwtAuthGuard` + `RolesGuard`
 * (`@Roles('ADMIN')` in
 * apps/api/src/modules/projects/controllers/admin-projects.controller.ts:34-35).
 * No signature is verified here, so a forged token gets past this check and dies
 * in the API with 401/403.
 */

export type RouteDecision = 'allow' | 'redirect-login' | 'rewrite-403';

export const LOGIN_PATH = '/login';
export const FORBIDDEN_PATH = '/403';

/**
 * Paths the guard never gates, either as an exact match or as a prefix:
 *
 * - `/login` and `/403`: gating them would loop against themselves.
 * - `/api/auth/*`: the handlers that create and destroy the session. There is
 *   no session yet when they are called.
 * - `/api/gateway/*`: **on purpose**. That handler answers `401` JSON when the
 *   session is gone (app/api/gateway/[...path]/route.ts:189-197) and it is
 *   consumed by TanStack Query, which needs the status code. Redirecting it to
 *   `/login` would hand a fetch caller an HTML document with status 200.
 * - `/_next/static`, `/_next/image` and `/favicon.ico`: framework assets. Only
 *   those two `_next` prefixes, not `/_next` whole: the Next docs warn that
 *   `_next/data` reaches the proxy even when a matcher excludes it, precisely so
 *   a protected page cannot be read through its data route (proxy.md:663).
 */
const OPEN_PREFIXES = [
  '/login',
  '/403',
  '/api/auth',
  '/api/gateway',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
];

/**
 * Anything with a file extension is treated as a static asset of `public/`
 * (today `logo_blanco.svg` and `logo_negro.svg`). No page route of the panel
 * ends in an extension, so this cannot open a real screen.
 */
const STATIC_ASSET_PATTERN = /\.[a-z0-9]+$/i;

export interface RouteGuardInput {
  pathname: string;
  /** Value of the `oi_access` cookie, `undefined` when it is not set. */
  token: string | undefined;
  /** Injected so the expiry case is testable without faking the clock. */
  nowMs?: number;
}

export function decideRoute({ pathname, token, nowMs = Date.now() }: RouteGuardInput): RouteDecision {
  if (isOpenPath(pathname)) return 'allow';

  // No cookie, a token that is not decodable, or one that already expired: all
  // three are "there is no usable session", and all three end on the login
  // screen. The panel does not refresh tokens here; the gateway does that on
  // its own, one flight at a time.
  if (!token) return 'redirect-login';
  const payload = decodeJwtPayload(token);
  if (payload === null) return 'redirect-login';
  if (isSessionExpired(payload, nowMs)) return 'redirect-login';

  // A logged in `USER` is not sent to `/login`: their session is valid, so they
  // would log in again and bounce back here forever. They get the 403 screen
  // with the URL untouched, which is also what the Playwright spec asserts.
  if (payload.role !== Role.ADMIN) return 'rewrite-403';

  return 'allow';
}

function isOpenPath(pathname: string): boolean {
  if (STATIC_ASSET_PATTERN.test(pathname)) return true;
  return OPEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
