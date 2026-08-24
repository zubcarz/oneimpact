import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createApiClient } from '@oneimpact/api-client';
import type { AuthTokens } from '@oneimpact/shared';
import { API_URL } from '@/lib/env';
import {
  allowsResponseBody,
  buildForwardedRequestHeaders,
  buildForwardedResponseHeaders,
  buildTargetUrl,
} from '@/lib/gateway';
import { createSingleFlight } from '@/lib/single-flight';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/session';

/**
 * BFF between the browser code of the panel and the API.
 *
 * `browserApi` (`@/lib/api-browser`) points here, so a Client Component can call
 * `/api/gateway/v1/projects` without ever holding a token: this handler reads
 * the `httpOnly` cookie -- unreachable from client JavaScript -- and injects the
 * `Authorization` header on the server side.
 *
 * Invariants:
 *
 * 1. Neither the access nor the refresh token is ever part of a response body.
 *    They only travel as `httpOnly` cookies.
 * 2. The `Cookie` header of the browser is never forwarded to the API (see the
 *    allow list in `@/lib/gateway`). The API authenticates by header only.
 * 3. The target host is never taken from the request: it is always `API_URL`.
 *    Only the path segments and the query string come from outside, and the
 *    segments are validated before composing the URL.
 * 4. Nothing is logged here. The only context available in this file is the
 *    token, the headers and the body -- the three things that must not be
 *    logged.
 *
 * **Why raw `fetch` and not `createApiClient`**: this is the one file of the
 * admin that is not a typed consumer of the contract but a transport. It needs
 * the raw status, the untouched body and the response headers, and
 * `createRequestFn` (packages/api-client/src/http.ts:22-35) does the opposite:
 * it parses the JSON and throws `ApiError` on any non-2xx, which would erase
 * exactly what TanStack Query needs on the other side. The refresh call below
 * *does* use the api client, because that one is a typed call.
 */

/** `params` is a Promise since Next 15 (`context.params is now a promise`). */
interface GatewayContext {
  params: Promise<{ path: string[] }>;
}

export function GET(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  return handle(request, context);
}

export function POST(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  return handle(request, context);
}

export function PATCH(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  return handle(request, context);
}

export function DELETE(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  return handle(request, context);
}

async function handle(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(API_URL, path, request.nextUrl.search);
  if (targetUrl === null) {
    return NextResponse.json({ message: 'Ruta inválida.' }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  // No session at all: answered here, without touching the API.
  if (!accessToken) return expiredSessionResponse();

  // Buffered instead of streamed because the retry below needs to send the very
  // same body a second time, and a request stream can only be consumed once.
  const body = await readBody(request);

  const first = await forward(request, targetUrl, accessToken, body);
  if (first === null) return unreachableApiResponse();
  if (first.status !== 401) return toClientResponse(first);

  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return expiredSessionResponse();

  // May start the refresh or join the one already in flight for this same
  // token; either way this request ends up with the new pair.
  const tokens = await refreshTokens(refreshToken);
  // The refresh failed: the session is really over. Both cookies are cleared so
  // the next navigation lands on `/login` instead of looping through here. Every
  // request that joined the same failed flight answers 401 and clears them too.
  if (tokens === null) return expiredSessionResponse();

  // Exactly one retry. A 401 coming from this second call is passed through as
  // it is: with a token issued seconds ago it means a permission problem, not
  // an expiry, and refreshing again would just loop.
  const second = await forward(request, targetUrl, tokens.accessToken, body);
  if (second === null) return unreachableApiResponse();

  const response = await toClientResponse(second);
  // The API rotates the refresh token on every refresh
  // (apps/api/src/modules/auth/application/auth.service.ts:126-133: it issues a
  // new pair, persists it and revokes the presented one), so both cookies have
  // to be replaced. Keeping the old refresh would get the whole chain revoked
  // on its next use, which the API treats as token reuse.
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  return response;
}

/** Performs the call to the API. `null` means the API could not be reached. */
async function forward(
  request: NextRequest,
  targetUrl: string,
  accessToken: string,
  body: ArrayBuffer | null,
): Promise<Response | null> {
  try {
    return await fetch(targetUrl, {
      method: request.method,
      headers: buildForwardedRequestHeaders(request.headers, accessToken),
      body,
      // The API is another service: its own cache rules apply, this hop adds none.
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return null;
  }
}

/** `null` for the methods that carry no body, so `fetch` does not reject them. */
async function readBody(request: NextRequest): Promise<ArrayBuffer | null> {
  if (request.method === 'GET' || request.method === 'DELETE') return null;
  const buffer = await request.arrayBuffer();
  return buffer.byteLength > 0 ? buffer : null;
}

/**
 * Passthrough of status and body, on purpose: the domain error codes and
 * messages of the API are what the client renders. Only the headers are
 * filtered.
 */
async function toClientResponse(apiResponse: Response): Promise<NextResponse> {
  const headers = buildForwardedResponseHeaders(apiResponse.headers);
  const body = allowsResponseBody(apiResponse.status) ? await apiResponse.arrayBuffer() : null;
  return new NextResponse(body, { status: apiResponse.status, headers });
}

/**
 * One refresh at a time per refresh token, shared by every request that is
 * waiting for it. Without this, two queries expiring in the same instant send
 * two `POST /v1/auth/refresh`; the second one presents a token the first one
 * already rotated away, the API reads that as token reuse and revokes the whole
 * chain (auth.service.ts:111-119), logging the admin out. Keyed by token so a
 * different session in the same process never joins this flight.
 *
 * Module state, so its scope is **this process**: see the note in
 * `@/lib/single-flight` about several instances behind a load balancer.
 */
const refreshFlight = createSingleFlight<AuthTokens | null>();

/**
 * `null` when the refresh was rejected or the API is down. Every waiter gets
 * the same pair and each one writes it into its own response, since each
 * request has its own `NextResponse`.
 */
function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  return refreshFlight.run(refreshToken, async () => {
    try {
      // `/v1/auth/refresh` is `@Public()`, so no `getToken` is needed here.
      return await createApiClient({ baseUrl: API_URL }).auth.refresh({ refreshToken });
    } catch {
      return null;
    }
  });
}

/** 401 plus removal of both cookies, with the same attributes they were set with. */
function expiredSessionResponse(): NextResponse {
  const response = NextResponse.json(
    { message: 'Tu sesión expiró. Vuelve a iniciar sesión.' },
    { status: 401 },
  );
  response.cookies.set(ACCESS_COOKIE, '', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/** The API did not answer. Distinguished from a 401 so the UI does not log out. */
function unreachableApiResponse(): NextResponse {
  return NextResponse.json(
    { message: 'No se pudo contactar con el servidor. Inténtalo de nuevo en unos segundos.' },
    { status: 502 },
  );
}
