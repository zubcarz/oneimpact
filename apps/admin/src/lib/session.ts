import { cookies } from 'next/headers';

/**
 * Session cookies of the admin panel and the JWT payload reader used by the
 * proxy (`src/proxy.ts`), the route handlers and the Server Components.
 *
 * The access token is never exposed to client-side JavaScript: both cookies are
 * `httpOnly` and the browser talks to the API through the gateway route handler
 * (`/api/gateway`).
 */

export const ACCESS_COOKIE = 'oi_access';
export const REFRESH_COOKIE = 'oi_refresh';

/**
 * Mirrors the token lifetimes issued by the API:
 * `ACCESS_TOKEN_TTL = '15m'` and `REFRESH_TOKEN_TTL = '30d'`
 * (apps/api/src/modules/auth/application/tokens.service.ts:20-21).
 */
const ACCESS_COOKIE_MAX_AGE = 15 * 60;
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  // Local development and Playwright run over plain http, so `secure` would
  // silently drop the cookie there.
  secure: process.env.NODE_ENV === 'production',
} as const;

export const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: ACCESS_COOKIE_MAX_AGE,
} as const;

export const REFRESH_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_COOKIE_MAX_AGE,
} as const;

export interface JwtPayload {
  sub: string;
  email: string;
  /**
   * Kept as `string` on purpose: this value comes from an unverified token, so
   * narrowing it to the `Role` union of `@oneimpact/shared` would claim more
   * than what was checked. Callers compare it against `Role.ADMIN`.
   */
  role: string;
  /** Expiration, in seconds since the epoch. */
  exp: number;
}

/**
 * Decodes the payload of a JWT **without verifying its signature**: the
 * signature is verified by the API (`JwtAuthGuard`). Here the payload is only
 * used for UX decisions (which screen to show), never as an authorization
 * source.
 *
 * Returns `null` for anything that is not a token with a decodable payload of
 * the expected shape. It never throws.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  if (typeof token !== 'string') return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  const json = decodeBase64Url(segments[1]);
  if (json === null) return null;

  try {
    return toJwtPayload(JSON.parse(json));
  } catch {
    return null;
  }
}

/** `true` when the payload is already expired (`exp` is in seconds). */
export function isSessionExpired(payload: Pick<JwtPayload, 'exp'>, nowMs = Date.now()): boolean {
  return payload.exp <= nowMs / 1000;
}

/** Reads the session from the access cookie. `cookies()` is async in Next 16. */
export async function readSession(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return decodeJwtPayload(token);
}

/**
 * base64url -> UTF-8 string. `atob` returns one latin1 char per byte, so the
 * bytes are re-decoded with `TextDecoder` to keep accents intact.
 */
function decodeBase64Url(segment: string): string | null {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** A payload missing any of the four claims is treated as no session at all. */
function toJwtPayload(value: unknown): JwtPayload | null {
  if (typeof value !== 'object' || value === null) return null;
  const { sub, email, role, exp } = value as Record<string, unknown>;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  if (typeof email !== 'string' || email.length === 0) return null;
  if (typeof role !== 'string' || role.length === 0) return null;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  return { sub, email, role, exp };
}
