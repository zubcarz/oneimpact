import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Domain used by every user created from an e2e spec (`register`,
 * `registerTestUser`). `auth.e2e-spec.ts` and `users.e2e-spec.ts` delete every
 * `User` whose email ends with this domain in their `afterAll`, so
 * `test/seed.e2e-spec.ts`'s `prisma.user.count() === 2` assertion keeps
 * holding regardless of how many disposable users these specs register.
 */
export const E2E_EMAIL_DOMAIN = 'oneimpact.test';

let emailCounter = 0;

/** Generates a unique, disposable email under `E2E_EMAIL_DOMAIN`, e.g. `e2e-login-3@oneimpact.test`. */
export function uniqueEmail(prefix: string): string {
  emailCounter += 1;
  return `e2e-${prefix}-${emailCounter}@${E2E_EMAIL_DOMAIN}`;
}

/** Formats a bearer `Authorization` header value. */
export function bearer(token: string): string {
  return `Bearer ${token}`;
}

const SEED_CREDENTIALS = {
  admin: { email: 'admin@oneimpact.org', password: 'Admin123!' },
  user: { email: 'ana@oneimpact.org', password: 'User123!' },
} as const;

interface LoginResponseBody {
  tokens: { accessToken: string; refreshToken: string };
}

/** Logs in as one of the two seeded users (`prisma/seed.ts`) and returns its access token. */
export async function loginAs(
  app: INestApplication<App>,
  who: keyof typeof SEED_CREDENTIALS,
): Promise<string> {
  const { email, password } = SEED_CREDENTIALS[who];
  const response = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return (response.body as LoginResponseBody).tokens.accessToken;
}

interface RegisteredTestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponseBody {
  user: { id: string; email: string };
  tokens: { accessToken: string; refreshToken: string };
}

/**
 * Registers a disposable user (email under `E2E_EMAIL_DOMAIN`) through the
 * real `POST /v1/auth/register` endpoint, for specs that need "some other
 * user" (role changes, refresh rotation) without touching the two seeded
 * accounts.
 */
export async function registerTestUser(
  app: INestApplication<App>,
  prefix: string,
): Promise<RegisteredTestUser> {
  const email = uniqueEmail(prefix);
  const response = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ name: `E2E ${prefix}`, email, password: 'Password123!' })
    .expect(201);
  const body = response.body as RegisterResponseBody;
  return {
    id: body.user.id,
    email: body.user.email,
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
  };
}

/**
 * Signs an access token with the exact shape `TokensService#issuePair`
 * produces (`AccessTokenPayload`), but already expired (`expiresIn: '-1s'`),
 * to exercise `JwtStrategy`'s `ignoreExpiration: false` without waiting 15
 * real minutes. Uses the same `JWT_ACCESS_SECRET` the app under test reads
 * (`src/infra/config/env.ts`), so the signature itself verifies and only the
 * expiry check fails.
 */
export function signExpiredAccessToken(payload: {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}): string {
  const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
  return new JwtService().sign(payload, { secret, expiresIn: '-1s' });
}
