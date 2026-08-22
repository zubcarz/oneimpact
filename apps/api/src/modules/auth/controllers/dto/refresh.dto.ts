import { createZodDto } from 'nestjs-zod';
import { refreshTokenSchema } from '@oneimpact/shared';

/**
 * Request DTO shared by `POST /v1/auth/refresh` and `POST /v1/auth/logout`:
 * both take the single `{ refreshToken }` shape from `@oneimpact/shared`.
 */
export class RefreshDto extends createZodDto(refreshTokenSchema) {}
