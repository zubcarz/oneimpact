import { ApiError } from '@oneimpact/api-client';
import type { ProjectsListParams } from '@oneimpact/api-client';
import type { Project, Zone } from '@oneimpact/shared';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectsFilters } from '@/features/projects/ProjectsFilters';
import { ProjectsTable } from '@/features/projects/ProjectsTable';
import { parseProjectsFilters, type RawSearchParams } from '@/features/projects/filters';
import { getServerApi } from '@/lib/api-server';

/**
 * Projects list of the panel.
 *
 * Server Component: it is the only piece of this screen that talks to the API,
 * with the access token read from the httpOnly cookie by `getServerApi()`. The
 * table and the filters below it receive plain props.
 */

interface ProjectsPageProps {
  /**
   * In Next 16 `searchParams` is a `Promise`
   * (`next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`), so
   * it has to be awaited before it can be read.
   */
  searchParams: Promise<RawSearchParams>;
}

interface ProjectsPageData {
  zones: Zone[];
  projects: Project[];
}

/**
 * Both lists in parallel: they are independent and the zones are needed to turn
 * `project.zoneId` into a name, so waiting for one before asking for the other
 * would double the latency of the screen for nothing.
 *
 * A 401 means the cookie died between the proxy check and this render. A Server
 * Component cannot write cookies, so it cannot refresh the token either
 * (decision D2 of the plan): the answer is the login screen. Anything else --
 * the API down, a 500 -- is left to propagate so `error.tsx` handles it.
 */
async function loadProjectsPage(
  filters: ProjectsListParams,
): Promise<ProjectsPageData> {
  const api = getServerApi();

  try {
    const [zones, projects] = await Promise.all([api.zones.list(), api.projects.list(filters)]);
    return { zones: zones.items, projects: projects.items };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const filters = parseProjectsFilters(await searchParams);
  const { zones, projects } = await loadProjectsPage(filters);

  const hasActiveFilters = filters.zoneSlug !== undefined || filters.status !== undefined;

  return (
    <section>
      <PageHeader
        title="Proyectos"
        description="Estado y progreso de los proyectos de restauración. Filtra por zona o por estado."
      />
      <ProjectsFilters zones={zones} filters={filters} />
      <ProjectsTable projects={projects} zones={zones} hasActiveFilters={hasActiveFilters} />
    </section>
  );
}
