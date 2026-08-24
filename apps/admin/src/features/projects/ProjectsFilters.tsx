'use client';

import type { ProjectsListParams } from '@oneimpact/api-client';
import type { ProjectStatus, Zone } from '@oneimpact/shared';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { parseProjectsFilters, serializeProjectsFilters } from './filters';
import { PROJECT_STATUS_OPTIONS } from './status';

/**
 * Zone and status filters of the projects list.
 *
 * Client Component because it navigates on change; it is the only one of this
 * screen. It keeps **no state of its own**: the selected value comes from the
 * props the page parsed out of the URL, and picking an option pushes a new URL.
 * The URL is the single source of truth, so a filtered list can be shared,
 * bookmarked and reloaded, and there is no second copy of the filters that can
 * drift from the one the table was rendered with.
 */

const ALL_ZONES = 'Todas las zonas';
const ALL_STATUSES = 'Todos los estados';

const ZONE_FIELD_ID = 'filter-zone';
const STATUS_FIELD_ID = 'filter-status';

export interface ProjectsFiltersProps {
  zones: readonly Zone[];
  /** Filters already parsed by the page out of `searchParams`. */
  filters: ProjectsListParams;
}

export function ProjectsFilters({ zones, filters }: ProjectsFiltersProps) {
  const router = useRouter();

  const zoneOptions: SelectOption[] = [
    // The empty value is "no filter": `serializeProjectsFilters` drops it, so
    // choosing it lands on a clean `/projects`.
    { value: '', label: ALL_ZONES },
    ...zones.map((zone) => ({ value: zone.slug, label: zone.name })),
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: ALL_STATUSES },
    ...PROJECT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ];

  function navigate(next: ProjectsListParams): void {
    router.replace(`/projects${serializeProjectsFilters(next)}`);
  }

  function onZoneChange(value: string): void {
    // Round trip through the parser instead of trusting the option: it is the
    // same gate the URL goes through, so an unexpected value cannot enter the
    // query string by this door either.
    navigate(parseProjectsFilters({ zoneSlug: value, status: filters.status }));
  }

  function onStatusChange(value: string): void {
    navigate(parseProjectsFilters({ zoneSlug: filters.zoneSlug, status: value }));
  }

  const zoneValue = filters.zoneSlug ?? '';
  const statusValue: ProjectStatus | '' = filters.status ?? '';

  return (
    <form
      // No submit: every change navigates. The `<form>` is there to group the
      // two controls under one accessible name.
      aria-label="Filtros de proyectos"
      className="mb-6 flex flex-wrap items-end gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="min-w-56 flex-1 sm:max-w-64">
        <Label htmlFor={ZONE_FIELD_ID}>Zona</Label>
        <Select
          id={ZONE_FIELD_ID}
          name="zoneSlug"
          className="mt-1.5"
          options={zoneOptions}
          // `defaultValue` plus a `key` derived from the URL, not `value`: the
          // select is uncontrolled between navigations, so the option the user
          // just picked does not snap back to the old one while the server
          // renders the new list. When the URL does change -- including the back
          // button -- the key changes and the control remounts in sync with it.
          key={`zone-${zoneValue}`}
          defaultValue={zoneValue}
          onChange={(event) => onZoneChange(event.target.value)}
        />
      </div>

      <div className="min-w-56 flex-1 sm:max-w-64">
        <Label htmlFor={STATUS_FIELD_ID}>Estado</Label>
        <Select
          id={STATUS_FIELD_ID}
          name="status"
          className="mt-1.5"
          options={statusOptions}
          key={`status-${statusValue}`}
          defaultValue={statusValue}
          onChange={(event) => onStatusChange(event.target.value)}
        />
      </div>
    </form>
  );
}
