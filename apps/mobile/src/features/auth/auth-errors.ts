import { ApiError } from '@oneimpact/api-client';

/**
 * Shape of the JSON body `DomainErrorFilter` sends
 * (`apps/api/src/common/filters/domain-error.filter.ts`). Only `code` is
 * trusted for branching -- `message` is server copy that can change without
 * notice.
 */
interface ApiErrorBody {
  code?: string;
  message?: string;
}

function errorBody(error: unknown): ApiErrorBody | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.body as ApiErrorBody | undefined;
}

/** Reads `ApiError.body.code`, the only field the UI is allowed to branch on. */
export function apiErrorCode(error: unknown): string | undefined {
  return errorBody(error)?.code;
}

const GENERIC_ERROR_MESSAGE = 'Ocurrió un error. Inténtalo de nuevo.';

/**
 * Copy en espanol por `code` para los errores de auth conocidos
 * (`30-api-event-driven.md`, "El body de error ... la UI ramifica por
 * code"). Un `code` sin entrada aca cae al mensaje generico, nunca al
 * `message` crudo del servidor.
 */
export const AUTH_ERROR_COPY: Record<string, string> = {
  EMAIL_TAKEN: 'Ese email ya tiene cuenta.',
};

/** Mensaje de banner generico para un error de auth que no tiene copy propio. */
export function authErrorMessage(error: unknown): string {
  const code = apiErrorCode(error);
  if (code && AUTH_ERROR_COPY[code]) {
    return AUTH_ERROR_COPY[code];
  }
  return GENERIC_ERROR_MESSAGE;
}
