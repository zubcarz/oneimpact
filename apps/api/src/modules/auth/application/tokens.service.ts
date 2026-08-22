import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthTokens } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

/**
 * Signs and verifies the JWT pair, and hashes/compares refresh tokens for
 * storage (`RefreshToken.tokenHash`). `JwtModule.register({})` (see
 * `auth.module.ts`) leaves the module secret-less on purpose: the secret is
 * always passed per call here, from `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
 * (`env.ts`), so an access token can never verify against the refresh secret
 * or vice versa.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  issuePair(user: { id: string; email: string; role: string }): AuthTokens {
    const accessToken = this.jwt.sign<AccessTokenPayload>(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.accessSecret(), expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = this.jwt.sign<RefreshTokenPayload>(
      { sub: user.id },
      { secret: this.refreshSecret(), expiresIn: REFRESH_TOKEN_TTL },
    );
    return { accessToken, refreshToken };
  }

  /** Throws a 401 `DomainError` for a missing signature, wrong secret or expiry. */
  verifyRefresh(token: string): RefreshTokenPayload {
    try {
      return this.jwt.verify<RefreshTokenPayload>(token, { secret: this.refreshSecret() });
    } catch {
      throw new DomainError('INVALID_REFRESH_TOKEN', 401, 'Sesión inválida o expirada');
    }
  }

  hashToken(token: string): Promise<string> {
    return argon2.hash(token);
  }

  verifyTokenHash(hash: string, token: string): Promise<boolean> {
    return argon2.verify(hash, token).catch(() => false);
  }

  private accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret-change-me');
  }

  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');
  }
}
