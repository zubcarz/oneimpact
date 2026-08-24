import type { Href } from 'expo-router';

/**
 * The login screen ships in a separate, later item of this plan (item 09 --
 * see `.claude/plans/20260822-mobile-data-layer-and-auth.plan.md`). This
 * phase only builds the session mechanism, not the auth screens
 * (`app/(auth)/**` stays empty on purpose).
 *
 * Until `app/(auth)/login.tsx` exists, `.expo/types/router.d.ts` (generated
 * by Metro/`expo export`, see `20-mobile-conventions.md`) has no entry for
 * this path, so `Href` -- strict under `typedRoutes`
 * (`apps/mobile/app.json`) -- cannot verify it. The assertion is isolated to
 * this single helper so every other route reference in `src/auth` stays
 * fully type-checked, and it starts being verified for real the moment that
 * screen lands.
 */
const LOGIN_PATH = '/(auth)/login';

/** Builds the login `Href`, optionally carrying a `returnTo` to redirect back to after `signIn`. */
export function loginHref(returnTo?: string): Href {
  return (returnTo ? { pathname: LOGIN_PATH, params: { returnTo } } : LOGIN_PATH) as Href;
}
