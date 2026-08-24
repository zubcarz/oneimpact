/**
 * Spanish copy of the project form: the messages `createProjectSchema` does not
 * carry, and the mapping of an API error to a line the admin can read.
 *
 * Same approach as `@/features/auth/login-messages` and for the same reason:
 * `apps/admin` has no jsdom (decision D5 of the plan), so the branches worth
 * testing live in a `.ts` module and the component is covered by Playwright.
 */

/**
 * Fields of `createProjectSchema` and whether `packages/shared` already writes
 * their message in Spanish, checked against zod 4.4.3:
 *
 * - `title`, `description`, `targetDate` -> yes ('Minimo 3 caracteres',
 *   'Minimo 10 caracteres', 'Fecha invalida').
 * - `zoneSlug` -> yes, through `zoneSlugSchema` ('El slug solo puede contener
 *   minusculas, numeros y guiones').
 * - `summary` -> only a `max`, unreachable from a field with `maxLength`.
 * - `status`, `progress`, `lat`, `lng` -> **no**. Their reachable failure is an
 *   `invalid_type`/`invalid_value`, which zod answers in English ("Invalid
 *   input: expected number, received NaN") and would land on screen as is.
 *
 * A schema-level message wins over the map handed to `parse` in zod 4, so this
 * can only fill in what `shared` left untranslated -- it cannot silence the four
 * messages above, which is exactly the intent: the contract owns the rules and
 * their wording, the panel owns what zod would otherwise say in English.
 */
const FIELD_MESSAGES: Readonly<Record<string, string>> = {
  // Reachable by clearing the field: an empty numeric input read with
  // `valueAsNumber` is NaN, not an empty string.
  progress: 'Introduce un número entero entre 0 y 100.',
  lat: 'Introduce un número válido, por ejemplo -3.4653.',
  lng: 'Introduce un número válido, por ejemplo -62.2159.',
  // Not reachable from the select, which only offers the three valid values. It
  // is here so a value arriving from anywhere else does not print English.
  status: 'Selecciona un estado válido.',
};

const UNKNOWN_FIELD_MESSAGE = 'Revisa este campo.';

/**
 * Shape of a zod issue as far as this mapping cares. Wider than the internal
 * `$ZodRawIssue` on purpose, so the function can be handed to zod as an error
 * map without importing its internals.
 */
export interface ProjectIssue {
  readonly code: string;
  readonly path?: readonly PropertyKey[];
}

/** Localizes the issues of `createProjectSchema` without redefining it. */
export function projectIssueMessage(issue: ProjectIssue): string {
  const field = issue.path?.[0];
  if (typeof field !== 'string') return UNKNOWN_FIELD_MESSAGE;
  return FIELD_MESSAGES[field] ?? UNKNOWN_FIELD_MESSAGE;
}

/** Shown when the API fails with nothing usable to say, and when `fetch` throws. */
export const PROJECT_FALLBACK_ERROR =
  'No se pudo guardar el proyecto. Inténtalo de nuevo en unos segundos.';

/**
 * Turns the error of a failed save into a line for the banner of the form.
 *
 * The API answers a Spanish `message` for its domain errors -- `ZONE_NOT_FOUND`
 * is 'La zona "x" no existe.'
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:37) --
 * so that text is shown as is. What is deliberately not shown is the raw message
 * of anything else: a 500, an HTML page from a proxy or a `TypeError` from
 * `fetch` would leak internals and read as noise, so they collapse into the
 * generic line.
 */
export function projectSaveErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return PROJECT_FALLBACK_ERROR;
  }

  const { status } = error;
  // 4xx are the ones the API explains in words the admin can act on (a zone that
  // does not exist, a body it rejected). 5xx has nothing to teach them.
  if (typeof status !== 'number' || status < 400 || status >= 500) {
    return PROJECT_FALLBACK_ERROR;
  }

  const message = 'message' in error ? error.message : undefined;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return PROJECT_FALLBACK_ERROR;
  }

  return message.trim();
}
