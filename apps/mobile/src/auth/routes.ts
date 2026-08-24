import type { Href } from 'expo-router';

/**
 * `app/(auth)/login.tsx` landed in the mobile-register-payment-welcome plan
 * (Fase 4): this is the path referenced below. The previous version of this
 * comment isolated an `as Href` cast here because the screen did not exist
 * yet and `typedRoutes` (`apps/mobile/app.json`) could not verify it. The
 * cast is gone now that the screen is real.
 */
const LOGIN_PATH = '/(auth)/login';

/** Builds the login `Href`, optionally carrying a `returnTo` to redirect back to after `signIn`. */
export function loginHref(returnTo?: string): Href {
  return returnTo ? { pathname: LOGIN_PATH, params: { returnTo } } : LOGIN_PATH;
}
