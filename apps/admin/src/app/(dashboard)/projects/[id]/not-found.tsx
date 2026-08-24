import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonClassName } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * What `notFound()` renders when `GET /v1/projects/:id` answers 404.
 *
 * It is a segment boundary and not the global one for two measured reasons:
 *
 * 1. **Status code.** `loading.tsx` of the `projects` segment puts a Suspense
 *    boundary above this route, so a `notFound()` thrown further down aborts the
 *    server render, React switches that subtree to client rendering and the
 *    response goes out as **200** with the fallback painted in the browser.
 *    Verified with `curl -o /dev/null -w "%{http_code}"` against
 *    `/projects/no-existe`. With this file the boundary sits inside the Suspense
 *    boundary, the not-found UI renders on the server and the answer is a real
 *    404.
 * 2. **Language.** The global fallback of Next says "This page could not be
 *    found" in English and outside the panel. User-facing copy is Spanish.
 */
export default function ProjectNotFound() {
  return (
    <section>
      <PageHeader title="Proyecto no encontrado" />
      <EmptyState
        title="Este proyecto ya no existe"
        description="Puede que se haya eliminado o que la dirección no sea correcta."
        action={
          <Link href="/projects" className={buttonClassName()}>
            Volver a proyectos
          </Link>
        }
      />
    </section>
  );
}
