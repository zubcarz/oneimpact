/**
 * Pure helpers of `ProgressBar`, kept apart from the component.
 *
 * `apps/admin` has no jsdom (decision D5 of the plan), so anything with branches
 * lives in a `.ts` module that Vitest can cover; the markup is covered by
 * Playwright.
 */

/**
 * Brings any number the API sends into the 0-100 integer range.
 *
 * `Project.progress` is already `int().min(0).max(100)` in `packages/shared`,
 * but this value also comes from a form in flight and from the optimistic value
 * of a mutation, so the component does not trust it: `aria-valuenow` outside
 * `aria-valuemin`/`aria-valuemax` is an invalid progressbar, and a width of
 * `150%` would push the bar out of its track.
 *
 * `NaN` resolves to 0, which is the only harmless answer: rendering `NaN %` and
 * `aria-valuenow="NaN"` is worse than showing an untouched bar.
 */
export function clampProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Visible text of the bar: number, space, percent sign ("40 %").
 *
 * The space is a plain U+0020 and the format is asserted by `projects.spec` in
 * phase 6, so it is not a free choice: changing it breaks the e2e.
 */
export function formatProgress(value: number): string {
  return `${clampProgress(value)} %`;
}
