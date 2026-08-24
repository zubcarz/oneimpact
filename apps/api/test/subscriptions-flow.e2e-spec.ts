// `PaymentsService.simulate` sleeps `PAYMENT_SIMULATION_DELAY_MS` (default
// 800 ms, see `payments.service.ts`) on every approved payment. This must be
// the very first statement in the file, BEFORE any `import`: ts-jest compiles
// this file to CommonJS, where `require(...)` calls run exactly where they
// appear in source order -- unlike native ESM, there is no cross-statement
// hoisting. `./utils/create-test-app` transitively `require`s
// `../../src/app.module`, whose `@Module({ imports: [
// ConfigModule.forRoot({ validate: validateEnv }), ... ] })` decorator
// evaluates `validateEnv(process.env)` synchronously as soon as that module
// is loaded -- so this assignment only takes effect if it runs before that
// `import` line below. See `subscriptions.e2e-spec.ts` for the full reasoning.
process.env.PAYMENT_SIMULATION_DELAY_MS = '0';
// Fast relay tick so the `waitFor(...)` polls below (see hallazgo 5 of
// `.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`) settle
// quickly: outbox delivery is asynchronous now, no longer inline with
// `EventBus.publish`.
process.env.OUTBOX_RELAY_INTERVAL_MS = '20';

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { DashboardSummary, NotificationItem, Project } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, loginAs, registerTestUser } from './utils/auth-helpers';
import { waitFor } from './utils/wait-for';

jest.setTimeout(60000);

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

interface NotificationsListBody {
  items: NotificationItem[];
  total: number;
}

/** Approved card fixture: not `0000`, not expired. Mirrors `subscriptions.e2e-spec.ts`'s `buildCard`. */
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

let titleCounter = 0;

/** A per-test-run unique title, always prefixed `E2E Flow ` so it never
 * collides with `packages/shared/src/seed-data.ts`'s 5 seeded projects. */
function uniqueTitle(prefix: string): string {
  titleCounter += 1;
  return `E2E Flow ${prefix} ${titleCounter} ${Date.now()}`;
}

function createProjectBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: uniqueTitle('project'),
    summary: 'Resumen de prueba e2e de flujo completo',
    description: 'Descripcion de prueba con mas de diez caracteres',
    zoneSlug: 'amazonia',
    ...overrides,
  };
}

function publishUpdateBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: 'Avance de prueba e2e de flujo',
    body: 'Cuerpo del avance de prueba con mas de diez caracteres',
    progress: 60,
    ...overrides,
  };
}

/**
 * End-to-end demonstration that the event-driven architecture actually wires
 * up: a single `POST /v1/subscriptions` (or `POST /v1/projects/:id/updates`)
 * produces effects in `impact` and `notifications` without `subscriptions` or
 * `projects` ever importing those modules' services. One `it` per acceptance
 * criterion in `06-api-payments-subscriptions-events.md`; the narrower specs
 * for each module already live in `subscriptions.e2e-spec.ts` and
 * `project-writes.e2e-spec.ts` and are not duplicated here.
 */
describe('Subscriptions -- payments/subscriptions/impact/notifications flow (e2e)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication<App>;

  // Ids of every `Project` this spec creates through `POST /v1/projects`, so
  // `afterAll` can delete exactly these rows (plus whatever cascades from
  // them) without touching the 5 projects `prisma/seed.ts` inserts --
  // `test/seed.e2e-spec.ts` asserts `project.count() === 5` and
  // `projectUpdate.count() === 5`.
  const createdProjectIds: string[] = [];

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
    // FK-safe order. `ProjectFollow`/`ProjectUpdate` reference `Project` and
    // cascade from it, so deleting the tracked project ids first is enough
    // for those two. `Notification` and `JourneyPoint` cascade from `User`
    // (`schema.prisma`), so deleting the disposable users cleans those up
    // too -- but `Subscription` and `Payment` do NOT cascade from `User`
    // (a payment is a financial trail, kept even across a deleted account in
    // spirit; here it just means the FK would block the user delete), so
    // both go explicit and BEFORE the user delete. Every user here lives
    // under `E2E_EMAIL_DOMAIN` (`registerTestUser`), so this never touches
    // the two seeded accounts `test/seed.e2e-spec.ts` counts.
    await prisma.projectFollow.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await prisma.projectUpdate.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });

    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.payment.deleteMany({ where: { user: disposableUser } });
    await prisma.subscription.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  it('registers a user, subscribes with an approved card, and the dashboard and notifications reflect the events fired by the activation', async () => {
    const user = await registerTestUser(app, 'flow-happy');

    await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody())
      .expect(201);

    // Outbox delivery is asynchronous (relay tick, not inline with
    // `EventBus.publish`): poll until the listeners have caught up instead
    // of asserting immediately after the `POST` responds.
    await waitFor(async () => {
      const dashboardResponse = await request(app.getHttpServer())
        .get('/v1/dashboard/me')
        .set('Authorization', bearer(user.accessToken))
        .expect(200);
      const dashboard = dashboardResponse.body as DashboardSummary;
      expect(dashboard.plan?.id).toBe('estandar');
      expect(dashboard.status).toBe('ACTIVE');
      expect(dashboard.journeyPoints).toBe(1);
    });

    await waitFor(async () => {
      const notificationsResponse = await request(app.getHttpServer())
        .get('/v1/notifications/me')
        .set('Authorization', bearer(user.accessToken))
        .expect(200);
      const notifications = notificationsResponse.body as NotificationsListBody;
      expect(notifications.total).toBe(2);
      expect(notifications.items.map((item) => item.type).sort()).toEqual(
        ['SUBSCRIPTION', 'WELCOME'].sort(),
      );
    });
  });

  it('declines a card ending in 0000 with 402 and leaves no subscription and no journey point behind', async () => {
    const user = await registerTestUser(app, 'flow-declined');

    await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody({ last4: '0000' }))
      .expect(402);

    const subscriptionCount = await prisma.subscription.count({ where: { userId: user.id } });
    expect(subscriptionCount).toBe(0);

    const journeyPointCount = await prisma.journeyPoint.count({ where: { userId: user.id } });
    expect(journeyPointCount).toBe(0);
  });

  it('rejects a second subscription with 409, and canceling the first keeps the journey point on the dashboard', async () => {
    const user = await registerTestUser(app, 'flow-cancel');

    await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody())
      .expect(201);

    const secondAttempt = await request(app.getHttpServer())
      .post('/v1/subscriptions')
      .set('Authorization', bearer(user.accessToken))
      .send(createSubscriptionBody())
      .expect(409);
    expect((secondAttempt.body as ErrorBody).code).toBe('SUBSCRIPTION_EXISTS');

    await request(app.getHttpServer())
      .delete('/v1/subscriptions/me')
      .set('Authorization', bearer(user.accessToken))
      .expect(200);

    const canceledRow = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(canceledRow?.status).toBe('CANCELED');

    const dashboardResponse = await request(app.getHttpServer())
      .get('/v1/dashboard/me')
      .set('Authorization', bearer(user.accessToken))
      .expect(200);
    expect((dashboardResponse.body as DashboardSummary).journeyPoints).toBe(1);
  });

  it('notifies a follower of a project when an admin publishes an update', async () => {
    const adminToken = await loginAs(app, 'admin');
    const follower = await registerTestUser(app, 'flow-follower');

    const projectResponse = await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', bearer(adminToken))
      .send(createProjectBody())
      .expect(201);
    const project = projectResponse.body as Project;
    createdProjectIds.push(project.id);

    await request(app.getHttpServer())
      .post(`/v1/projects/${project.id}/follow`)
      .set('Authorization', bearer(follower.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/v1/projects/${project.id}/updates`)
      .set('Authorization', bearer(adminToken))
      .send(publishUpdateBody())
      .expect(201);

    await waitFor(async () => {
      const notificationsResponse = await request(app.getHttpServer())
        .get('/v1/notifications/me')
        .set('Authorization', bearer(follower.accessToken))
        .expect(200);
      const notifications = notificationsResponse.body as NotificationsListBody;
      expect(notifications.items.some((item) => item.type === 'PROJECT_UPDATE')).toBe(true);
    });
  });

  it('rejects a USER attempting to create a project with 403', async () => {
    const userToken = await loginAs(app, 'user');

    await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', bearer(userToken))
      .send(createProjectBody())
      .expect(403);
  });
});
