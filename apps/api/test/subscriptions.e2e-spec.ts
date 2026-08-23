// `PaymentsService.simulate` sleeps `PAYMENT_SIMULATION_DELAY_MS` (default
// 800 ms, see `payments.service.ts`) on every approved payment. This must be
// the very first statement in the file, BEFORE any `import`: ts-jest compiles
// this file to CommonJS, where `require(...)` calls run exactly where they
// appear in source order (verified empirically -- unlike native ESM, there is
// no cross-statement hoisting). `./utils/create-test-app` transitively
// `require`s `../../src/app.module`, whose `@Module({ imports: [
// ConfigModule.forRoot({ validate: validateEnv }), ... ] })` decorator
// evaluates `validateEnv(process.env)` synchronously as soon as that module
// is loaded -- so this assignment only takes effect if it runs before that
// `import` line below. Setting it inside `beforeAll` (as `auth.e2e-spec.ts`
// documents trying for `AUTH_THROTTLE_LIMIT`) is always too late: every
// `import` in this file is already loaded, in source order, before any test
// hook body ever runs.
//
// This does NOT touch `apps/api/.env` or `env.ts`'s declared default (800ms):
// it only overrides the value this process reads, for the lifetime of this
// spec file's Jest worker.
process.env.PAYMENT_SIMULATION_DELAY_MS = '0';

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Subscription } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, registerTestUser } from './utils/auth-helpers';

jest.setTimeout(60000);

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

interface RegisteredTestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/** Approved card fixture: not `0000`, not expired. Mirrors `subscriptions.service.spec.ts`'s `buildCard`. */
function approvedCard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    brand: 'visa',
    last4: '4242',
    holder: 'Ana Perez',
    expMonth: 12,
    expYear: 2099,
    ...overrides,
  };
}

function createSubscriptionBody(cardOverrides: Partial<Record<string, unknown>> = {}) {
  return {
    planId: 'estandar',
    billing: 'monthly',
    card: approvedCard(cardOverrides),
  };
}

describe('Subscriptions (e2e)', () => {
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
    // Cleanup in FK-safe order (`schema.prisma`: none of Subscription,
    // Payment, JourneyPoint or Notification cascade-delete from User), so
    // `test/seed.e2e-spec.ts`'s `prisma.user.count() === 2` assertion keeps
    // holding no matter how many disposable users/subscriptions/payments this
    // spec creates. Every user here lives under `E2E_EMAIL_DOMAIN`
    // (`registerTestUser`), so this never touches the two seeded accounts.
    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.notification.deleteMany({ where: { user: disposableUser } });
    await prisma.journeyPoint.deleteMany({ where: { user: disposableUser } });
    await prisma.payment.deleteMany({ where: { user: disposableUser } });
    await prisma.subscription.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  describe('POST /v1/subscriptions', () => {
    it('activates a subscription for an approved card (last4 4242) and returns it as ACTIVE', async () => {
      const user = await registerTestUser(app, 'sub-approved');

      const response = await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody())
        .expect(201);

      const body = response.body as Subscription;
      expect(body.userId).toBe(user.id);
      expect(body.planId).toBe('estandar');
      expect(body.billing).toBe('monthly');
      expect(body.status).toBe('ACTIVE');
      expect(body.canceledAt).toBeUndefined();
    });

    it('declines a card ending in 0000 with 402 PAYMENT_DECLINED and creates no subscription row', async () => {
      const user = await registerTestUser(app, 'sub-declined');

      const response = await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody({ last4: '0000' }))
        .expect(402);

      const body = response.body as ErrorBody;
      expect(body.code).toBe('PAYMENT_DECLINED');
      expect(body.details?.reason).toBe('CARD_DECLINED');

      // This is the assertion that matters: the declined payment must leave
      // no `Subscription` row behind at all, not merely a non-201 status code.
      const count = await prisma.subscription.count({ where: { userId: user.id } });
      expect(count).toBe(0);
    });

    it('declines an expired card with 402 PAYMENT_DECLINED and reason CARD_EXPIRED', async () => {
      const user = await registerTestUser(app, 'sub-expired');

      const response = await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody({ expMonth: 1, expYear: 2025 }))
        .expect(402);

      const body = response.body as ErrorBody;
      expect(body.code).toBe('PAYMENT_DECLINED');
      expect(body.details?.reason).toBe('CARD_EXPIRED');

      const count = await prisma.subscription.count({ where: { userId: user.id } });
      expect(count).toBe(0);
    });

    it('rejects a second subscription for a user who already has an active one with 409 SUBSCRIPTION_EXISTS', async () => {
      const user = await registerTestUser(app, 'sub-duplicate');

      await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody())
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody())
        .expect(409);

      expect((response.body as ErrorBody).code).toBe('SUBSCRIPTION_EXISTS');
    });

    it('rejects a body whose card carries the full PAN under `number` with 400 (the PAN never reaches the server)', async () => {
      const user = await registerTestUser(app, 'sub-pan-leak');

      const bodyWithPan = createSubscriptionBody();
      (bodyWithPan.card as Record<string, unknown>).number = '4242424242424242';

      await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(bodyWithPan)
        .expect(400);

      const count = await prisma.subscription.count({ where: { userId: user.id } });
      expect(count).toBe(0);
    });

    it('returns 401 without a bearer token', () => {
      return request(app.getHttpServer())
        .post('/v1/subscriptions')
        .send(createSubscriptionBody())
        .expect(401);
    });
  });

  describe('GET /v1/subscriptions/me', () => {
    it('returns the active subscription for a user who has one', async () => {
      const user = await registerTestUser(app, 'sub-get-active');
      await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody())
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/v1/subscriptions/me')
        .set('Authorization', bearer(user.accessToken))
        .expect(200);

      const body = response.body as Subscription;
      expect(body.userId).toBe(user.id);
      expect(body.status).toBe('ACTIVE');
    });

    it('returns 404 SUBSCRIPTION_NOT_FOUND for a user with no subscription', async () => {
      const user = await registerTestUser(app, 'sub-get-none');

      const response = await request(app.getHttpServer())
        .get('/v1/subscriptions/me')
        .set('Authorization', bearer(user.accessToken))
        .expect(404);

      expect((response.body as ErrorBody).code).toBe('SUBSCRIPTION_NOT_FOUND');
    });

    it('returns 401 without a bearer token', () => {
      return request(app.getHttpServer()).get('/v1/subscriptions/me').expect(401);
    });
  });

  describe('DELETE /v1/subscriptions/me', () => {
    it('cancels the active subscription, persisting CANCELED in the database', async () => {
      const user: RegisteredTestUser = await registerTestUser(app, 'sub-cancel');
      await request(app.getHttpServer())
        .post('/v1/subscriptions')
        .set('Authorization', bearer(user.accessToken))
        .send(createSubscriptionBody())
        .expect(201);

      await request(app.getHttpServer())
        .delete('/v1/subscriptions/me')
        .set('Authorization', bearer(user.accessToken))
        .expect(200);

      const row = await prisma.subscription.findFirst({ where: { userId: user.id } });
      expect(row?.status).toBe('CANCELED');
      expect(row?.canceledAt).not.toBeNull();
    });

    it('returns 401 without a bearer token', () => {
      return request(app.getHttpServer()).delete('/v1/subscriptions/me').expect(401);
    });
  });
});
