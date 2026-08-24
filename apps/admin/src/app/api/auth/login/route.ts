import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, createApiClient } from '@oneimpact/api-client';
import { loginSchema } from '@oneimpact/shared';
import { API_URL } from '@/lib/env';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/session';

/**
 * Exchanges credentials for the session cookies.
 *
 * Three invariants, in order of importance:
 *
 * 1. The tokens never reach the response body. They only leave this handler as
 *    `httpOnly` cookies, so client-side JavaScript cannot read them.
 * 2. The cookies are written **even when the role is `USER`**. Deciding who may
 *    enter the panel belongs to the proxy (`src/proxy.ts`), which rewrites to
 *    `/403`; if this handler refused to open a session for a non-admin, there
 *    would be no way to reach that page and the 403 flow could not be
 *    exercised.
 * 3. The body of the API error is never forwarded. The client only sees the
 *    messages written here, in Spanish.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos inválidos. Revisa el correo y la contraseña.' },
      { status: 400 },
    );
  }

  // No `getToken`: `/v1/auth/login` is `@Public()` and there is no session yet.
  const api = createApiClient({ baseUrl: API_URL });

  try {
    const { user, tokens } = await api.auth.login(parsed.data);
    const response = NextResponse.json({ role: user.role });
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** A malformed or absent JSON body becomes `null`, which `loginSchema` rejects. */
async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Maps the failure to a status of our own. Nothing from `error` is serialized:
 * neither the message of the API, nor its body, nor the stack.
 */
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return NextResponse.json({ message: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }
    // `/v1/auth/*` is behind `ThrottlerGuard` (10/min), and answering 502 to a
    // rate limit would send the admin looking for an outage that is not there.
    if (error.status === 429) {
      return NextResponse.json(
        { message: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' },
        { status: 429 },
      );
    }
  }
  return NextResponse.json(
    { message: 'No se pudo iniciar sesión. Inténtalo de nuevo en unos segundos.' },
    { status: 502 },
  );
}
