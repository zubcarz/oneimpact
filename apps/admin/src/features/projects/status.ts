import { ProjectStatus } from '@oneimpact/shared';
import type { BadgeTone } from '@/components/ui/Badge';

/**
 * How a `ProjectStatus` is shown in the panel: Spanish label and `Badge` tone.
 *
 * It lives in the feature and not in `Badge` so the primitive stays free of the
 * vocabulary of projects, and it lives in a `.ts` module and not inside the
 * table so the mapping can be unit tested without jsdom (decision D5 of the
 * plan).
 *
 * The map is a `Record<ProjectStatus, ...>` on purpose: adding a value to the
 * enum in `packages/shared` breaks the typecheck here instead of silently
 * rendering a status with no label.
 */

export interface ProjectStatusPresentation {
  /** Visible text of the badge, in Spanish. Asserted by the phase 6 spec. */
  label: string;
  tone: BadgeTone;
}

/**
 * Tones follow rule 60: `outline` for something that has not started, `accent`
 * (lime) for what is running right now, `forest` for what is closed. Colour is
 * never the only carrier of meaning -- the label says the same thing in words.
 */
const PRESENTATIONS: Record<ProjectStatus, ProjectStatusPresentation> = {
  [ProjectStatus.PLANNED]: { label: 'Planificado', tone: 'outline' },
  [ProjectStatus.ACTIVE]: { label: 'Activo', tone: 'accent' },
  [ProjectStatus.COMPLETED]: { label: 'Completado', tone: 'forest' },
};

/**
 * Presentation of a status, with a fallback that never throws.
 *
 * The type says the argument is a `ProjectStatus`, but the value comes over the
 * wire: an API deployed with a new status before the panel is rebuilt would hand
 * over a string this map does not know. Showing that raw string in a neutral
 * pill is a readable answer; a crash of the whole table is not.
 */
export function projectStatusPresentation(status: ProjectStatus): ProjectStatusPresentation {
  return PRESENTATIONS[status] ?? { label: status, tone: 'neutral' };
}

/** Convenience for anything that only needs the words (filters, aria labels). */
export function projectStatusLabel(status: ProjectStatus): string {
  return projectStatusPresentation(status).label;
}

/**
 * Options for the status filter, in the lifecycle order of a project rather than
 * alphabetically. Derived from the enum so a new status shows up in the filter
 * without touching this file twice.
 */
export const PROJECT_STATUS_OPTIONS: readonly { value: ProjectStatus; label: string }[] =
  Object.values(ProjectStatus).map((status) => ({
    value: status,
    label: projectStatusLabel(status),
  }));
