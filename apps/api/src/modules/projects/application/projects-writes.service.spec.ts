import { Test } from '@nestjs/testing';
import type { CreateProjectInput, PublishUpdateInput, UpdateProjectInput } from '@oneimpact/shared';
import { ProjectStatus } from '@oneimpact/shared';
import type { Project, ProjectUpdate } from '@prisma/client';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { ProjectsRepository } from '../infrastructure/projects.repository';
import { ProjectsWritesService } from './projects-writes.service';

describe('ProjectsWritesService', () => {
  const buildCreateInput = (overrides: Partial<CreateProjectInput> = {}): CreateProjectInput => ({
    title: 'Reforestacion en Borneo',
    summary: 'Recuperacion de la selva tropical',
    description: 'Descripcion larga del proyecto de reforestacion',
    zoneSlug: 'borneo',
    status: ProjectStatus.ACTIVE,
    progress: 0,
    ...overrides,
  });

  const buildProjectRow = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    slug: 'reforestacion-en-borneo',
    zoneId: 'zone-1',
    title: 'Reforestacion en Borneo',
    summary: 'Recuperacion de la selva tropical',
    description: 'Descripcion larga del proyecto de reforestacion',
    status: ProjectStatus.ACTIVE,
    progress: 0,
    targetDate: null,
    lat: null,
    lng: null,
    coverKey: null,
    createdById: 'admin-1',
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    ...overrides,
  });

  const buildProjectUpdateRow = (overrides: Partial<ProjectUpdate> = {}): ProjectUpdate => ({
    id: 'update-1',
    projectId: 'project-1',
    title: 'Primer avance',
    body: 'Se plantaron los primeros arboles',
    progress: 40,
    mediaKey: null,
    publishedAt: new Date('2026-02-01T00:00:00.000Z'),
    authorId: 'admin-1',
    ...overrides,
  });

  const setup = async () => {
    const repository = {
      findZoneIdBySlug: jest.fn(),
      slugExists: jest.fn().mockResolvedValue(false),
      runTransaction: jest.fn((work: (tx: unknown) => Promise<unknown>) => work({})),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      createUpdate: jest.fn(),
      updateProgress: jest.fn(),
    };
    const eventBus = { publish: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [ProjectsWritesService, ProjectsRepository, EventBus],
    })
      .overrideProvider(ProjectsRepository)
      .useValue(repository)
      .overrideProvider(EventBus)
      .useValue(eventBus)
      .compile();

    return {
      service: moduleRef.get(ProjectsWritesService),
      repository,
      eventBus,
    };
  };

  describe('create', () => {
    it('derives a slug from the title, stripping accents and symbols and collapsing dashes', async () => {
      const { service, repository } = await setup();
      repository.findZoneIdBySlug.mockResolvedValue('zone-1');
      repository.create.mockResolvedValue(buildProjectRow());

      await service.create(buildCreateInput({ title: 'Árbol   Grande!! (Selva)' }), 'admin-1');

      expect(repository.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: 'arbol-grande-selva' }),
      );
    });

    it('disambiguates the slug with a numeric suffix when it already exists', async () => {
      const { service, repository } = await setup();
      repository.findZoneIdBySlug.mockResolvedValue('zone-1');
      repository.slugExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      repository.create.mockResolvedValue(buildProjectRow({ slug: 'reforestacion-en-borneo-2' }));

      await service.create(buildCreateInput(), 'admin-1');

      expect(repository.slugExists).toHaveBeenNthCalledWith(1, 'reforestacion-en-borneo');
      expect(repository.slugExists).toHaveBeenNthCalledWith(2, 'reforestacion-en-borneo-2');
      expect(repository.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: 'reforestacion-en-borneo-2' }),
      );
    });

    it('keeps trying incrementing suffixes while the slug keeps colliding', async () => {
      const { service, repository } = await setup();
      repository.findZoneIdBySlug.mockResolvedValue('zone-1');
      repository.slugExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      repository.create.mockResolvedValue(buildProjectRow({ slug: 'reforestacion-en-borneo-3' }));

      await service.create(buildCreateInput(), 'admin-1');

      expect(repository.slugExists).toHaveBeenNthCalledWith(3, 'reforestacion-en-borneo-3');
      expect(repository.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: 'reforestacion-en-borneo-3' }),
      );
    });

    it('resolves zoneId from zoneSlug and rejects with 404 ZONE_NOT_FOUND when the zone does not exist', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findZoneIdBySlug.mockResolvedValue(null);

      await expect(
        service.create(buildCreateInput({ zoneSlug: 'no-existe' }), 'admin-1'),
      ).rejects.toMatchObject({ code: 'ZONE_NOT_FOUND', status: 404 });

      expect(repository.runTransaction).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('creates the project with createdById set to the admin and publishes project.created', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findZoneIdBySlug.mockResolvedValue('zone-1');
      repository.create.mockResolvedValue(buildProjectRow());

      const result = await service.create(buildCreateInput(), 'admin-1');

      expect(result.id).toBe('project-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ zoneId: 'zone-1', createdById: 'admin-1' }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.PROJECT_CREATED,
          payload: { projectId: 'project-1', zoneId: 'zone-1' },
        }),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('rejects with 404 PROJECT_NOT_FOUND when the project does not exist', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(null);

      const input: UpdateProjectInput = { title: 'Nuevo titulo' };

      await expect(service.update('does-not-exist', input)).rejects.toMatchObject({
        code: 'PROJECT_NOT_FOUND',
        status: 404,
      });
    });

    it('updates the project and does not publish any event', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findById.mockResolvedValue(buildProjectRow());
      repository.update.mockResolvedValue(buildProjectRow({ title: 'Nuevo titulo' }));

      const result = await service.update('project-1', { title: 'Nuevo titulo' });

      expect(result.title).toBe('Nuevo titulo');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('publishUpdate', () => {
    const buildPublishInput = (
      overrides: Partial<PublishUpdateInput> = {},
    ): PublishUpdateInput => ({
      title: 'Primer avance',
      body: 'Se plantaron los primeros arboles',
      progress: 40,
      ...overrides,
    });

    it('rejects with 404 PROJECT_NOT_FOUND when the project does not exist', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(null);

      await expect(
        service.publishUpdate('does-not-exist', buildPublishInput(), 'admin-1'),
      ).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND', status: 404 });
    });

    it('creates the update, recalculates Project.progress in the same transaction, and publishes project.update_published', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findById.mockResolvedValue(buildProjectRow());
      repository.createUpdate.mockResolvedValue(buildProjectUpdateRow());

      const result = await service.publishUpdate('project-1', buildPublishInput(), 'admin-1');

      expect(result.id).toBe('update-1');
      expect(repository.runTransaction).toHaveBeenCalledTimes(1);
      expect(repository.createUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projectId: 'project-1',
          progress: 40,
          authorId: 'admin-1',
        }),
      );
      expect(repository.updateProgress).toHaveBeenCalledWith(expect.anything(), 'project-1', 40);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.PROJECT_UPDATE_PUBLISHED,
          payload: { projectId: 'project-1', updateId: 'update-1' },
        }),
        expect.anything(),
      );
    });

    it('stores publishUpdateSchema.mediaUrl verbatim in ProjectUpdate.mediaKey', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(buildProjectRow());
      repository.createUpdate.mockResolvedValue(buildProjectUpdateRow());

      await service.publishUpdate(
        'project-1',
        buildPublishInput({ mediaUrl: 'https://cdn.example.com/updates/1.jpg' }),
        'admin-1',
      );

      expect(repository.createUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mediaKey: 'https://cdn.example.com/updates/1.jpg' }),
      );
    });
  });
});
