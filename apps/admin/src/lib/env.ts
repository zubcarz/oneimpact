/**
 * Server-side configuration of the admin panel.
 *
 * `API_URL` is the server-only variable (used by Server Components, route
 * handlers and the proxy). `NEXT_PUBLIC_API_URL` is kept as a fallback because
 * it is the variable the rest of the monorepo already documents, and it is the
 * one the browser needs for direct calls that never pass through the proxy.
 */

const DEFAULT_API_URL = 'http://localhost:5000';

function readApiUrl(): string {
  const configured = process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  const value = configured && configured.length > 0 ? configured : DEFAULT_API_URL;
  // `createRequestFn` concatenates `baseUrl + path` and every path in
  // `API_PATHS` starts with `/v1` (packages/api-client/src/http.ts:22), so a
  // trailing slash here would produce a double slash in every request.
  return value.replace(/\/+$/, '');
}

export const API_URL = readApiUrl();
