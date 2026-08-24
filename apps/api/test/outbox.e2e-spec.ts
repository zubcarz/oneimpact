// Fast relay tick + zero payment latency, same reasoning as
// `subscriptions-flow.e2e-spec.ts`: this MUST be the very first statement in
// the file, before any `import`, because `AppModule`'s
// `ConfigModule.forRoot({ validate: validateEnv })` reads `process.env`
// synchronously the moment it is required.
process.env.OUTBOX_RELAY_INTERVAL_MS = '20';
process.env.PAYMENT_SIMULATION_DELAY_MS = '0';

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, loginAs, registerTestUser } from './utils/auth-helpers';
import { waitFor } from './utils/wait-for';
import { EventName } from '../src/infra/events/event-names';
import { OutboxFaultInjector } from '../src/infra/events/outbox-fault-injector';

jest.setTimeout(60000);

/** Approved card fixture: not `0000`, not expired. Mirrors `subscriptions-flow.e2e-spec.ts`. */
function approvedCard() {
  return {
    brand: 'visa',
    last4: '4242',
    holder: 'Ana Perez',
    expMonth: 12,
    expYear: 2099,
  };
}

function createSubscriptionBody() {
  return {
    planId: 'estandar',
    billing: 'monthly',
    card: approvedCard(),
  };
}

/**
 * `OutboxEvent.payload` stores the FULL `DomainEvent` envelope
 * (`{type, occurredAt, payload}`), not just the domain payload -- see
 * `OutboxRepository.insert`'s doc. This narrows just enough to read
 * `payload.userId` back out without `any`.
 */
interface StoredSubscriptionActivatedEnvelope {
  payload: { userId: string; subscriptionId: string };
}

/**
 * Covers the outbox acceptance criteria from the roadmap spec: durable
 * delivery (a row survives and is eventually delivered), retry after a
 * failed delivery attempt without blocking the original response (b), and
 * the admin-only guard on `GET /v1/admin/outbox` (c). Narrower per-module
 * event flows already live in `subscriptions-flow.e2e-spec.ts`; this spec is
 * only about the outbox transport itself.
 */
describe('Outbox -- durability, retry and admin endpoint (e2e)', () => {
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
    // Same FK-safe order as `subscriptions-flow.e2e-spec.ts`: `Payment` and
    // `Subscription` do not cascade from `User`, so both are deleted
    // explicitly before the user. This spec never creates a `Project`, so
    // there is nothing else to clean up. Only rows under `E2E_EMAIL_DOMAIN`
    // are touched -- the two seeded accounts are never affected.
    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.payment.deleteMany({ where: { user: disposableUser } });
    await prisma.subscription.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  async function findActivatedRowForUser(userId: string) {
    const rows = await prisma.outboxEvent.findMany({
      where: { type: EventName.SUBSCRIPTION_ACTIVATED },
    });
    return rows.find(
      (row) =>
        (row.payload as unknown as StoredSubscriptionActivatedEnvelope).payload.userId === userId,
    );
  }

  it('durably delivers subscription.activated: the row is processed and journey/notification effects land within the relay window', async () => {
    const user = await registerTestUser(app, 'outbox-durable');

    await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody())
      .expect(201);

    await waitFor(async () => {
      const row = await findActivatedRowForUser(user.id);
      expect(row).toBeDefined();
      expect(row?.processedAt).not.toBeNull();
    });

    await waitFor(async () => {
      const journeyPointCount = await prisma.journeyPoint.count({ where: { userId: user.id } });
      expect(journeyPointCount).toBeGreaterThan(0);
    });

    await waitFor(async () => {
      const notificationCount = await prisma.notification.count({ where: { userId: user.id } });
      expect(notificationCount).toBeGreaterThan(0);
    });
  });

  it('keeps responding 201 when the first delivery attempt fails, and retries the event to completion', async () => {
    const user = await registerTestUser(app, 'outbox-retry');
    app.get(OutboxFaultInjector).failNextDeliveryOnce(EventName.SUBSCRIPTION_ACTIVATED);

    // Delivery is asynchronous: forcing the next delivery of this event type
    // to fail must not affect the synchronous 201 the endpoint already
    // returns once the subscription and outbox row are written.
    await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody())
      .expect(201);

    await waitFor(async () => {
      const row = await findActivatedRowForUser(user.id);
      expect(row).toBeDefined();
      expect(row?.attempts ?? 0).toBeGreaterThanOrEqual(1);
      expect(row?.lastError).toBeTruthy();
    });

    await waitFor(async () => {
      const row = await findActivatedRowForUser(user.id);
      expect(row?.processedAt).not.toBeNull();
    });
  });

  it('rejects GET /v1/admin/outbox for a USER with 403', async () => {
    const userToken = await loginAs(app, 'user');

    await request(app.getHttpServer())
      .get('/v1/admin/outbox')
      .set('Authorization', bearer(userToken))
      .expect(403);
  });
});
