import { ProjectStatus } from '@oneimpact/shared';
import type { Project } from '@oneimpact/shared';

/**
 * Conversions between what the project form holds and what the API contract
 * expects, plus the "only what changed" payload of the edit mode.
 *
 * It is a separate module because it is the part of `ProjectForm` with branches
 * worth testing, and `apps/admin` has no jsdom (decision D5 of the plan): the
 * component is covered by Playwright and this file by Vitest.
 */

/**
 * `<input type="datetime-local">` yields `YYYY-MM-DDTHH:mm`, and
 * `YYYY-MM-DDTHH:mm:ss` when the control has a `step` under a minute. Seconds
 * are accepted so a value typed in such a browser is not silently dropped.
 */
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * TIME ZONE DECISION: the value of `datetime-local` is read as **UTC**, never as
 * the local time of whoever is using the panel.
 *
 * `datetime-local` is, by spec, a wall-clock reading with no offset attached, so
 * somebody has to decide what zone it means. Two facts settle it here:
 *
 * 1. `targetDate` is a milestone on a calendar ("this project closes on
 *    31/12/2026"), not an instant an event happened at. What has to stay stable
 *    is the day, not the moment.
 * 2. The panel already renders that day in UTC (`./dates.ts`, and the same
 *    reasoning behind it). If the form wrote the value as local time, an admin
 *    in UTC+2 typing `31/12/2026 00:00` would send `2026-12-30T22:00:00.000Z`
 *    and the table would answer `30/12/2026`: the date would move by itself,
 *    depending on where the browser is. And it would move back and forth as the
 *    same project is edited from different machines.
 *
 * So the string is turned into an instant by appending `Z`, with no `Date`
 * parsing in between -- `new Date('2026-12-31T00:00')` is exactly the local
 * reading this decision rejects.
 */
export function toIsoDateTime(value: string): string | undefined {
  const match = DATE_TIME_LOCAL_PATTERN.exec(value.trim());
  if (match === null) return undefined;

  const [, year, month, day, hours, minutes, seconds = '00'] = match;

  // The pattern accepts `2026-02-31` and `2026-13-01`: it only counts digits.
  // Building the instant and comparing it back is what rejects a date that does
  // not exist, instead of letting `Date` roll it over to 3 March and storing a
  // day the admin never typed.
  const instant = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
  if (Number.isNaN(instant)) return undefined;

  const iso = new Date(instant).toISOString();
  // `Date.UTC(2026, 1, 31)` silently becomes 3 March, whose ISO no longer starts
  // with the digits that were typed. That mismatch is the rejection.
  const expectedPrefix = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  return iso.startsWith(expectedPrefix) ? iso : undefined;
}

/**
 * The other direction: the ISO instant the API returns, as the value a
 * `datetime-local` input can display (`YYYY-MM-DDTHH:mm`).
 *
 * Read in UTC for the same reason as above, so opening a project for editing and
 * saving it again without touching the field does not move the date.
 *
 * Returns `''` -- not `undefined` -- for a missing or unusable value: it is the
 * `defaultValue` of an uncontrolled input, and `undefined` there would make
 * React treat the field as controlled by the DOM and warn.
 */
export function toDateTimeLocalValue(iso: string | undefined): string {
  if (iso === undefined || iso === '') return '';

  const date = new Date(iso);
  // `new Date('cualquier cosa')` does not throw, it yields an Invalid Date whose
  // getters all return NaN; printing `NaN-NaN-NaNTNaN:NaN` into the field would
  // be worse than an empty one.
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value: number): string => String(value).padStart(2, '0');

  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  );
}

/**
 * Keeps only the fields react-hook-form marked as dirty.
 *
 * `updateProjectSchema` is `.partial()`, so a `PATCH` carrying every field is
 * accepted -- but then the request log of a title fix is indistinguishable from
 * a full rewrite, and any field the panel does not render yet would be echoed
 * back on every save. Sending only what was touched keeps the `PATCH` readable
 * and its blast radius equal to what the admin actually changed.
 *
 * Flat objects only, which is what the project form is. A nested form would need
 * to walk `dirtyFields` recursively, and that generality is not free to test.
 */
export function pickDirtyValues<T extends object>(
  values: T,
  dirtyFields: Partial<Record<keyof T, boolean | undefined>>,
): Partial<T> {
  const dirty: Partial<T> = {};

  for (const key of Object.keys(values) as (keyof T)[]) {
    if (dirtyFields[key] === true) {
      dirty[key] = values[key];
    }
  }

  return dirty;
}

/**
 * What the form holds while it is being filled in: **display** values, every
 * one of them a string, exactly as the DOM controls give them.
 *
 * The alternative -- keeping numbers and ISO instants in form state and
 * converting on the way in with `valueAsNumber`/`setValueAs` -- breaks on the
 * field that matters here: `setValueAs` only runs on change, so a project opened
 * for editing and submitted without touching the date would validate the raw
 * `YYYY-MM-DDTHH:mm` of `defaultValues` and fail with 'Fecha invalida' on a value
 * the admin never typed. Keeping the state in display space and converting once,
 * right before validation, has a single conversion point for both modes.
 */
export interface ProjectFormValues {
  title: string;
  summary: string;
  description: string;
  zoneSlug: string;
  status: ProjectStatus;
  progress: string;
  targetDate: string;
  lat: string;
  lng: string;
}

/**
 * The same values in contract space, which is what `createProjectSchema` and
 * `updateProjectSchema` validate and what travels to the API.
 *
 * `coverKey` is not here: the panel does not manage the cover image yet (that is
 * the upload of phase 5), and `updateProjectSchema` is partial, so leaving the
 * key out is what keeps a save from overwriting a cover set elsewhere.
 */
export interface ProjectPayload {
  title: string;
  summary: string;
  description: string;
  zoneSlug: string;
  status: ProjectStatus;
  progress: number;
  targetDate?: string;
  lat?: number;
  lng?: number;
}

/**
 * An optional numeric field: empty means "not set", anything unparseable stays
 * as `NaN` so zod rejects it.
 *
 * `Number('')` is `0`, not `NaN`, which is the trap this guards: without the
 * empty check, clearing the latitude would quietly store the Equator instead of
 * removing the coordinate.
 */
function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

/** Display values -> contract values. The one place the two spaces meet. */
export function toProjectPayload(values: ProjectFormValues): ProjectPayload {
  const payload: ProjectPayload = {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    zoneSlug: values.zoneSlug,
    status: values.status,
    // Required, so an empty box is an error and not a silent 0: a project whose
    // progress got reset to zero by a blank field would be indistinguishable
    // from one that genuinely has not started.
    progress: values.progress.trim() === '' ? Number.NaN : Number(values.progress),
  };

  // An invalid date is not dropped. `toIsoDateTime` answers `undefined` for both
  // "empty" and "not a date", and an optional field that is missing validates
  // fine -- so passing the raw text through whenever the box is not empty is
  // what makes zod answer 'Fecha invalida' instead of silently discarding what
  // was typed.
  const targetDate = toIsoDateTime(values.targetDate) ?? values.targetDate.trim();
  if (targetDate !== '') payload.targetDate = targetDate;

  const lat = toOptionalNumber(values.lat);
  if (lat !== undefined) payload.lat = lat;

  const lng = toOptionalNumber(values.lng);
  if (lng !== undefined) payload.lng = lng;

  return payload;
}

/** Defaults of the create mode: an empty form with the defaults of the schema. */
export function emptyProjectFormValues(): ProjectFormValues {
  return {
    title: '',
    summary: '',
    description: '',
    // No zone preselected: picking the wrong one by accident is worse than being
    // asked to choose.
    zoneSlug: '',
    // Same defaults `createProjectSchema` applies (packages/shared), so what the
    // admin sees before touching anything is what would be stored.
    status: ProjectStatus.ACTIVE,
    progress: '0',
    targetDate: '',
    lat: '',
    lng: '',
  };
}

/**
 * Defaults of the edit mode: the project as the API returned it, back in display
 * space.
 *
 * `zoneSlug` cannot come from the project itself -- `Project` carries `zoneId`,
 * while the write contract takes `zoneSlug` -- so it is passed in from the
 * `zone` that `GET /v1/projects/:id` includes.
 */
export function projectToFormValues(project: Project, zoneSlug: string): ProjectFormValues {
  return {
    title: project.title,
    summary: project.summary,
    description: project.description,
    zoneSlug,
    status: project.status,
    progress: String(project.progress),
    targetDate: toDateTimeLocalValue(project.targetDate),
    // `String(undefined)` would put the literal "undefined" in the box.
    lat: project.lat === undefined ? '' : String(project.lat),
    lng: project.lng === undefined ? '' : String(project.lng),
  };
}
