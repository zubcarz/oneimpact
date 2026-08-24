import { ApiError } from '@oneimpact/api-client';
import type { ProjectWithUpdates } from '@oneimpact/shared';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonClassName } from '@/components/ui/Button';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { getServerApi } from '@/lib/api-server';

/**
 * Edit screen of a project.
 *
 * Server Component: it loads the project with the token in the httpOnly cookie
 * and hands it to the form as `defaultValues`. The form is the only Client
 * Component of the screen.
 */

interface EditProjectPageProps {
  /**
   * In Next 16 `params` is a `Promise`
   * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md),
   * so it has to be awaited before `id` can be read.
   */
  params: Promise<{ id: string }>;
}

/**
 * `null` means "there is no such project", which the page turns into `notFound()`.
 *
 * A 404 from the API is an id that does not exist -- typed by hand, or a project
 * deleted in another tab -- and the answer is the 404 page, not the error
 * boundary: `error.tsx` talks about something that broke and offers a retry,
 * which would loop forever on an id that will never resolve.
 *
 * A 401 means the cookie died between the proxy check and this render. A Server
 * Component cannot write cookies and therefore cannot refresh the token
 * (decision D2 of the plan), so the answer is the login screen. Anything else is
 * left to propagate to `error.tsx`.
 */
async function loadProject(id: string): Promise<ProjectWithUpdates | null> {
  try {
    return await getServerApi().projects.get(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const project = await loadProject(id);

  // Called in the render path, as the doc requires (`notFound()` works by
  // throwing, so a call left in an un-awaited promise renders nothing).
  if (project === null) notFound();

  return (
    <section>
      <PageHeader
        title="Editar proyecto"
        description={project.title}
        actions={
          // The updates screen arrives in phase 5 of the plan; today this link
          // answers 404, which is expected.
          <Link
            href={`/projects/${project.id}/updates`}
            className={buttonClassName({ variant: 'white' })}
          >
            Avances
          </Link>
        }
      />
      <ProjectForm
        mode="edit"
        project={project}
        // `GET /v1/projects/:id` includes the zone
        // (packages/shared/src/schemas/catalog.ts, `projectWithUpdatesSchema`),
        // which is where `zoneSlug` comes from: the project itself only carries
        // `zoneId` and the write contract takes the slug.
        zone={project.zone ? { slug: project.zone.slug, name: project.zone.name } : undefined}
      />
    </section>
  );
}
