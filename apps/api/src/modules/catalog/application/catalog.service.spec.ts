import { Test } from '@nestjs/testing';
import type { Plan, Zone, Project } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import type { ZoneWithProjects } from '../infrastructure/catalog.repository';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const buildZoneRow = (overrides: Partial<Zone> = {}): Zone => ({
    id: 'zone-1',
    slug: 'costa',
    name: 'Costa',
    description: 'Proyectos en la zona costera',
    imageKey: 'zones/costa.jpg',
    order: 1,
    ...overrides,
  });

  const buildProjectRow = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    slug: 'limpieza-de-playa',
    zoneId: 'zone-1',
    title: 'Limpieza de playa',
    summary: 'Jornadas de limpieza costera',
    description: 'Descripcion larga del proyecto',
    status: 'ACTIVE',
    progress: 40,
    targetDate: new Date('2026-12-01T00:00:00.000Z'),
    lat: -34.6,
    lng: -58.4,
    coverKey: 'projects/limpieza.jpg',
    createdById: null,
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    ...overrides,
  });

  const buildPlanRow = (overrides: Partial<Plan> = {}): Plan => ({
    id: 'estandar',
    name: 'Estándar',
    monthlyPrice: 10,
    annualMonthlyPrice: 8,
    annualTotal: 96,
    recommended: true,
    ...overrides,
  });

  const setup = async () => {
    const repository = {
      findPlans: jest.fn(),
      findZones: jest.fn(),
      findZoneBySlug: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CatalogService, CatalogRepository],
    })
      .overrideProvider(CatalogRepository)
      .useValue(repository)
      .compile();

    return {
      service: moduleRef.get(CatalogService),
      repository,
    };
  };

  describe('listZones', () => {
    it('returns zones ordered by `order` ascending as { items, total }', async () => {
      const { service, repository } = await setup();
      const zoneRows: Zone[] = [
        buildZoneRow({ id: 'zone-2', slug: 'sierra', name: 'Sierra', order: 2 }),
        buildZoneRow({ id: 'zone-1', slug: 'costa', name: 'Costa', order: 1 }),
      ];
      // the repository is responsible for the DB-level ordering; the mock
      // returns rows pre-sorted the way `findMany({ orderBy: { order: 'asc' } })`
      // would, so this test asserts the service preserves that order end to end.
      repository.findZones.mockResolvedValue([zoneRows[1], zoneRows[0]]);

      const result = await service.listZones();

      expect(result.total).toBe(2);
      expect(result.items.map((zone: Zone) => zone.order)).toEqual([1, 2]);
      expect(result.items.map((zone: Zone) => zone.slug)).toEqual(['costa', 'sierra']);
    });
  });

  describe('getZoneBySlug', () => {
    it('throws a DomainError with status 404 and code ZONE_NOT_FOUND when the slug does not exist', async () => {
      const { service, repository } = await setup();
      repository.findZoneBySlug.mockResolvedValue(null);

      await expect(service.getZoneBySlug('does-not-exist')).rejects.toMatchObject({
        code: 'ZONE_NOT_FOUND',
        status: 404,
      });
      await expect(service.getZoneBySlug('does-not-exist')).rejects.toBeInstanceOf(DomainError);
    });

    it('returns the zone with its mapped projects when the slug exists', async () => {
      const { service, repository } = await setup();
      const zoneRow: ZoneWithProjects = {
        ...buildZoneRow(),
        projects: [buildProjectRow()],
      };
      repository.findZoneBySlug.mockResolvedValue(zoneRow);

      const result = await service.getZoneBySlug('costa');

      expect(result.slug).toBe('costa');
      expect(result.projects).toHaveLength(1);
      const [project] = result.projects;
      expect(project.targetDate).toBe('2026-12-01T00:00:00.000Z');
      expect(project.createdAt).toBe('2026-01-15T00:00:00.000Z');
      expect(project.coverKey).toBe('projects/limpieza.jpg');
      expect(project.lat).toBe(-34.6);
      expect(project.lng).toBe(-58.4);
      // Prisma-only fields with no equivalent in the shared `Project` contract
      // must not leak through the mapper.
      expect(project).not.toHaveProperty('updatedAt');
      expect(project).not.toHaveProperty('createdById');
    });

    it('maps null optional fields (coverKey, targetDate, lat, lng) to undefined', async () => {
      const { service, repository } = await setup();
      const zoneRow: ZoneWithProjects = {
        ...buildZoneRow(),
        projects: [
          buildProjectRow({
            targetDate: null,
            lat: null,
            lng: null,
            coverKey: null,
          }),
        ],
      };
      repository.findZoneBySlug.mockResolvedValue(zoneRow);

      const result = await service.getZoneBySlug('costa');

      const [project] = result.projects;
      expect(project.targetDate).toBeUndefined();
      expect(project.lat).toBeUndefined();
      expect(project.lng).toBeUndefined();
      expect(project.coverKey).toBeUndefined();
    });
  });

  describe('listPlans', () => {
    it('returns plans mapped to the shared contract as { items, total }', async () => {
      const { service, repository } = await setup();
      repository.findPlans.mockResolvedValue([
        buildPlanRow({ id: 'basico', name: 'Básico', recommended: false }),
        buildPlanRow({ id: 'estandar', name: 'Estándar', recommended: true }),
      ]);

      const result = await service.listPlans();

      expect(result.total).toBe(2);
      expect(result.items).toEqual([
        {
          id: 'basico',
          name: 'Básico',
          monthlyPrice: 10,
          annualMonthlyPrice: 8,
          annualTotal: 96,
          recommended: false,
        },
        {
          id: 'estandar',
          name: 'Estándar',
          monthlyPrice: 10,
          annualMonthlyPrice: 8,
          annualTotal: 96,
          recommended: true,
        },
      ]);
    });
  });
});
