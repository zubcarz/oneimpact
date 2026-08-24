'use client';

import { Button } from '@/components/ui/Button';

/**
 * Error boundary of the projects list. Next requires it to be a Client
 * Component: it has to attach the `reset` handler in the browser.
 *
 * The message of the error is **not** rendered. It comes from the API and can
 * carry paths, ids or details of the failure that have no place on the screen of
 * a panel; what the admin needs is a next step, and that is the retry button.
 * `digest` is a hash Next generates for the server log, so it is safe to show
 * and it is what makes a report traceable.
 */
export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-black text-gray-900">No pudimos cargar los proyectos</h1>
      <p className="max-w-prose text-sm text-gray-600">
        Hubo un problema al consultar la API. Vuelve a intentarlo; si el problema continúa, revisa
        que el servicio esté disponible.
      </p>
      {error.digest ? (
        <p className="text-xs text-gray-500">Código de referencia: {error.digest}</p>
      ) : null}
      <Button variant="dark" className="mt-2" onClick={reset}>
        Reintentar
      </Button>
    </section>
  );
}
