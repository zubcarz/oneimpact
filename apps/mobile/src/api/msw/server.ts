/**
 * `msw/native` server that serves the full REST contract from the shared seed
 * (`handlers.ts`) inside the React Native runtime -- the Hermes-facing sibling
 * of `msw/node`, which only runs under Jest (`__tests__/msw-handlers.test.ts`).
 *
 * This module (and everything it imports: `msw/native` itself, the two
 * polyfills below, `handlers.ts` and, transitively, the shared seed) is only
 * ever reached through the dynamic `import('@/api/msw/server')` in
 * `app/_layout.tsx`, gated behind the `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_USE_MSW`
 * check. A build that never takes that branch never evaluates this file, so a
 * demo pointed at a real API pays no runtime cost for the mock server -- and,
 * since `msw`, `react-native-url-polyfill` and `fast-text-encoding` are all
 * devDependencies (`apps/mobile/package.json`), never depends on them being
 * present either.
 */

// `msw/native` and RN's fetch stack lean on Web APIs Hermes does not ship by
// default. Both polyfills install themselves as a side effect of being
// imported, so order matters: URL/URLSearchParams first (some of msw's own
// interceptor code touches `URL` at module init), then TextEncoder/TextDecoder.
import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';

import { setupServer } from 'msw/native';
import { handlers } from './handlers';

let server: ReturnType<typeof setupServer> | undefined;

/**
 * Starts the mock server exactly once per process. Safe to call more than
 * once -- e.g. `app/_layout.tsx`'s effect re-running on a Fast Refresh -- since
 * a second `setupServer().listen()` on top of an already-listening instance is
 * both wasteful and something `msw` itself warns about; the module-level guard
 * makes repeated calls a no-op instead.
 */
export function startMockServer(): void {
  if (server) {
    return;
  }
  server = setupServer(...handlers);
  server.listen({ onUnhandledRequest: 'bypass' });
}
