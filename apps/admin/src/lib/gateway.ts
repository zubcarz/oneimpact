/**
 * Pure helpers of the `/api/gateway` route handler.
 *
 * They live here, outside the handler, because they are the only part of the
 * BFF that can be unit tested without a request: URL composition, segment
 * sanitisation and header filtering. The handler itself keeps the I/O.
 */

/**
 * A path segment is accepted only if it is made of the characters the REST
 * contract actually uses (cuids, slugs, uuids). It is an allow list and not a
 * "reject `..`" check on purpose: with `/`, `\` and `:` outside the alphabet it
 * is impossible to escape the host, to reach a second path level or to smuggle
 * a `://` scheme, whatever new segment shape appears later.
 *
 * Next already percent-decodes the segments before handing them over in
 * `params`, so `%2e%2e` arrives here as `..` and is rejected like any other
 * traversal attempt.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;

/** Traversal segments that pass the alphabet check and must be rejected apart. */
const TRAVERSAL_SEGMENTS = new Set(['.', '..']);

export function isSafePathSegment(segment: string): boolean {
  if (typeof segment !== 'string' || segment.length === 0) return false;
  if (TRAVERSAL_SEGMENTS.has(segment)) return false;
  return SAFE_SEGMENT.test(segment);
}

/**
 * Composes the target URL from the configured API host and the catch-all
 * segments. The caller never gets to choose the host: `baseUrl` comes from
 * `API_URL` (`@/lib/env`) and only the path and the query string are taken from
 * the incoming request.
 *
 * Returns `null` when any segment is unsafe, so the handler can answer 400
 * without ever opening a connection.
 *
 * @param search query string of the original request, including its leading
 *   `?` (that is exactly what `NextRequest.nextUrl.search` gives), or `''`.
 */
export function buildTargetUrl(baseUrl: string, segments: string[], search = ''): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (!segments.every(isSafePathSegment)) return null;

  const path = segments.map(encodeURIComponent).join('/');
  return `${baseUrl.replace(/\/+$/, '')}/${path}${search}`;
}

/**
 * Headers copied from the browser request to the API request.
 *
 * An allow list, again on purpose. It excludes hop-by-hop headers
 * (`connection`, `transfer-encoding`, `te`, `upgrade`, ...), `host` and
 * `content-length` -- which `fetch` recomputes -- and, above all, `cookie`:
 * the session cookie of the panel must never reach the API, which authenticates
 * by `Authorization` header only.
 */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language'] as const;

/** Builds the headers of the outgoing request, with the token injected here. */
export function buildForwardedRequestHeaders(source: Headers, accessToken: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = source.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Set last so an incoming `Authorization` could never override it: it is not
  // in the allow list, but making the order explicit keeps that a fact and not
  // a coincidence.
  headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

/**
 * Headers copied from the API response back to the browser.
 *
 * `content-encoding` and `content-length` are dropped because `fetch` already
 * decoded the body and the length no longer matches; `set-cookie` is dropped
 * because the only component allowed to write cookies for this origin is the
 * admin itself.
 */
const FORWARDED_RESPONSE_HEADERS = ['content-type'] as const;

export function buildForwardedResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value !== null) headers.set(name, value);
  }
  return headers;
}

/** Statuses whose response must not carry a body (the runtime throws if it does). */
const BODILESS_STATUSES = new Set([204, 205, 304]);

export function allowsResponseBody(status: number): boolean {
  return !BODILESS_STATUSES.has(status);
}
