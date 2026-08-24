import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectForm } from '@/features/projects/ProjectForm';

/**
 * New project screen.
 *
 * Server Component with nothing to fetch: the only remote data the form needs is
 * the list of zones, and that one is asked for from the browser with `useZones`
 * so the select stays usable while the rest of the page is already painted.
 *
 * The save itself and the navigation back to `/projects` live in `ProjectForm`:
 * it is the piece that knows whether the request succeeded.
 */
export default function NewProjectPage() {
  return (
    <section>
      <PageHeader
        title="Nuevo proyecto"
        description="El identificador del proyecto lo genera la API a partir del título."
      />
      <ProjectForm mode="create" />
    </section>
  );
}
