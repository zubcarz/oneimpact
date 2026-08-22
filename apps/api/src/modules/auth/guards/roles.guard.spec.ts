import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';
import { RolesGuard } from './roles.guard';

function createReflector(requiredRoles: string[] | undefined): {
  reflector: Reflector;
  getAllAndOverride: jest.Mock;
} {
  const getAllAndOverride = jest.fn().mockReturnValue(requiredRoles);
  return { reflector: { getAllAndOverride } as unknown as Reflector, getAllAndOverride };
}

function createContext(user: AuthenticatedUser | undefined): {
  context: ExecutionContext;
  handler: () => void;
  klass: () => void;
} {
  const handler = () => undefined;
  const klass = () => undefined;
  const context = {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
  return { context, handler, klass };
}

describe('RolesGuard', () => {
  it('lets the request through when the route has no @Roles(...) metadata', () => {
    const { reflector } = createReflector(undefined);
    const { context } = createContext(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets the request through when @Roles(...) is declared with an empty list', () => {
    const { reflector } = createReflector([]);
    const { context } = createContext({ id: 'user-1', email: 'user@example.com', role: 'USER' });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies a USER when the route requires ADMIN', () => {
    const { reflector } = createReflector(['ADMIN']);
    const { context } = createContext({ id: 'user-1', email: 'user@example.com', role: 'USER' });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows an ADMIN when the route requires ADMIN', () => {
    const { reflector } = createReflector(['ADMIN']);
    const { context } = createContext({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies the request when request.user is missing, even if roles are required (critical case)', () => {
    const { reflector } = createReflector(['ADMIN']);
    const { context } = createContext(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('reads ROLES_KEY from both the handler and the class', () => {
    const { reflector, getAllAndOverride } = createReflector(['ADMIN']);
    const { context, handler, klass } = createContext({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    const guard = new RolesGuard(reflector);

    guard.canActivate(context);

    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, klass]);
  });
});
