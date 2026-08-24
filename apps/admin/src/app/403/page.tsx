import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { readSession } from '@/lib/session';

/**
 * Screen shown to a session that is valid but is not `ADMIN`.
 *
 * It is reached through `NextResponse.rewrite(FORBIDDEN_PATH)` from
 * `src/proxy.ts`, so the URL the visitor typed stays in the address bar and a
 * reload with the right account lands where they were going.
 *
 * **HTTP status**: the response carries `200`, not `403`. In the App Router a
 * page does not control its status code; the supported way is `forbidden()` from
 * `next/navigation`, which is experimental and requires
 * `experimental.authInterrupts` in `next.config.ts`
 * (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md:17).
 * That file is out of the write scope of this task, so the gap is left
 * documented instead of patched. It has no security impact: the authorization
 * that counts is the one in the API, which does answer `403`.
 *
 * Rendering is dynamic because of `readSession()` -> `cookies()`, which is what
 * we want: this page must never be served from a static shell with the email of
 * whoever hit it first.
 */

export const metadata: Metadata = {
  title: 'Acceso restringido · One Impact',
  robots: { index: false, follow: false },
};

export default async function ForbiddenPage() {
  // Reached by rewrite, so the request still carries the cookies of the visitor
  // and `cookies()` resolves normally. It returns `null` for anyone landing on
  // /403 without a session (the route is open in the guard), and in that case
  // the account line is simply not rendered.
  const session = await readSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          Acceso restringido
        </p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Esta cuenta no puede entrar al panel
        </h1>
        <p className="mt-4 text-sm text-gray-600">
          Tu sesión es válida, pero no tiene permisos de administrador. El panel de One Impact solo
          está disponible para cuentas con rol de administrador.
        </p>
        {session !== null ? (
          <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-gray-700">
            Sesión iniciada como <span className="font-bold text-gray-900">{session.email}</span>
          </p>
        ) : null}
        <p className="mt-4 text-sm text-gray-600">
          Cierra la sesión e ingresa con una cuenta de administrador, o pide que le asignen el rol a
          esta cuenta.
        </p>
        {/*
          A plain form, not an `onClick`: `/api/auth/logout` is a POST that
          answers a 303 redirect to /login, so the browser follows it with a GET
          on its own. This keeps the page a Server Component and makes the exit
          work with JavaScript disabled.
        */}
        <form action="/api/auth/logout" method="post" className="mt-8">
          <Button type="submit" variant="dark" fullWidth>
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
