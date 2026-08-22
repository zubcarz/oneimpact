import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Project, ProjectWithUpdates } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';

jest.setTimeout(60000);

type ListResponse<T> = { items: T[]; total: number };

describe('Projects (e2e)', () => {
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
    await prisma.$disconnect();
  });

  describe('GET /v1/projects', () => {
    it('returns the 5 seeded projects', () => {
      return request(app.getHttpServer())
        .get('/v1/projects')
        .expect(200)
        .expect((res) => {
          const body = res.body as ListResponse<Project>;
          expect(body.total).toBe(5);
          expect(body.items).toHaveLength(5);
        });
    });

    it('filters by zoneSlug, returning only borneo-monitoreo for zoneSlug=borneo', () => {
      return request(app.getHttpServer())
        .get('/v1/projects?zoneSlug=borneo')
        .expect(200)
        .expect((res) => {
          const body = res.body as ListResponse<Project>;
          expect(body.items).toHaveLength(1);
          expect(body.total).toBe(1);
          expect(body.items[0].slug).toBe('borneo-monitoreo');
        });
    });

    it('filters by status, returning only amazonia-carbono for status=COMPLETED', () => {
      return request(app.getHttpServer())
        .get('/v1/projects?status=COMPLETED')
        .expect(200)
        .expect((res) => {
          const body = res.body as ListResponse<Project>;
          expect(body.items).toHaveLength(1);
          expect(body.total).toBe(1);
          expect(body.items[0].slug).toBe('amazonia-carbono');
        });
    });

    it('returns 400 for an invalid status value (global zod query pipe)', () => {
      return request(app.getHttpServer()).get('/v1/projects?status=INVALIDO').expect(400);
    });
  });

  describe('GET /v1/projects/:id', () => {
    it('returns the project with its non-empty `updates` array', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/v1/projects?zoneSlug=amazonia')
        .expect(200);
      const listBody = listRes.body as ListResponse<Project>;
      const project = listBody.items.find((item) => item.slug === 'amazonia-carbono');
      expect(project).toBeDefined();

      // The seed (`packages/shared/src/seed-data.ts`) gives every project
      // exactly one update, so there is nothing to order here yet. Ordering
      // `updates` by `publishedAt` DESC gets a real assertion once item 06
      // adds a second update to a project.
      return request(app.getHttpServer())
        .get(`/v1/projects/${project!.id}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ProjectWithUpdates;
          expect(body.slug).toBe('amazonia-carbono');
          expect(body.updates.length).toBeGreaterThan(0);
        });
    });

    it('returns 404 with code PROJECT_NOT_FOUND for an id that does not exist', () => {
      return request(app.getHttpServer())
        .get('/v1/projects/no-existe')
        .expect(404)
        .expect((res) => {
          const body = res.body as { statusCode: number; code: string; message: string };
          expect(body.code).toBe('PROJECT_NOT_FOUND');
        });
    });
  });
});
