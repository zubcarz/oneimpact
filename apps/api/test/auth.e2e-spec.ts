import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AuthResponse, AuthTokens } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, registerTestUser, uniqueEmail } from './utils/auth-helpers';

jest.setTimeout(60000);

type ErrorBody = { statusCode: number; code: string; message: string };

/**
 * `env.ts`'s declared default for `AUTH_THROTTLE_LIMIT` (`z.coerce.number().default(10)`).
 * The "Auth throttling" describe below drives the real, unmodified default
 * (see its own comment for why it does not try to override it via
 * `process.env`), so this constant documents the coupling explicitly instead
 * of leaving `10` as an unexplained magic number in the test.
 */
const DEFAULT_AUTH_THROTTLE_LIMIT = 10;

describe('Auth (e2e)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication<App>;

  beforeAll(async () => {
    await seedOnce(prisma);
  });

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // Cleanup: every user these specs created lives under E2E_EMAIL_DOMAIN,
    // so this never touches the two seeded accounts (admin@/ana@oneimpact.org)
    // that `test/seed.e2e-spec.ts` counts on being exactly 2. RefreshToken
    // rows for these users cascade-delete (schema.prisma: onDelete: Cascade),
    // but Payment and Subscription do not, so both are deleted explicitly
    // first -- same FK-safe order as `subscriptions-flow.e2e-spec.ts` and
    // `outbox.e2e-spec.ts` -- in case another spec left a disposable
    // subscribed user behind under this domain.
    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.payment.deleteMany({ where: { user: disposableUser } });
    await prisma.subscription.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  describe('POST /v1/auth/register', () => {
    it('creates a user and returns {user, tokens} without exposing passwordHash', async () => {
      const email = uniqueEmail('register');
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Nueva Persona', email, password: 'Password123!' })
        .expect(201);

      const body = response.body as AuthResponse;
      expect(body.user.email).toBe(email);
      expect(body.user.name).toBe('Nueva Persona');
      expect(body.user.role).toBe('USER');
      expect(typeof body.tokens.accessToken).toBe('string');
      expect(typeof body.tokens.refreshToken).toBe('string');

      // Explicit assertion on the full JSON body: no passwordHash anywhere,
      // not just absent from `user`'s declared keys.
      expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name', 'role']);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('rejects a second registration with the same email with 409 EMAIL_TAKEN', async () => {
      const email = uniqueEmail('duplicate');
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Primera Vez', email, password: 'Password123!' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Segunda Vez', email, password: 'OtherPass123!' })
        .expect(409);

      expect((response.body as ErrorBody).code).toBe('EMAIL_TAKEN');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('logs in with the correct credentials and returns a fresh token pair', async () => {
      const { email } = await registerTestUser(app, 'login-ok');

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(200);

      const body = response.body as AuthResponse;
      expect(body.user.email).toBe(email);
      expect(typeof body.tokens.accessToken).toBe('string');
      expect(typeof body.tokens.refreshToken).toBe('string');
    });

    it('returns the exact same 401 body for a wrong password and for an email that does not exist', async () => {
      const { email } = await registerTestUser(app, 'login-wrong');

      const wrongPassword = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: 'NotThePassword1!' })
        .expect(401);

      const noSuchEmail = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: uniqueEmail('login-nobody'), password: 'NotThePassword1!' })
        .expect(401);

      // Central invariant (see auth.service.ts): identical code AND message,
      // so a caller cannot use the error to enumerate registered emails.
      expect(wrongPassword.body).toEqual(noSuchEmail.body);
      expect((wrongPassword.body as ErrorBody).code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('issues a new, itself-usable refresh token when rotating', async () => {
      const { refreshToken: oldRefresh } = await registerTestUser(app, 'refresh-rotate');

      const firstRefresh = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(200);

      const newTokens = firstRefresh.body as AuthTokens;
      expect(typeof newTokens.accessToken).toBe('string');
      expect(typeof newTokens.refreshToken).toBe('string');

      // `TokensService#issuePair` gives every refresh token a unique `jti`
      // (`tokens.service.ts`), so the rotated token is always a genuinely
      // different string from the one it replaces, even within the same
      // wall-clock second.
      expect(newTokens.refreshToken).not.toBe(oldRefresh);

      const secondRefresh = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: newTokens.refreshToken })
        .expect(200);
      expect(typeof (secondRefresh.body as AuthTokens).accessToken).toBe('string');
    });

    it('rejects reusing a refresh token that was already rotated away with 401', async () => {
      const { refreshToken: oldRefresh } = await registerTestUser(app, 'refresh-reuse');

      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(200);

      const reuseResponse = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(401);

      expect((reuseResponse.body as ErrorBody).code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('revokes the refresh token: it can no longer be used to refresh afterwards', async () => {
      const { accessToken, refreshToken } = await registerTestUser(app, 'logout');

      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', bearer(accessToken))
        .send({ refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});

/**
 * Separate top-level describe with its own app instance (not `beforeEach`'s
 * shared `app`): the throttler's in-memory hit counter must start at zero for
 * this test, and reusing the shared `app` (already hit by every other test in
 * this file through the same `AuthController` guard) would make the exact
 * request count unpredictable.
 *
 * This does NOT lower `AUTH_THROTTLE_LIMIT` via `process.env` before building
 * the app, even though that was the original plan. `ConfigModule.forRoot({
 * validate: validateEnv })` in `AppModule`'s `@Module(...)` decorator is
 * evaluated exactly once -- at module-load time, when `app.module.ts` is
 * first imported by this test file's import chain (`createTestApp` ->
 * `AppModule`), i.e. before any `beforeAll` in this file has run and before
 * `process.env.AUTH_THROTTLE_LIMIT` is ever set. `ConfigModule.forRoot`'s
 * `validate` callback runs synchronously as part of that one call and its
 * result is captured in a closure reused by every later
 * `Test.createTestingModule({ imports: [AppModule] }).compile()`, so setting
 * `process.env.AUTH_THROTTLE_LIMIT` afterwards -- no matter how early in a
 * `beforeAll` -- has no effect on any app built from `AppModule` for the rest
 * of the process. Verified empirically: an app built from an ad-hoc module
 * that wraps the exact same `ConfigModule.forRoot(...)` call inline (so it
 * evaluates after the env override) reads the overridden value correctly,
 * while every app built through `createTestApp()` -> `AppModule` keeps
 * reading the default no matter when the override is set.
 *
 * So this test exercises the real, unmodified default instead
 * (`DEFAULT_AUTH_THROTTLE_LIMIT`, documented above) -- deterministic, not
 * flaky, just coupled to `env.ts`'s declared default staying 10.
 */
describe('Auth throttling (e2e)', () => {
  let throttledApp: INestApplication<App>;

  beforeAll(async () => {
    throttledApp = await createTestApp();
  });

  afterAll(async () => {
    await throttledApp.close();
  });

  it('returns 429 once AUTH_THROTTLE_LIMIT login attempts have been made in the window', async () => {
    const attempt = () =>
      request(throttledApp.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: uniqueEmail('throttle'), password: 'whatever-not-real' });

    // Sequential on purpose: the throttler counts requests as they arrive,
    // concurrent calls would race and make the assertion flaky.
    for (let i = 0; i < DEFAULT_AUTH_THROTTLE_LIMIT; i += 1) {
      const response = await attempt();
      expect(response.status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
  });
});
