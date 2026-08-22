import { ZodValidationPipe } from 'nestjs-zod';

/**
 * Global validation pipe for the API. Registered in `main.ts` with
 * `app.useGlobalPipes(new ZodValidationPipe())`, outside this file's scope.
 *
 * Validates any request argument typed with a `createZodDto` DTO
 * (`packages/shared` schemas wrapped by `createZodDto`) against its schema
 * and throws `ZodValidationException` (mapped to 400) on failure. Arguments
 * without a zod DTO pass through untouched.
 */
export { ZodValidationPipe };
