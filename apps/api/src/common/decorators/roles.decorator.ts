import { SetMetadata } from '@nestjs/common';
import type { Role } from '@oneimpact/shared';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route/controller to one or more roles.
 *
 * `RolesGuard` (module `auth`, registered globally as the second `APP_GUARD`
 * right after `JwtAuthGuard`) reads this metadata with
 * `Reflector.getAllAndOverride` (handler and class) and compares it against
 * `request.user.role`, put there by `JwtAuthGuard`/`JwtStrategy`. A route
 * with no `@Roles(...)` at all is left open to any authenticated user (the
 * default); `@Public()` routes never reach `RolesGuard` with a `request.user`
 * to check in the first place.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
