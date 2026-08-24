import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AdminMetrics } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, loginAs, registerTestUser } from './utils/auth-helpers';

jest.setTimeout(60000);

/**
 * Covers `GET /v1/admin/metrics`: shape/coherence against the real seed
 * (`packages/shared/src/seed-data.ts`), the ADMIN-only guard, and the 30s
 * in-memory cache (`AdminMetricsService`) -- the cache itself is unit-tested
 * with fake timers in `admin-metrics.service.spec.ts`; here we only prove
 * that two back-to-back requests within the same window read the SAME
 * cached snapshot, without waiting 30 real seconds.
 */
describe('Admin metrics (e2e)', () => {
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
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } } });
    await prisma.$disconnect();
  });

  it('rejects a USER caller with 403', async () => {
    const accessToken = await loginAs(app, 'user');

    await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', bearer(accessToken))
      .expect(403);
  });

  it('returns coherent aggregates for an ADMIN caller', async () => {
    const accessToken = await loginAs(app, 'admin');

    const response = await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', bearer(accessToken))
      .expect(200);

    const body = response.body as AdminMetrics;

    // At least the two seeded accounts -- other specs in the same e2e
    // process may have registered disposable users by the time this file
    // runs, so this is a lower bound, never an exact count.
    expect(body.users).toBeGreaterThanOrEqual(2);

    // All three PlanId keys are always present, even for a plan with zero
    // active subscriptions (AdminMetricsRepository fills absent groups with
    // 0 -- see its class doc).
    expect(Object.keys(body.activeSubscriptionsByPlan).sort()).toEqual([
      'basico',
      'estandar',
      'premium',
    ]);
    expect(typeof body.mrrSimulated).toBe('number');

    // Same coherence guarantee for ProjectStatus: the seed only has ACTIVE
    // and COMPLETED projects, so PLANNED must still show up as 0, not be
    // missing from the response.
    expect(Object.keys(body.projectsByStatus).sort()).toEqual(['ACTIVE', 'COMPLETED', 'PLANNED']);
    expect(body.projectsByStatus.PLANNED).toBe(0);
    expect(body.projectsByStatus.ACTIVE).toBeGreaterThanOrEqual(1);

    expect(typeof body.updatesLast30Days).toBe('number');
    expect(Array.isArray(body.avgProgressByZone)).toBe(true);
    expect(body.avgProgressByZone.length).toBeGreaterThanOrEqual(5);
    for (const zone of body.avgProgressByZone) {
      expect(typeof zone.zoneId).toBe('string');
      expect(typeof zone.zoneSlug).toBe('string');
      expect(typeof zone.zoneName).toBe('string');
      expect(typeof zone.avgProgress).toBe('number');
    }
  });

  it('serves the second of two back-to-back requests from the cache: the user count does not change even after a new user is created in between', async () => {
    const accessToken = await loginAs(app, 'admin');

    const first = await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', bearer(accessToken))
      .expect(200);
    const firstUsers = (first.body as AdminMetrics).users;

    await registerTestUser(app, 'metrics-cache');

    const second = await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', bearer(accessToken))
      .expect(200);
    const secondUsers = (second.body as AdminMetrics).users;

    expect(secondUsers).toBe(firstUsers);
  });
});
