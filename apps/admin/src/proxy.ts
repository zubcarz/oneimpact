import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FORBIDDEN_PATH, LOGIN_PATH, decideRoute } from '@/lib/route-guard';
import { ACCESS_COOKIE } from '@/lib/session';

/**
 * Route guard of the panel.
 *
 * **File name**: `proxy.ts`, not `middleware.ts`. The `middleware` file
 * convention is deprecated in Next 16 and renamed to `proxy`
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:11).
 * It sits inside `src/`, at the same level as `app/`, as that same doc requires.
 *
 * **Runtime**: Proxy runs on Node.js and the `runtime` config option is not
 * available here -- setting it throws (proxy.md:223). Even so, the token is only
 * decoded, never verified: `jsonwebtoken` and the signing secret stay in the
 * API. See the security invariant in `@/lib/route-guard`.
 *
 * **This is UX only.** The doc is explicit about it: "Always verify
 * authentication and authorization inside each Server Function rather than
 * relying on Proxy alone" (proxy.md:219). The authorization that counts is the
 * one in the API (`JwtAuthGuard` + `RolesGuard`).
 */
export function proxy(request: NextRequest): NextResponse {
  const decision = decideRoute({
    pathname: request.nextUrl.pathname,
    token: request.cookies.get(ACCESS_COOKIE)?.value,
  });

  switch (decision) {
    case 'redirect-login':
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    // Rewrite and not redirect: the URL the admin typed is kept, so a reload
    // after logging in with the right account lands where they were going.
    case 'rewrite-403':
      return NextResponse.rewrite(new URL(FORBIDDEN_PATH, request.url));
    default:
      return NextResponse.next();
  }
}

/**
 * Without a matcher the proxy runs on **every** request, including
 * `_next/static`, `_next/image` and the assets of `public/`, and auth logic can
 * end up blocking CSS, JS or images (proxy.md:75). Hence the negative lookahead.
 *
 * `/api` is deliberately **not** excluded: the auth handlers and the gateway are
 * allowed by `decideRoute`, which keeps the whole rule in one testable place
 * instead of splitting it between a regex and a function.
 *
 * The value has to be a literal: "The `matcher` values need to be constants so
 * they can be statically analyzed at build-time. Dynamic values such as
 * variables will be ignored" (proxy.md:141).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\.ico|.*\.svg$).*)'],
};
