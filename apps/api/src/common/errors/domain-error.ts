/**
 * Typed error for domain/application failures.
 *
 * Use cases MUST throw `DomainError` (or a factory below), never
 * `HttpException` and never a bare `throw new Error(...)`. `DomainErrorFilter`
 * (`src/common/filters/domain-error.filter.ts`) is the only place that knows
 * how to turn this into an HTTP response.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static notFound(code: string, message: string): DomainError {
    return new DomainError(code, 404, message);
  }
}
