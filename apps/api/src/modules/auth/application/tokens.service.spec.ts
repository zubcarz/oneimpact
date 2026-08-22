import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DomainError } from '../../../common/errors/domain-error';
import type { AccessTokenPayload, RefreshTokenPayload } from './tokens.service';
import { TokensService } from './tokens.service';

describe('TokensService', () => {
  const ACCESS_SECRET = 'access-secret-for-tests';
  const REFRESH_SECRET = 'refresh-secret-for-tests';

  const buildConfig = (): ConfigService => {
    const values: Record<string, string> = {
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: REFRESH_SECRET,
    };
    return {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    } as unknown as ConfigService;
  };

  const buildService = () => new TokensService(new JwtService(), buildConfig());

  const user = { id: 'user-1', email: 'ana@example.com', role: 'USER' };

  describe('issuePair', () => {
    it('signs access and refresh with different secrets: an access token does not verify with the refresh secret', () => {
      const service = buildService();
      const { accessToken, refreshToken } = service.issuePair(user);

      expect(() => service.verifyRefresh(accessToken)).toThrow(DomainError);
      expect(() => service.verifyRefresh(refreshToken)).not.toThrow();
    });

    it('embeds sub, email and role in the access token payload', () => {
      const service = buildService();
      const { accessToken } = service.issuePair(user);

      const jwt = new JwtService();
      const payload = jwt.verify<AccessTokenPayload>(accessToken, { secret: ACCESS_SECRET });

      expect(payload).toMatchObject({ sub: user.id, email: user.email, role: user.role });
    });

    it('embeds only sub in the refresh token payload', () => {
      const service = buildService();
      const { refreshToken } = service.issuePair(user);

      const jwt = new JwtService();
      const payload = jwt.verify<RefreshTokenPayload>(refreshToken, { secret: REFRESH_SECRET });

      expect(payload).toMatchObject({ sub: user.id });
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('role');
    });
  });

  describe('verifyRefresh', () => {
    it('throws a 401 DomainError for an expired refresh token', () => {
      const service = buildService();
      const jwt = new JwtService();
      const expired = jwt.sign({ sub: user.id }, { secret: REFRESH_SECRET, expiresIn: '-1s' });

      let caught: unknown;
      try {
        service.verifyRefresh(expired);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(DomainError);
      expect((caught as DomainError).status).toBe(401);
    });

    it('throws a 401 DomainError for a token signed with a different secret', () => {
      const service = buildService();
      const jwt = new JwtService();
      const foreign = jwt.sign({ sub: user.id }, { secret: 'not-the-real-secret' });

      expect(() => service.verifyRefresh(foreign)).toThrow(DomainError);
    });
  });

  describe('hashToken / verifyTokenHash', () => {
    it('hashes a token and verifies it back, rejecting a different one', async () => {
      const service = buildService();
      const hash = await service.hashToken('a-refresh-token');

      await expect(service.verifyTokenHash(hash, 'a-refresh-token')).resolves.toBe(true);
      await expect(service.verifyTokenHash(hash, 'not-the-token')).resolves.toBe(false);
    });
  });
});
