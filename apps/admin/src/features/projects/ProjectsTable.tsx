import type { Project, Zone } from '@oneimpact/shared';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { formatTargetDate } from './dates';
import { projectStatusPresentation } from './status';

/**
 * Projects table of the panel.
 *
 * Presentational on purpose: it receives projects and zones as props and calls
 * no data hook. The page is the one that talks to the API, which keeps this
 * component a Server Component with zero JavaScript shipped to the browser.
 *
 * There is no "last update" column even though the spec of the item mentions
 * one: `GET /v1/projects` answers `Project` **without** `updates`
 * (`packages/shared/src/schemas/catalog.ts`), so filling it would mean one extra
 * request per row. `targetDate` takes its place and the updates live in their
 * own screen.
 */

export interface ProjectsTableProps {
  projects: readonly Project[];
  /** Full list of zones, used to turn `project.zoneId` into a readable name. */
  zones: readonly Zone[];
  /**
   * Whether the current URL carries a filter. It changes only the empty state:
   * "there is nothing yet" and "your filter matched nothing" need different
   * next steps.
   */
  hasActiveFilters: boolean;
}

const LINK_CLASS =
  'inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-dark-green ' +
  'underline underline-offset-4 transition-colors hover:bg-cream ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green';

export function ProjectsTable({ projects, zones, hasActiveFilters }: ProjectsTableProps) {
  if (projects.length === 0) {
    return hasActiveFilters ? (
      <EmptyState
        title="Ningún proyecto coincide con el filtro"
        description="Prueba con otra zona o con otro estado para ver más resultados."
      />
    ) : (
      <EmptyState
        title="Todavía no hay proyectos"
        description="Cuando se cree el primer proyecto aparecerá en esta tabla."
      />
    );
  }

  // `GET /v1/projects` returns `zoneId`, never the name of the zone, so the
  // crossing happens here with the list the page already had to fetch.
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));

  return (
    <Table caption="Proyectos de One Impact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Título</TableHeaderCell>
          <TableHeaderCell>Zona</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell className="w-56">Progreso</TableHeaderCell>
          <TableHeaderCell>Fecha objetivo</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {projects.map((project) => {
          const status = projectStatusPresentation(project.status);
          // A zone missing from the crossing (deleted, or a list that arrived
          // truncated) shows its id: unhelpful, but it identifies the row and
          // does not take the table down.
          const zoneName = zoneNameById.get(project.zoneId) ?? project.zoneId;

          return (
            <TableRow key={project.id}>
              {/*
                The title is a plain cell and not a `TableHeaderCell scope="row"`,
                which would be the richer semantics: that primitive styles itself
                as a column header (uppercase, xs, tracking-wide) and `cn` only
                concatenates -- it does not resolve Tailwind conflicts, so the
                override would depend on the order of the generated stylesheet.
                The table already exposes a caption and column headers.
              */}
              <TableCell>
                <span className="font-bold text-gray-900">{project.title}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-gray-700">{zoneName}</TableCell>
              <TableCell>
                <Badge tone={status.tone}>{status.label}</Badge>
              </TableCell>
              <TableCell>
                {/*
                  The accessible name carries the title of the project: five bars
                  called "Progreso" would be indistinguishable for a screen
                  reader and ambiguous for `getByRole('progressbar', { name })`.
                */}
                <ProgressBar value={project.progress} label={`Progreso de ${project.title}`} />
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-gray-700">
                {formatTargetDate(project.targetDate)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  {/*
                    Both destinations arrive in phases 4 and 5 of the plan; today
                    they answer 404. Same reason as above for the `aria-label`:
                    the visible word is repeated once per row, so the accessible
                    name adds the title (WCAG 2.5.3 holds -- it starts with the
                    visible text).
                  */}
                  <Link
                    href={`/projects/${project.id}`}
                    aria-label={`Editar ${project.title}`}
                    className={LINK_CLASS}
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/projects/${project.id}/updates`}
                    aria-label={`Avances de ${project.title}`}
                    className={LINK_CLASS}
                  >
                    Avances
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
