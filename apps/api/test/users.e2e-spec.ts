import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { UserProfile } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import {
  E2E_EMAIL_DOMAIN,
  bearer,
  loginAs,
  registerTestUser,
  signExpiredAccessToken,
} from './utils/auth-helpers';

jest.setTimeout(60000);

type ListResponse<T> = { items: T[]; total: number };

const ANA_EMAIL = 'ana@oneimpact.org';

describe('Users & roles (e2e)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication<App>;
  let originalAnaName: string;

  beforeAll(async () => {
    await seedOnce(prisma);
    const ana = await prisma.user.findUniqueOrThrow({ where: { email: ANA_EMAIL } });
    originalAnaName = ana.name;
  });

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // Restore ana's name (PATCH /v1/me tests below rename her) and drop the
    // disposable users these specs registered, without touching the two
    // seeded accounts that `test/seed.e2e-spec.ts` counts on being exactly 2.
    // Payment and Subscription do not cascade from User (schema.prisma), so
    // both are deleted explicitly first -- same FK-safe order as
    // `subscriptions-flow.e2e-spec.ts` and `outbox.e2e-spec.ts`. This file
    // itself never creates a subscription, but its broad domain-wide delete
    // can otherwise collide with a disposable user another spec left behind.
    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.user.update({ where: { email: ANA_EMAIL }, data: { name: originalAnaName } });
    await prisma.payment.deleteMany({ where: { user: disposableUser } });
    await prisma.subscription.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  describe('GET /v1/me', () => {
    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer()).get('/v1/me').expect(401);
    });

    it("returns ana's own profile without passwordHash when authenticated", async () => {
      const accessToken = await loginAs(app, 'user');

      const response = await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', bearer(accessToken))
        .expect(200);

      const body = response.body as UserProfile;
      expect(body.email).toBe(ANA_EMAIL);
      expect(body.role).toBe('USER');
      expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name', 'role']);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('rejects an expired access token with 401', async () => {
      const expiredToken = signExpiredAccessToken({
        sub: 'expired-user-id',
        email: ANA_EMAIL,
        role: 'USER',
      });

      await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', bearer(expiredToken))
        .expect(401);
    });
  });

  describe('PATCH /v1/me', () => {
    it("updates the caller's own name", async () => {
      const accessToken = await loginAs(app, 'user');

      const response = await request(app.getHttpServer())
        .patch('/v1/me')
        .set('Authorization', bearer(accessToken))
        .send({ name: 'Ana Actualizada' })
        .expect(200);

      expect((response.body as UserProfile).name).toBe('Ana Actualizada');
    });

    it('rejects a body with an extra `role` field with 400 and never changes the role in the DB', async () => {
      const accessToken = await loginAs(app, 'user');
      const before = await prisma.user.findUniqueOrThrow({ where: { email: ANA_EMAIL } });
      expect(before.role).toBe('USER');

      await request(app.getHttpServer())
        .patch('/v1/me')
        .set('Authorization', bearer(accessToken))
        .send({ name: 'X', role: 'ADMIN' })
        .expect(400);

      const after = await prisma.user.findUniqueOrThrow({ where: { email: ANA_EMAIL } });
      expect(after.role).toBe('USER');
    });
  });

  describe('GET /v1/admin/users', () => {
    it('rejects a USER caller with 403', async () => {
      const accessToken = await loginAs(app, 'user');

      await request(app.getHttpServer())
        .get('/v1/admin/users')
        .set('Authorization', bearer(accessToken))
        .expect(403);
    });

    it('returns {items, total} for an ADMIN caller', async () => {
      const accessToken = await loginAs(app, 'admin');

      const response = await request(app.getHttpServer())
        .get('/v1/admin/users')
        .set('Authorization', bearer(accessToken))
        .expect(200);

      const body = response.body as ListResponse<UserProfile>;
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(body.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /v1/admin/users/:id/role', () => {
    it('rejects a USER caller with 403', async () => {
      const userToken = await loginAs(app, 'user');
      const target = await registerTestUser(app, 'role-forbidden');

      await request(app.getHttpServer())
        .patch(`/v1/admin/users/${target.id}/role`)
        .set('Authorization', bearer(userToken))
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('lets an ADMIN caller change the role of a test user', async () => {
      const adminToken = await loginAs(app, 'admin');
      const target = await registerTestUser(app, 'role-promote');

      const response = await request(app.getHttpServer())
        .patch(`/v1/admin/users/${target.id}/role`)
        .set('Authorization', bearer(adminToken))
        .send({ role: 'ADMIN' })
        .expect(200);

      expect((response.body as UserProfile).role).toBe('ADMIN');
    });
  });

  describe('GET /v1/plans (public route regression)', () => {
    it('remains reachable with no Authorization header (protecting against a guard change closing it silently)', async () => {
      await request(app.getHttpServer()).get('/v1/plans').expect(200);
    });
  });
});
