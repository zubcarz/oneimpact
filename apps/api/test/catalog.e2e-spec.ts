import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Plan, Project, Zone } from '@oneimpact/shared';
import { createTestApp } from './utils/create-test-app';
import { seedOnce } from './utils/seed-once';

jest.setTimeout(60000);

type ListResponse<T> = { items: T[]; total: number };

describe('Catalog (e2e)', () => {
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

  describe('GET /v1/plans', () => {
    it('returns the 3 seeded plans, including basico/estandar/premium', () => {
      return request(app.getHttpServer())
        .get('/v1/plans')
        .expect(200)
        .expect((res) => {
          const body = res.body as ListResponse<Plan>;
          expect(body.items).toHaveLength(3);
          expect(body.total).toBe(3);
          const ids = body.items.map((plan) => plan.id).sort();
          expect(ids).toEqual(['basico', 'estandar', 'premium']);
        });
    });
  });

  describe('GET /v1/zones', () => {
    it('returns the 5 seeded zones ordered by `order`, amazonia first', () => {
      return request(app.getHttpServer())
        .get('/v1/zones')
        .expect(200)
        .expect((res) => {
          const body = res.body as ListResponse<Zone>;
          expect(body.total).toBe(5);
          expect(body.items).toHaveLength(5);
          expect(body.items[0].slug).toBe('amazonia');
          expect(typeof body.items[0].id).toBe('string');
          expect(body.items[0].imageKey).toBe('zones/amazonia.jpg');
          expect((body.items[0] as Record<string, unknown>).updatedAt).toBeUndefined();
        });
    });
  });

  describe('GET /v1/zones/:slug', () => {
    it('returns the amazonia zone with its 2 seeded projects (guainia, amazonia-carbono)', () => {
      return request(app.getHttpServer())
        .get('/v1/zones/amazonia')
        .expect(200)
        .expect((res) => {
          const body = res.body as Zone & { projects: Project[] };
          expect(body.slug).toBe('amazonia');
          const projectSlugs = body.projects.map((project) => project.slug).sort();
          expect(projectSlugs).toEqual(['amazonia-carbono', 'guainia']);

          const [project] = body.projects;
          expect(typeof project.createdAt).toBe('string');
          expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          const raw = project as unknown as Record<string, unknown>;
          expect(raw.updatedAt).toBeUndefined();
          expect(raw.createdById).toBeUndefined();
        });
    });

    it('returns 404 with code ZONE_NOT_FOUND for a slug that does not exist', () => {
      return request(app.getHttpServer())
        .get('/v1/zones/no-existe')
        .expect(404)
        .expect((res) => {
          const body = res.body as { statusCode: number; code: string; message: string };
          expect(body.code).toBe('ZONE_NOT_FOUND');
        });
    });
  });
});
