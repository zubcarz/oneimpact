import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * Registered globally as `APP_GUARD` (`auth.module.ts`), so this is the
 * default for every route in the app: no `@Public()`, no access.
 *
 * `@Public()` reads through `Reflector.getAllAndOverride` on both the handler
 * and the class, so a controller-level `@Public()` opens every method and a
 * method-level one can open a single route on an otherwise guarded
 * controller.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
