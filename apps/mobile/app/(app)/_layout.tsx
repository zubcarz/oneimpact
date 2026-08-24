import { Stack, usePathname } from 'expo-router';
import { useRequireAuth } from '@/auth';

/**
 * Guard for every screen under `(app)`. This is the "decide the destination"
 * half of the auth navigation split: `useRequireAuth` is the only place that
 * calls `router.replace` for a guest (see its own comment for why), so the
 * root layout (`app/_layout.tsx`) only ever blocks rendering while the
 * session is bootstrapping -- it never redirects. That split is what keeps
 * this guard and the root layout from racing each other into a navigation
 * loop.
 *
 * `(tabs)` has no guard of its own, so a signed-in user is never expelled
 * from the public screens (`arquitectura-mobile.md:40`).
 */
export default function AppGroupLayout() {
  const pathname = usePathname();
  const status = useRequireAuth(pathname);

  // `status` is only ever `'loading'` during the very first bootstrap, which
  // the root layout already blocks on before this layout can mount. It shows
  // up here as `'guest'` while `useRequireAuth`'s effect is redirecting away
  // -- render nothing rather than flash protected content in that window.
  if (status !== 'authed') {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
