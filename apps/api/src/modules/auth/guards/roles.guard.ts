import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@oneimpact/shared';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Registered globally as the SECOND `APP_GUARD` in `auth.module.ts`, right
 * after `JwtAuthGuard`. Provider order in a Nest module determines guard
 * execution order, so `JwtAuthGuard` (and, for `@Public()` routes, nothing at
 * all) always runs first and either populates `request.user` or short
 * circuits the request. Registering this guard before `JwtAuthGuard` would
 * mean `request.user` does not exist yet when this guard reads it.
 *
 * No `@Roles(...)` on the route/controller -> open to any authenticated user
 * (the `@Public()` case never reaches here with meaningful `request.user`
 * data, but this guard does not special-case it: it only cares about roles).
 *
 * CRITICAL CASE: if `request.user` is missing, this guard returns `false`
 * (403), never `true`. A route without a role check would otherwise be an
 * accidental privilege escalation for an unauthenticated caller if it were
 * ever misconfigured with `@Roles(...)` but no auth in front of it.
 */
@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithOptionalUser>();
    if (!request.user) {
      return false;
    }

    return requiredRoles.includes(request.user.role);
  }
}
