import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createApiClient } from '@oneimpact/api-client';
import { API_URL } from '@/lib/env';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/session';

/**
 * Closes the session: revokes the refresh token in the API and clears both
 * cookies.
 *
 * `POST /v1/auth/logout` is deliberately **not** `@Public()`
 * (apps/api/src/modules/auth/controllers/auth.controller.ts:56-61): it needs the
 * access token in the `Authorization` header *and* the refresh token in the
 * body, because it revokes that specific session.
 *
 * The call to the API is best-effort. If the API is down or the access token
 * already expired, the local session is closed anyway: leaving live cookies on a
 * failed logout would be worse than an orphan refresh token, which expires on
 * its own.
 *
 * The answer is a 303 redirect so that "Cerrar sesión" can be a plain
 * `<form method="post">` with no JavaScript: 303 is what makes the browser
 * follow up with a GET to `/login` instead of re-posting.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (accessToken && refreshToken) {
    try {
      const api = createApiClient({ baseUrl: API_URL, getToken: () => accessToken });
      await api.auth.logout({ refreshToken });
    } catch {
      // Swallowed on purpose: see the note above. Nothing is logged here, since
      // the only context available is the token itself.
    }
  }

  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  // Expired with the same attributes they were written with, so the browser
  // matches the pair (name, path) and actually drops them.
  response.cookies.set(ACCESS_COOKIE, '', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
