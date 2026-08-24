import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginInput, RegisterInput, UserProfile } from '@oneimpact/shared';
import { callApi } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionExpired,
  saveTokens,
} from './token-store';

export type AuthStatus = 'loading' | 'guest' | 'authed';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

// Exported (not just used internally) so `useAuth.ts` -- a separate file per
// the "one file, one responsibility" rule (`10-monorepo-conventions.md`) --
// can read it without this module needing to know about the hook.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Owns the session: a three-state machine (`loading` -> `guest` | `authed`)
 * backed by `expo-secure-store` tokens (`./token-store.ts`) and the server's
 * view of the user (`GET /me`) -- never a role cached on the client.
 *
 * Navigation split: this provider only *computes* status, it never
 * navigates. `useRequireAuth` (used by `app/(app)/_layout.tsx`) is the single
 * place that turns `status === 'guest'` into a `router.replace`, and
 * `app/_layout.tsx` only withholds rendering while `status === 'loading'`.
 * That keeps exactly one layer deciding "where to", so there is no race
 * between two redirects.
 *
 * `signIn`/`signUp` call `callApi` directly rather than going through the
 * `useLogin`/`useRegister` mutation hooks (`src/api/hooks/useAuthMutations.ts`).
 * Those hooks stay independently reusable (their own comment mentions a
 * future "preview before signing in" flow); this provider is infrastructure
 * mounted above the whole app, not a form with its own pending/error UI, so
 * it does not need `useMutation`'s state machine on top of `callApi`'s.
 * Likewise `signOut` reaches for the `queryClient` singleton
 * (`src/api/queryClient.ts`) instead of the `useQueryClient()` hook, so this
 * provider has no dependency on being rendered under `<QueryClientProvider>`
 * for its own logic (the app still wraps one around it for every other
 * screen's data hooks).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);

  // Bootstrap: a token in secure-store is only a *claim*. `GET /me` is what
  // turns it into a real session, and its `role` -- never anything read from
  // storage -- is what the app trusts.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setStatus('guest');
        return;
      }
      try {
        const profile = await callApi((api) => api.me.get());
        if (!cancelled) {
          setUser(profile);
          setStatus('authed');
        }
      } catch {
        // Either the token was invalid and `callApi` (src/api/client.ts)
        // already tried and failed to refresh it -- in which case it has
        // already cleared secure-store and fired `notifySessionExpired` --
        // or this is a plain network error. Either way the only correct
        // outcome here is `guest` with nothing left in secure-store; clearing
        // again in the first case is a harmless no-op.
        await clearTokens();
        if (!cancelled) {
          setUser(null);
          setStatus('guest');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // The interceptor in `src/api/client.ts` calls `notifySessionExpired()`
  // once a 401 survives a refresh attempt, having already cleared
  // secure-store. This subscription is what turns that signal into session
  // state for the rest of the app.
  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setStatus('guest');
    });
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const response = await callApi((api) => api.auth.login(input));
    // Tokens saved *before* `setUser`: a screen gated on
    // `status === 'authed'` can fire a refetch the instant it renders, and
    // that refetch needs `Authorization` already in place.
    await saveTokens(response.tokens);
    setUser(response.user);
    setStatus('authed');
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const response = await callApi((api) => api.auth.register(input));
    await saveTokens(response.tokens);
    setUser(response.user);
    setStatus('authed');
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) {
        await callApi((api) => api.auth.logout({ refreshToken }));
      }
    } catch {
      // Best-effort server-side revocation. Whether or not it succeeds, the
      // client still clears its own session below -- a network error here
      // must never leave the app stuck "signed in" with no way out.
    } finally {
      await clearTokens();
      queryClient.clear();
      setUser(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
