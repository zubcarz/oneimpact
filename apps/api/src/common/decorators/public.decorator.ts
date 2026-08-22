import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route/controller as not requiring authentication.
 *
 * `JwtAuthGuard` (module `auth`) is registered globally via `APP_GUARD`, so
 * every route is protected by default. This decorator is the only opt-out:
 * `JwtAuthGuard.canActivate` reads this metadata with
 * `Reflector.getAllAndOverride` (handler and class) and skips the JWT check
 * for anything marked `@Public()`.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
