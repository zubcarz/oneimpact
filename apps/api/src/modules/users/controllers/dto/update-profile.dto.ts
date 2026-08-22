import { createZodDto } from 'nestjs-zod';
import { updateProfileSchema } from '@oneimpact/shared';

/**
 * Request DTO for `PATCH /v1/me`. `updateProfileSchema` is `.strict()`: a
 * `role` field in the body fails validation (400) instead of being silently
 * dropped -- `role` is never editable by the user themselves.
 */
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
