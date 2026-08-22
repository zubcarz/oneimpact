import { createZodDto } from 'nestjs-zod';
import { listResponseSchema, userProfileSchema } from '@oneimpact/shared';

/**
 * Response DTOs for `GET /v1/me` and `GET /v1/admin/users`, from the single
 * `@oneimpact/shared` contract (`userProfileSchema`). Never redeclare fields
 * here.
 */
export class UserProfileDto extends createZodDto(userProfileSchema) {}

export class UserProfileListDto extends createZodDto(listResponseSchema(userProfileSchema)) {}
