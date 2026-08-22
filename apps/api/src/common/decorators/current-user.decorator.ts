import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

/**
 * Pulls the JWT claims `JwtStrategy.validate()` put on `request.user`. Only
 * usable on a route that passed `JwtAuthGuard` (i.e. not `@Public()`) --
 * on a public route `request.user` is never set.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
