import { createZodDto } from 'nestjs-zod';
import { authResponseSchema, authTokensSchema } from '@oneimpact/shared';

/** Response DTOs for the `auth` controller, from the single `@oneimpact/shared` contract. */
export class AuthResponseDto extends createZodDto(authResponseSchema) {}

export class AuthTokensDto extends createZodDto(authTokensSchema) {}
