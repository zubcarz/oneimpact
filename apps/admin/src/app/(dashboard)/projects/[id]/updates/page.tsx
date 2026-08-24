import { ApiError } from '@oneimpact/api-client';
import type { ProjectWithUpdates } from '@oneimpact/shared';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonClassName } from '@/components/ui/Button';
import { PublishUpdateForm } from '@/features/projects/PublishUpdateForm';
import { UpdatesList } from '@/features/projects/UpdatesList';
import { getServerApi } from '@/lib/api-server';

/**
 * Updates of a project: the publish form and the list of what is already out.
 *
 * Server Component. `GET /v1/projects/:id` answers `ProjectWithUpdates`
 * (packages/shared/src/schemas/catalog.ts, `projectWithUpdatesSchema`), so the
 * updates arrive with the project and no second request is needed -- and they
 * arrive already ordered by `publishedAt` descending
 * (apps/api/src/modules/projects/infrastructure/projects.repository.ts:84).
 */

interface ProjectUpdatesPageProps {
  /**
   * In Next 16 `params` is a `Promise`
   * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md),
   * so it has to be awaited before `id` can be read.
   */
  params: Promise<{ id: string }>;
}

/**
 * `null` means "there is no such project", which the page turns into
 * `notFound()`. Same handling as the edit screen and for the same reasons: a 404
 * is an id that will never resolve, so the retry of `error.tsx` would loop; a
 * 401 is a dead cookie, and a Server Component cannot refresh it (decision D2 of
 * the plan).
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

export default async function ProjectUpdatesPage({ params }: ProjectUpdatesPageProps) {
  const { id } = await params;
  const project = await loadProject(id);

  // Called in the render path: `notFound()` works by throwing.
  if (project === null) notFound();

  return (
    <section>
      <PageHeader
        title="Avances del proyecto"
        description={project.title}
        actions={
          <Link href={`/projects/${project.id}`} className={buttonClassName({ variant: 'white' })}>
            Volver al proyecto
          </Link>
        }
      />

      <div className="flex flex-col gap-8">
        <PublishUpdateForm projectId={project.id} projectProgress={project.progress} />

        <div className="max-w-3xl">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Avances publicados</h2>
          <UpdatesList updates={project.updates} />
        </div>
      </div>
    </section>
  );
}
