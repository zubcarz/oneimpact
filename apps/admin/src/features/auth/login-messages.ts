/**
 * Spanish copy and message mapping for the login form.
 *
 * It lives apart from `LoginForm` because it is the only part of the form with
 * branches worth testing: `apps/admin` has no jsdom (decision D5 of the plan),
 * so the component itself is covered by Playwright and this module by Vitest.
 */

/** Shown when the response carries no usable message, and when `fetch` throws. */
export const LOGIN_FALLBACK_ERROR =
  'No se pudo iniciar sesión. Inténtalo de nuevo en unos segundos.';

/**
 * Message to show under the form after a failed request.
 *
 * The handler in `src/app/api/auth/login/route.ts` already answers a Spanish
 * `{ message }` for every status it maps (401, 429, 502), so the body is used as
 * is. Anything else -- an empty body, HTML from a proxy, a non-string `message`
 * -- falls back to the generic line instead of printing a foreign payload to the
 * admin.
 */
export function loginErrorMessage(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return LOGIN_FALLBACK_ERROR;
  }

  const { message } = body;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return LOGIN_FALLBACK_ERROR;
  }

  return message.trim();
}

/**
 * Shape of a zod issue as far as this mapping cares. It is intentionally wider
 * than `$ZodRawIssue` so the function can be handed to zod as an error map
 * without importing its internal types.
 */
export interface LoginIssue {
  readonly code: string;
  readonly path?: readonly PropertyKey[];
}

const FIELD_MESSAGES: Readonly<Record<string, string>> = {
  email: 'Introduce un correo electrónico válido.',
  password: 'Introduce tu contraseña.',
};

const UNKNOWN_FIELD_MESSAGE = 'Revisa los datos del formulario.';

/**
 * Localizes the validation errors of `loginSchema` without redefining it.
 *
 * `loginSchema` (packages/shared) used to declare `email()` and `min(1)` with no
 * custom message, so zod answered its English defaults ("Invalid email address",
 * "Too small: expected string to have >=1 characters") and they ended up on
 * screen. Duplicating the schema in the admin to translate it is forbidden by
 * the contract rule, so this went in as a per-parse error map. Since the item 09
 * merge `shared` carries Spanish messages for both fields, and they win; the map
 * remains as the guard for any field `shared` leaves untranslated.
 *
 * It cannot silence a message written in `shared`: in zod 4 a schema-level
 * message wins over the map passed to `parse`, verified against zod 4.4.3. So
 * this only fills in what `shared` left untranslated.
 */
export function loginIssueMessage(issue: LoginIssue): string {
  const field = issue.path?.[0];
  if (typeof field !== 'string') {
    return UNKNOWN_FIELD_MESSAGE;
  }
  return FIELD_MESSAGES[field] ?? UNKNOWN_FIELD_MESSAGE;
}
