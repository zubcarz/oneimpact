import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from './useAuth';

/**
 * Signing out safely: leave the protected group FIRST, then clear the session.
 *
 * `AuthProvider.signOut` only owns state -- it never navigates, by the same
 * split that keeps `useRequireAuth` the single place that redirects. That makes
 * calling it directly from a screen under `(app)` a trap:
 *
 *   signOut() -> status becomes 'guest' -> the still-mounted `(app)` guard
 *   (`app/(app)/_layout.tsx` -> `useRequireAuth`) does
 *   `router.replace(loginHref(pathname))`
 *
 * ...so "cerrar sesion" lands the user on a login form. And because the guard
 * used `replace`, the entry it came from is gone: the back button on that login
 * screen either has nowhere to return to or returns into `(app)`, which
 * redirects again. Signing out ended in a screen with no exit.
 *
 * Navigating to the public home before flipping the state means the guard has
 * nothing left to protect by the time it could react. This hook exists so that
 * ordering lives in exactly one place -- it was already gotten wrong once by
 * being written out by hand at each call site.
 */
export function useSignOut(): () => void {
  const { signOut } = useAuth();

  return useCallback(() => {
    router.replace('/');
    // Fire-and-forget on purpose: `signOut` swallows its own network failure
    // and always clears the local session, so there is nothing here worth
    // awaiting and nothing a caller could usefully do with a rejection.
    void signOut();
  }, [signOut]);
}
