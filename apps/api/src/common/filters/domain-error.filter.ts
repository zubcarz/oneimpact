import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain-error';

/**
 * Maps `DomainError` to its HTTP response. Registered globally in `main.ts`
 * (`app.useGlobalFilters(new DomainErrorFilter())`), outside this file's
 * scope.
 *
 * Response body is `{ statusCode, code, message }`. `message` is what
 * `packages/api-client/src/http.ts` reads to build `ApiError` on the client
 * side, so the field name is part of the contract and must not change.
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.status).json({
      statusCode: exception.status,
      code: exception.code,
      message: exception.message,
    });
  }
}
