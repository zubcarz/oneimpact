import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route/controller as not requiring authentication.
 *
 * There is no global auth guard yet, so this decorator has no effect today:
 * every route is reachable regardless of `@Public()`. It exists so that the
 * upcoming `JwtAuthGuard` (module `auth`, roadmap item 05) can invert the
 * default -- guard everything, then read this metadata to open the routes
 * marked `@Public()` -- without touching every controller again.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
