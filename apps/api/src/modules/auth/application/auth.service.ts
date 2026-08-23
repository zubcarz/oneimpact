import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type {
  AuthResponse,
  AuthTokens,
  LoginInput,
  RegisterInput,
  UserProfile,
} from '@oneimpact/shared';
import type { RefreshToken, User } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { AuthUsersRepository } from '../infrastructure/auth-users.repository';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { TokensService } from './tokens.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos';
const INVALID_REFRESH_MESSAGE = 'Sesión inválida o expirada';

/**
 * Password nobody knows, hashed once and reused for every login attempt
 * against a non-existent email (see `login()`). Its only purpose is to make
 * `argon2.verify` run with the same cost whether the email exists or not, so
 * the response time never leaks which case it was.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('one-impact-login-timing-decoy-never-a-real-password');
  return dummyHashPromise;
}

function toUserProfile(user: User): UserProfile {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Registration, login and refresh rotation. No log statement in this file
 * ever prints a password, a token or a hash (see `30-api-event-driven.md`,
 * "Observabilidad y seguridad").
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: AuthUsersRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokensService,
    private readonly eventBus: EventBus,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new DomainError('EMAIL_TAKEN', 409, 'Ese email ya está registrado');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    await this.eventBus.publish({
      type: EventName.USER_REGISTERED,
      occurredAt: new Date(),
      payload: { userId: user.id, email: user.email, name: user.name },
    });

    const tokens = await this.issueAndPersist(user);
    return { user: toUserProfile(user), tokens };
  }

  /**
   * INVARIANT: a non-existent email and a wrong password return the exact
   * same `code` and `message`. Splitting them (e.g. `USER_NOT_FOUND` vs
   * `WRONG_PASSWORD`) would let an attacker enumerate registered emails.
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      // Burn the same argon2 cost a real login would pay, against a dummy
      // hash, so this branch takes as long as the "wrong password" branch
      // below and the response time does not leak whether the email exists.
      await argon2.verify(await getDummyHash(), input.password).catch(() => false);
      throw new DomainError('INVALID_CREDENTIALS', 401, INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await argon2
      .verify(user.passwordHash, input.password)
      .catch(() => false);
    if (!passwordMatches) {
      throw new DomainError('INVALID_CREDENTIALS', 401, INVALID_CREDENTIALS_MESSAGE);
    }

    const tokens = await this.issueAndPersist(user);
    return { user: toUserProfile(user), tokens };
  }

  async refresh(token: string): Promise<AuthTokens> {
    const { sub: userId } = this.tokens.verifyRefresh(token);

    const candidates = await this.refreshTokens.findAnyByUser(userId);
    const matched = await this.findMatchingToken(candidates, token);
    if (!matched) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 401, INVALID_REFRESH_MESSAGE);
    }

    if (matched.revokedAt || matched.expiresAt < new Date()) {
      // The presented token verifies against a hash that is already revoked
      // (rotated away) or expired: it cannot be an honest retry, because a
      // legitimate client always uses the newest pair. Treat it as a
      // possibly stolen token and revoke the whole chain for this user,
      // forcing a fresh login -- the standard response to refresh-token reuse.
      await this.refreshTokens.revokeAllForUser(userId);
      throw new DomainError('INVALID_REFRESH_TOKEN', 401, INVALID_REFRESH_MESSAGE);
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 401, INVALID_REFRESH_MESSAGE);
    }

    const newTokens = this.tokens.issuePair(user);
    const newHash = await this.tokens.hashToken(newTokens.refreshToken);
    const created = await this.refreshTokens.create({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    await this.refreshTokens.revoke(matched.id, created.id);

    return newTokens;
  }

  /** Idempotent: logging out twice (or with an already-invalid token) never throws. */
  async logout(token: string): Promise<void> {
    let payload: { sub: string };
    try {
      payload = this.tokens.verifyRefresh(token);
    } catch {
      return;
    }

    const candidates = await this.refreshTokens.findActiveByUser(payload.sub);
    const matched = await this.findMatchingToken(candidates, token);
    if (matched) {
      await this.refreshTokens.revoke(matched.id);
    }
  }

  private async issueAndPersist(user: User): Promise<AuthTokens> {
    const tokens = this.tokens.issuePair(user);
    const tokenHash = await this.tokens.hashToken(tokens.refreshToken);
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return tokens;
  }

  private async findMatchingToken(
    candidates: RefreshToken[],
    token: string,
  ): Promise<RefreshToken | undefined> {
    // A user has very few refresh tokens (one active per session), so this
    // resolves each candidate in parallel rather than looping sequentially.
    const checks = await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        matches: await this.tokens.verifyTokenHash(candidate.tokenHash, token),
      })),
    );
    return checks.find((check) => check.matches)?.candidate;
  }
}
