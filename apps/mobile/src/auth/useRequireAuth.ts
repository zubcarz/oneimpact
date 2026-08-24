import { useEffect } from 'react';
import { router } from 'expo-router';
import type { AuthStatus } from './AuthProvider';
import { useAuth } from './useAuth';
import { loginHref } from './routes';

/**
 * Guards a screen or action that needs a signed-in user. `returnTo` is the
 * path to send the user back to once they log in; it travels as a query
 * param so the login screen (item 09) can read it after `signIn` resolves.
 *
 * This hook is the "decide the destination" half of the auth navigation
 * split (see `app/(app)/_layout.tsx`, its main caller, and `AuthProvider`'s
 * own comment): it is the only place that calls `router.replace` for a
 * guest. Callers just read the returned status and render accordingly; they
 * never navigate themselves, which is what keeps this and the root layout's
 * loading gate from racing into a navigation loop.
 */
export function useRequireAuth(returnTo?: string): AuthStatus {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'guest') {
      router.replace(loginHref(returnTo));
    }
  }, [status, returnTo]);

  return status;
}
