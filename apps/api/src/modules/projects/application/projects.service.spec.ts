import { Test } from '@nestjs/testing';
import type { Project, ProjectUpdate, Zone } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { ProjectsRepository } from '../infrastructure/projects.repository';
import type { ProjectWithUpdatesRow } from '../infrastructure/projects.repository';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const buildZoneRow = (overrides: Partial<Zone> = {}): Zone => ({
    id: 'zone-1',
    slug: 'borneo',
    name: 'Borneo',
    description: 'Proyectos en la selva de Borneo',
    imageKey: 'zones/borneo.jpg',
    order: 1,
    ...overrides,
  });

  const buildProjectRow = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    slug: 'reforestacion-borneo',
    zoneId: 'zone-1',
    title: 'Reforestacion en Borneo',
    summary: 'Recuperacion de la selva tropical',
    description: 'Descripcion larga del proyecto',
    status: 'ACTIVE',
    progress: 55,
    targetDate: new Date('2026-12-01T00:00:00.000Z'),
    lat: -34.6,
    lng: -58.4,
    coverKey: 'projects/reforestacion.jpg',
    createdById: null,
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    ...overrides,
  });

  const buildProjectUpdateRow = (overrides: Partial<ProjectUpdate> = {}): ProjectUpdate => ({
    id: 'reforestacion-borneo-update-1',
    projectId: 'project-1',
    title: 'Primer avance',
    body: 'Se plantaron los primeros arboles',
    progress: 20,
    mediaKey: 'updates/reforestacion-1.jpg',
    publishedAt: new Date('2026-02-01T00:00:00.000Z'),
    authorId: null,
    ...overrides,
  });

  const setup = async () => {
    const repository = {
      findMany: jest.fn(),
      findByIdWithUpdates: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ProjectsService, ProjectsRepository],
    })
      .overrideProvider(ProjectsRepository)
      .useValue(repository)
      .compile();

    return {
      service: moduleRef.get(ProjectsService),
      repository,
    };
  };

  describe('list', () => {
    it('forwards the given filters to the repository exactly as received', async () => {
      const { service, repository } = await setup();
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.list({ zoneSlug: 'borneo', status: 'ACTIVE' });

      expect(repository.findMany).toHaveBeenCalledWith({ zoneSlug: 'borneo', status: 'ACTIVE' });
    });

    it('forwards an empty filter object when no filters are given', async () => {
      const { service, repository } = await setup();
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.list({});

      expect(repository.findMany).toHaveBeenCalledWith({});
    });

    it('returns the mapped items and total from the repository', async () => {
      const { service, repository } = await setup();
      repository.findMany.mockResolvedValue({ items: [buildProjectRow()], total: 1 });

      const result = await service.list({});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe('reforestacion-borneo');
      expect(result.items[0].createdAt).toBe('2026-01-15T00:00:00.000Z');
    });
  });

  describe('getById', () => {
    it('throws a DomainError with status 404 and code PROJECT_NOT_FOUND when the id does not exist', async () => {
      const { service, repository } = await setup();
      repository.findByIdWithUpdates.mockResolvedValue(null);

      await expect(service.getById('does-not-exist')).rejects.toMatchObject({
        code: 'PROJECT_NOT_FOUND',
        status: 404,
      });
      await expect(service.getById('does-not-exist')).rejects.toBeInstanceOf(DomainError);
    });

    it('returns the project mapped to the shared contract, with dates as ISO strings and updates mapped', async () => {
      const { service, repository } = await setup();
      const row: ProjectWithUpdatesRow = {
        ...buildProjectRow(),
        zone: buildZoneRow(),
        updates: [buildProjectUpdateRow()],
      };
      repository.findByIdWithUpdates.mockResolvedValue(row);

      const result = await service.getById('project-1');

      expect(result.id).toBe('project-1');
      expect(result.targetDate).toBe('2026-12-01T00:00:00.000Z');
      expect(result.createdAt).toBe('2026-01-15T00:00:00.000Z');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('createdById');
      expect(result.zone?.slug).toBe('borneo');
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0]).toEqual({
        id: 'reforestacion-borneo-update-1',
        projectId: 'project-1',
        title: 'Primer avance',
        body: 'Se plantaron los primeros arboles',
        progress: 20,
        mediaKey: 'updates/reforestacion-1.jpg',
        publishedAt: '2026-02-01T00:00:00.000Z',
        authorId: undefined,
      });
    });

    it('maps null optional fields (targetDate, lat, lng, coverKey) to undefined', async () => {
      const { service, repository } = await setup();
      const row: ProjectWithUpdatesRow = {
        ...buildProjectRow({ targetDate: null, lat: null, lng: null, coverKey: null }),
        zone: buildZoneRow(),
        updates: [],
      };
      repository.findByIdWithUpdates.mockResolvedValue(row);

      const result = await service.getById('project-1');

      expect(result.targetDate).toBeUndefined();
      expect(result.lat).toBeUndefined();
      expect(result.lng).toBeUndefined();
      expect(result.coverKey).toBeUndefined();
      expect(result.updates).toEqual([]);
    });
  });
});
