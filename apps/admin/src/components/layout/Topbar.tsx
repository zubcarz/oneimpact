import { Button } from '@/components/ui/Button';

/**
 * Top bar of the panel: which account is signed in and how to sign out.
 *
 * It is a Server Component. "Cerrar sesión" is a plain
 * `<form method="post" action="/api/auth/logout">`, and that handler answers a
 * 303 to `/login` (app/api/auth/logout/route.ts), so signing out works with no
 * JavaScript at all -- no `onClick`, no `fetch`, no `'use client'`.
 *
 * The email arrives as a prop instead of being read here with `readSession()`:
 * the layout already read the session to decide whether to render at all, and
 * reading it twice would let the bar show an account that the layout did not
 * approve.
 */
export interface TopbarProps {
  /** Email of the signed in admin, taken from the `email` claim of the JWT. */
  email: string;
}

export function Topbar({ email }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-cream/95 px-5 py-3 backdrop-blur md:px-8 md:py-4">
      {/*
        Only the email is shown: the access token carries `sub`, `email`, `role`
        and `exp` (lib/session.ts), there is no name claim, and inventing one
        would mean a request to the API on every navigation of the shell.
      */}
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Sesión</p>
        <p className="truncate text-sm font-bold text-gray-900">{email}</p>
      </div>

      <form method="post" action="/api/auth/logout">
        <Button type="submit" variant="dark">
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
