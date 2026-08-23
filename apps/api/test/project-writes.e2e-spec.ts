import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Project, ProjectWithUpdates, SignedUpload } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';
import { E2E_EMAIL_DOMAIN, bearer, loginAs, registerTestUser } from './utils/auth-helpers';

jest.setTimeout(60000);

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

let titleCounter = 0;

/** A per-test-run unique title, always prefixed `E2E ` so it never collides
 * with `packages/shared/src/seed-data.ts`'s 5 seeded projects. */
function uniqueTitle(prefix: string): string {
  titleCounter += 1;
  return `E2E ${prefix} ${titleCounter} ${Date.now()}`;
}

function createProjectBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: uniqueTitle('project'),
    summary: 'Resumen de prueba e2e',
    description: 'Descripcion de prueba con mas de diez caracteres',
    zoneSlug: 'amazonia',
    ...overrides,
  };
}

function publishUpdateBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: 'Avance de prueba e2e',
    body: 'Cuerpo del avance de prueba con mas de diez caracteres',
    progress: 55,
    ...overrides,
  };
}

describe('Project writes (e2e)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication<App>;
  let adminToken: string;

  // Ids of every `Project` this spec creates through `POST /v1/projects`, so
  // `afterAll` can delete exactly these rows (plus whatever cascades from
  // them) without touching the 5 projects `prisma/seed.ts` inserts --
  // `test/seed.e2e-spec.ts` asserts `project.count() === 5` and
  // `projectUpdate.count() === 5`, and this spec must leave both holding.
  const createdProjectIds: string[] = [];

  async function createProject(
    token: string,
    overrides: Partial<Record<string, unknown>> = {},
  ): Promise<Project> {
    const response = await request(app.getHttpServer())
      .post('/v1/projects')
      .set('Authorization', bearer(token))
      .send(createProjectBody(overrides))
      .expect(201);
    const project = response.body as Project;
    createdProjectIds.push(project.id);
    return project;
  }

  beforeAll(async () => {
    await seedOnce(prisma);
  });

  beforeEach(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin');
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // FK-safe order: ProjectFollow and ProjectUpdate reference Project, so
    // they go first. Filtering by the exact ids this spec created (not by a
    // title prefix query) means an empty `createdProjectIds` -- e.g. if
    // `beforeAll` fails before any test runs -- still resolves to a no-op
    // `in: []` instead of accidentally matching something unrelated.
    await prisma.projectFollow.deleteMany({
      where: { projectId: { in: createdProjectIds } },
    });
    await prisma.projectUpdate.deleteMany({
      where: { projectId: { in: createdProjectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });

    // Disposable follower users registered under `E2E_EMAIL_DOMAIN`. Mirrors
    // `subscriptions.e2e-spec.ts`'s cleanup: never touches the two seeded
    // accounts `test/seed.e2e-spec.ts` counts.
    const disposableUser = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` } };
    await prisma.projectFollow.deleteMany({ where: { user: disposableUser } });
    await prisma.user.deleteMany({ where: disposableUser });
    await prisma.$disconnect();
  });

  describe('admin write flow', () => {
    it('creates a project, publishes an update with a different progress, and GET reflects the recalculated progress plus the update', async () => {
      const project = await createProject(adminToken, { progress: 10 });
      expect(project.progress).toBe(10);

      const updateResponse = await request(app.getHttpServer())
        .post(`/v1/projects/${project.id}/updates`)
        .set('Authorization', bearer(adminToken))
        .send(publishUpdateBody({ progress: 75 }))
        .expect(201);
      expect(updateResponse.body).toMatchObject({ projectId: project.id, progress: 75 });

      const getResponse = await request(app.getHttpServer())
        .get(`/v1/projects/${project.id}`)
        .expect(200);
      const body = getResponse.body as ProjectWithUpdates;
      expect(body.progress).toBe(75);
      expect(body.updates.some((update) => update.progress === 75)).toBe(true);
    });

    it('derives a distinct slug for a second project sharing the same title as an existing one', async () => {
      const sharedTitle = uniqueTitle('duplicate-title');

      const first = await createProject(adminToken, { title: sharedTitle });
      const second = await createProject(adminToken, { title: sharedTitle });

      expect(second.slug).not.toBe(first.slug);

      const rows = await prisma.project.findMany({
        where: { id: { in: [first.id, second.id] } },
        select: { id: true, slug: true },
      });
      expect(rows.map((row) => row.slug)).toEqual(
        expect.arrayContaining([first.slug, second.slug]),
      );
      expect(new Set(rows.map((row) => row.slug)).size).toBe(2);
    });

    it('rejects PATCH with 400 when body is invalid and 404 when the project does not exist, otherwise applies the update', async () => {
      const project = await createProject(adminToken);

      const patchResponse = await request(app.getHttpServer())
        .patch(`/v1/projects/${project.id}`)
        .set('Authorization', bearer(adminToken))
        .send({ summary: 'Resumen actualizado' })
        .expect(200);
      expect((patchResponse.body as Project).summary).toBe('Resumen actualizado');
    });
  });

  describe('POST /v1/uploads/sign', () => {
    it('returns a signed upload with simulated: true when no Supabase credentials are configured', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/uploads/sign')
        .set('Authorization', bearer(adminToken))
        .send({ filename: 'cover.jpg', contentType: 'image/jpeg' })
        .expect(201);

      const body = response.body as SignedUpload;
      expect(body.simulated).toBe(true);
      expect(body.key).toEqual(expect.any(String));
      expect(body.uploadUrl).toEqual(expect.any(String));
    });
  });

  describe('follow idempotency', () => {
    it('following twice creates a single ProjectFollow row; unfollowing removes it and a second unfollow is a no-op', async () => {
      const project = await createProject(adminToken);
      const follower = await registerTestUser(app, 'project-follow');

      await request(app.getHttpServer())
        .post(`/v1/projects/${project.id}/follow`)
        .set('Authorization', bearer(follower.accessToken))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/v1/projects/${project.id}/follow`)
        .set('Authorization', bearer(follower.accessToken))
        .expect(200);

      const followCount = await prisma.projectFollow.count({
        where: { userId: follower.id, projectId: project.id },
      });
      expect(followCount).toBe(1);

      await request(app.getHttpServer())
        .delete(`/v1/projects/${project.id}/follow`)
        .set('Authorization', bearer(follower.accessToken))
        .expect(200);

      const afterUnfollowCount = await prisma.projectFollow.count({
        where: { userId: follower.id, projectId: project.id },
      });
      expect(afterUnfollowCount).toBe(0);

      // Unfollowing a project never followed (again) must not throw.
      await request(app.getHttpServer())
        .delete(`/v1/projects/${project.id}/follow`)
        .set('Authorization', bearer(follower.accessToken))
        .expect(200);
    });

    it('returns 404 PROJECT_NOT_FOUND when following a project that does not exist', async () => {
      const follower = await registerTestUser(app, 'project-follow-missing');

      const response = await request(app.getHttpServer())
        .post('/v1/projects/no-existe/follow')
        .set('Authorization', bearer(follower.accessToken))
        .expect(404);

      expect((response.body as ErrorBody).code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('validation and not-found on admin writes', () => {
    it('rejects POST /v1/projects with 400 when title is too short', async () => {
      await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', bearer(adminToken))
        .send(createProjectBody({ title: 'ab' }))
        .expect(400);
    });

    it('rejects POST /v1/projects with 404 ZONE_NOT_FOUND when zoneSlug does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', bearer(adminToken))
        .send(createProjectBody({ zoneSlug: 'zona-inexistente' }))
        .expect(404);

      expect((response.body as ErrorBody).code).toBe('ZONE_NOT_FOUND');
    });
  });

  describe('role and auth guards on admin-only writes', () => {
    it('returns 403 when a USER attempts POST /v1/projects', async () => {
      const userToken = await loginAs(app, 'user');
      await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', bearer(userToken))
        .send(createProjectBody())
        .expect(403);
    });

    it('returns 403 when a USER attempts PATCH /v1/projects/:id', async () => {
      const userToken = await loginAs(app, 'user');
      await request(app.getHttpServer())
        .patch('/v1/projects/no-existe')
        .set('Authorization', bearer(userToken))
        .send({ summary: 'Intento no autorizado' })
        .expect(403);
    });

    it('returns 403 when a USER attempts POST /v1/projects/:id/updates', async () => {
      const userToken = await loginAs(app, 'user');
      await request(app.getHttpServer())
        .post('/v1/projects/no-existe/updates')
        .set('Authorization', bearer(userToken))
        .send(publishUpdateBody())
        .expect(403);
    });

    it('returns 403 when a USER attempts POST /v1/uploads/sign', async () => {
      const userToken = await loginAs(app, 'user');
      await request(app.getHttpServer())
        .post('/v1/uploads/sign')
        .set('Authorization', bearer(userToken))
        .send({ filename: 'cover.jpg', contentType: 'image/jpeg' })
        .expect(403);
    });

    it('returns 401 without a bearer token on every admin-only write', async () => {
      await request(app.getHttpServer()).post('/v1/projects').send(createProjectBody()).expect(401);

      await request(app.getHttpServer())
        .patch('/v1/projects/no-existe')
        .send({ summary: 'Intento sin token' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/v1/projects/no-existe/updates')
        .send(publishUpdateBody())
        .expect(401);

      await request(app.getHttpServer())
        .post('/v1/uploads/sign')
        .send({ filename: 'cover.jpg', contentType: 'image/jpeg' })
        .expect(401);
    });
  });
});
