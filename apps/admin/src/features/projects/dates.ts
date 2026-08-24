/**
 * Target date of a project, as the table shows it.
 *
 * Written by hand instead of `toLocaleDateString('es-ES')` for two reasons that
 * both end in a flaky Playwright assertion:
 *
 * 1. `Intl` depends on the ICU data of the runtime. A Node built with
 *    `small-icu` only knows `en-US` and silently falls back to it, so the same
 *    row renders `31/12/2026` on one machine and `12/31/2026` on another.
 * 2. Without pinning the time zone, an ISO instant at `00:00Z` shows up as the
 *    previous day west of Greenwich. The date the admin typed would move on its
 *    own depending on where the browser -- or the CI runner -- is.
 *
 * So the value is read in UTC, which is the zone the API stores and returns
 * (`targetDate` is `z.iso.datetime()` in `packages/shared`), and formatted as
 * `dd/mm/yyyy`, the Spanish convention.
 */

/** Shown when a project has no target date, and when the value is unusable. */
export const NO_TARGET_DATE = 'Sin fecha';

export function formatTargetDate(iso: string | undefined): string {
  if (iso === undefined || iso === '') return NO_TARGET_DATE;

  const date = new Date(iso);
  // `new Date('lo que sea')` does not throw, it yields an Invalid Date whose
  // getters all return NaN. Rendering `NaN/NaN/NaN` in the table would be worse
  // than admitting the panel has no usable date.
  if (Number.isNaN(date.getTime())) return NO_TARGET_DATE;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${day}/${month}/${date.getUTCFullYear()}`;
}
