import { useEffect } from 'react';
import { router } from 'expo-router';
import type { Role } from '@oneimpact/shared';
import { useAuth } from './useAuth';
import { loginHref } from './routes';

/**
 * Guards a screen or action that needs a specific role (e.g. `admin`,
 * `useRequireRole('ADMIN')`). Returns whether the current user has access;
 * the role it checks always comes from `useAuth().user`, which itself only
 * ever comes from `GET /me` (`AuthProvider`) -- never a locally-cached or
 * client-writable value.
 */
export function useRequireRole(role: Role, returnTo?: string): boolean {
  const { status, user } = useAuth();
  const hasAccess = status === 'authed' && user?.role === role;

  useEffect(() => {
    if (status === 'guest') {
      router.replace(loginHref(returnTo));
      return;
    }
    if (status === 'authed' && user && user.role !== role) {
      // Signed in, just the wrong role: no need to re-authenticate, send
      // back to the public home instead of the login screen.
      router.replace('/(tabs)');
    }
  }, [status, user, role, returnTo]);

  return hasAccess;
}
