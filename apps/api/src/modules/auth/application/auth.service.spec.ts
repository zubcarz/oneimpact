import { Test } from '@nestjs/testing';
import type { RefreshToken, User } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { AuthUsersRepository } from '../infrastructure/auth-users.repository';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { TokensService } from './tokens.service';
import { AuthService } from './auth.service';

// Real argon2 hashing is ~100-300 ms per call, which would make this whole
// suite slow (register/login/refresh each hash or verify at least once).
// This module-level mock keeps the tests fast while still exercising the
// "does the stored hash match this plaintext" logic AuthService relies on.
jest.mock('argon2', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hashed:${value}`)),
  verify: jest.fn((hash: string, value: string) => Promise.resolve(hash === `hashed:${value}`)),
}));

describe('AuthService', () => {
  const buildUserRow = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: 'hashed:Secret123!',
    name: 'Ana',
    role: 'USER',
    onboardingCompleted: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const buildRefreshTokenRow = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
    id: 'refresh-1',
    userId: 'user-1',
    tokenHash: 'hashed:old-refresh-token',
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    revokedAt: null,
    replacedById: null,
    userAgent: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const setup = async () => {
    const users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    const refreshTokens = {
      create: jest.fn(),
      findActiveByUser: jest.fn(),
      findAnyByUser: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const tokens = {
      issuePair: jest.fn(),
      verifyRefresh: jest.fn(),
      hashToken: jest.fn(),
      verifyTokenHash: jest.fn(),
    };
    const eventBus = { publish: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthUsersRepository,
        RefreshTokenRepository,
        TokensService,
        EventBus,
      ],
    })
      .overrideProvider(AuthUsersRepository)
      .useValue(users)
      .overrideProvider(RefreshTokenRepository)
      .useValue(refreshTokens)
      .overrideProvider(TokensService)
      .useValue(tokens)
      .overrideProvider(EventBus)
      .useValue(eventBus)
      .compile();

    return {
      service: moduleRef.get(AuthService),
      users,
      refreshTokens,
      tokens,
      eventBus,
    };
  };

  describe('register', () => {
    it('creates the user, hashes the password, publishes user.registered and returns { user, tokens }', async () => {
      const { service, users, refreshTokens, tokens, eventBus } = await setup();
      users.findByEmail.mockResolvedValue(null);
      const created = buildUserRow();
      users.create.mockResolvedValue(created);
      tokens.issuePair.mockReturnValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      tokens.hashToken.mockResolvedValue('hashed:refresh-1');
      refreshTokens.create.mockResolvedValue({ id: 'stored-1' });

      const result = await service.register({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'Secret123!',
      });

      expect(users.create).toHaveBeenCalledWith({
        email: 'ana@example.com',
        name: 'Ana',
        passwordHash: 'hashed:Secret123!',
      });
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.USER_REGISTERED,
          payload: { userId: created.id, email: created.email, name: created.name },
        }),
      );
      // the published payload never carries the password or its hash
      const [publishedEvent] = eventBus.publish.mock.calls[0] as [{ payload: object }];
      expect(publishedEvent.payload).not.toHaveProperty('password');
      expect(publishedEvent.payload).not.toHaveProperty('passwordHash');

      expect(result).toEqual({
        user: { id: created.id, email: created.email, name: created.name, role: created.role },
        tokens: { accessToken: 'access-1', refreshToken: 'refresh-1' },
      });
    });

    it('rejects a duplicate email with a 409 DomainError coded EMAIL_TAKEN', async () => {
      const { service, users } = await setup();
      users.findByEmail.mockResolvedValue(buildUserRow());

      await expect(
        service.register({ name: 'Ana', email: 'ana@example.com', password: 'Secret123!' }),
      ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects a wrong password with a 401 DomainError coded INVALID_CREDENTIALS', async () => {
      const { service, users } = await setup();
      users.findByEmail.mockResolvedValue(buildUserRow());

      await expect(
        service.login({ email: 'ana@example.com', password: 'WrongPassword1' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });

    it('rejects a non-existent email with the exact same code and message as a wrong password', async () => {
      const { service, users } = await setup();

      users.findByEmail.mockResolvedValueOnce(null);
      let missingEmailError: DomainError | undefined;
      try {
        await service.login({ email: 'nobody@example.com', password: 'WrongPassword1' });
      } catch (error) {
        missingEmailError = error as DomainError;
      }

      users.findByEmail.mockResolvedValueOnce(buildUserRow());
      let wrongPasswordError: DomainError | undefined;
      try {
        await service.login({ email: 'ana@example.com', password: 'WrongPassword1' });
      } catch (error) {
        wrongPasswordError = error as DomainError;
      }

      if (!missingEmailError || !wrongPasswordError) {
        throw new Error('expected both login attempts to reject');
      }

      expect(missingEmailError).toBeInstanceOf(DomainError);
      expect(wrongPasswordError).toBeInstanceOf(DomainError);
      expect(missingEmailError.code).toBe(wrongPasswordError.code);
      expect(missingEmailError.message).toBe(wrongPasswordError.message);
      expect(missingEmailError.status).toBe(wrongPasswordError.status);
    });

    it('returns { user, tokens } for correct credentials', async () => {
      const { service, users, refreshTokens, tokens } = await setup();
      const row = buildUserRow();
      users.findByEmail.mockResolvedValue(row);
      tokens.issuePair.mockReturnValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      tokens.hashToken.mockResolvedValue('hashed:refresh-1');
      refreshTokens.create.mockResolvedValue({ id: 'stored-1' });

      const result = await service.login({ email: row.email, password: 'Secret123!' });

      expect(result.user).toEqual({ id: row.id, email: row.email, name: row.name, role: row.role });
      expect(result.tokens).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    });
  });

  describe('refresh', () => {
    it('rotates: revokes the presented token, links it to the new one, and returns a new pair', async () => {
      const { service, users, refreshTokens, tokens } = await setup();
      tokens.verifyRefresh.mockReturnValue({ sub: 'user-1' });
      const activeRow = buildRefreshTokenRow();
      refreshTokens.findAnyByUser.mockResolvedValue([activeRow]);
      tokens.verifyTokenHash.mockImplementation((hash: string) =>
        Promise.resolve(hash === activeRow.tokenHash),
      );
      users.findById.mockResolvedValue(buildUserRow());
      tokens.issuePair.mockReturnValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      tokens.hashToken.mockResolvedValue('hashed:refresh-2');
      refreshTokens.create.mockResolvedValue({ id: 'refresh-2-row' });

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      expect(refreshTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', tokenHash: 'hashed:refresh-2' }),
      );
      expect(refreshTokens.revoke).toHaveBeenCalledWith(activeRow.id, 'refresh-2-row');
      expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('revokes the whole chain and throws 401 when the token matches an already revoked row', async () => {
      const { service, refreshTokens, tokens } = await setup();
      tokens.verifyRefresh.mockReturnValue({ sub: 'user-1' });
      const revokedRow = buildRefreshTokenRow({ revokedAt: new Date('2026-01-02T00:00:00.000Z') });
      refreshTokens.findAnyByUser.mockResolvedValue([revokedRow]);
      tokens.verifyTokenHash.mockImplementation((hash: string) =>
        Promise.resolve(hash === revokedRow.tokenHash),
      );

      await expect(service.refresh('old-refresh-token')).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        status: 401,
      });
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });

    it('throws 401 when no stored token matches the presented one', async () => {
      const { service, refreshTokens, tokens } = await setup();
      tokens.verifyRefresh.mockReturnValue({ sub: 'user-1' });
      refreshTokens.findAnyByUser.mockResolvedValue([buildRefreshTokenRow()]);
      tokens.verifyTokenHash.mockResolvedValue(false);

      await expect(service.refresh('unknown-token')).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        status: 401,
      });
    });
  });

  describe('logout', () => {
    it('revokes the matching active token', async () => {
      const { service, refreshTokens, tokens } = await setup();
      tokens.verifyRefresh.mockReturnValue({ sub: 'user-1' });
      const activeRow = buildRefreshTokenRow();
      refreshTokens.findActiveByUser.mockResolvedValue([activeRow]);
      tokens.verifyTokenHash.mockImplementation((hash: string) =>
        Promise.resolve(hash === activeRow.tokenHash),
      );

      await service.logout('old-refresh-token');

      expect(refreshTokens.revoke).toHaveBeenCalledWith(activeRow.id);
    });

    it('is idempotent: an already-invalid token does not throw and revokes nothing', async () => {
      const { service, refreshTokens, tokens } = await setup();
      tokens.verifyRefresh.mockImplementation(() => {
        throw new DomainError('INVALID_REFRESH_TOKEN', 401, 'Sesión inválida o expirada');
      });

      await expect(service.logout('already-invalid')).resolves.toBeUndefined();
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
    });
  });
});
