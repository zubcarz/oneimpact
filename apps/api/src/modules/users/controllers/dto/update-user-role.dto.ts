import { createZodDto } from 'nestjs-zod';
import { updateUserRoleSchema } from '@oneimpact/shared';

/** Request DTO for `PATCH /v1/admin/users/:id/role`, ADMIN only (see `AdminUsersController`). */
export class UpdateUserRoleDto extends createZodDto(updateUserRoleSchema) {}
