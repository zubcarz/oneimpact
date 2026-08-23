import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * `@nestjs/passport`'s `AuthGuard('jwt')` runs real passport-jwt
 * authentication (parsing the `Authorization` header, verifying the
 * signature) -- exercising that end to end belongs to the e2e suite. This
 * unit only needs to prove `JwtAuthGuard.canActivate` delegates to it for a
 * non-public route, so the mixin is replaced with a spyable stub whose
 * `canActivate` lives on the prototype (so `super.canActivate(...)` resolves
 * to it, the same way it resolves to the real passport implementation).
 *
 * This project runs Jest through `ts-jest`, not `babel-jest`, so `jest.mock`
 * calls are NOT auto-hoisted above imports the way they are under Babel:
 * the mock must be declared, textually, before the `import` that pulls in
 * `./jwt-auth.guard` (which is what actually requires `@nestjs/passport`).
 */
const mockCanActivate = jest.fn<boolean, [ExecutionContext]>();
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate(context: ExecutionContext): boolean {
        return mockCanActivate(context);
      }
    },
}));

import { JwtAuthGuard } from './jwt-auth.guard';

function createReflector(isPublic: boolean | undefined): {
  reflector: Reflector;
  getAllAndOverride: jest.Mock;
} {
  const getAllAndOverride = jest.fn().mockReturnValue(isPublic);
  return { reflector: { getAllAndOverride } as unknown as Reflector, getAllAndOverride };
}

function createContext(): { context: ExecutionContext; handler: () => void; klass: () => void } {
  const handler = () => undefined;
  const klass = () => undefined;
  const context = {
    getHandler: () => handler,
    getClass: () => klass,
  } as unknown as ExecutionContext;
  return { context, handler, klass };
}

describe('JwtAuthGuard', () => {
  beforeEach(() => {
    mockCanActivate.mockReset();
  });

  it('lets the request through without calling passport when the route is @Public()', () => {
    const { reflector } = createReflector(true);
    const { context } = createContext();
    const guard = new JwtAuthGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
    expect(mockCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the passport AuthGuard when the route has no @Public() metadata', () => {
    const { reflector } = createReflector(false);
    const { context } = createContext();
    mockCanActivate.mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockCanActivate).toHaveBeenCalledWith(context);
  });

  it('reads IS_PUBLIC_KEY from both the handler and the class', () => {
    const { reflector, getAllAndOverride } = createReflector(true);
    const { context, handler, klass } = createContext();
    const guard = new JwtAuthGuard(reflector);

    void guard.canActivate(context);

    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, klass]);
  });
});
