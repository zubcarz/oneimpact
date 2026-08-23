import { Test } from '@nestjs/testing';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { FollowsRepository } from '../infrastructure/follows.repository';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  const setup = async () => {
    const repository = {
      projectExists: jest.fn().mockResolvedValue(true),
      upsert: jest.fn(),
      remove: jest.fn(),
    };
    const eventBus = { publish: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [FollowsService, FollowsRepository, EventBus],
    })
      .overrideProvider(FollowsRepository)
      .useValue(repository)
      .overrideProvider(EventBus)
      .useValue(eventBus)
      .compile();

    return {
      service: moduleRef.get(FollowsService),
      repository,
      eventBus,
    };
  };

  describe('follow', () => {
    it('rejects with 404 PROJECT_NOT_FOUND when the project does not exist', async () => {
      const { service, repository, eventBus } = await setup();
      repository.projectExists.mockResolvedValue(false);

      await expect(service.follow('user-1', 'does-not-exist')).rejects.toMatchObject({
        code: 'PROJECT_NOT_FOUND',
        status: 404,
      });
      expect(repository.upsert).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('is idempotent: calling it twice for the same pair only ever upserts, never fails', async () => {
      const { service, repository } = await setup();

      await service.follow('user-1', 'project-1');
      await service.follow('user-1', 'project-1');

      expect(repository.upsert).toHaveBeenCalledTimes(2);
      expect(repository.upsert).toHaveBeenNthCalledWith(1, 'user-1', 'project-1');
      expect(repository.upsert).toHaveBeenNthCalledWith(2, 'user-1', 'project-1');
    });

    it('publishes project.followed with the projectId and userId', async () => {
      const { service, eventBus } = await setup();

      await service.follow('user-1', 'project-1');

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.PROJECT_FOLLOWED,
          payload: { projectId: 'project-1', userId: 'user-1' },
        }),
      );
    });
  });

  describe('unfollow', () => {
    it('rejects with 404 PROJECT_NOT_FOUND when the project does not exist', async () => {
      const { service, repository } = await setup();
      repository.projectExists.mockResolvedValue(false);

      await expect(service.unfollow('user-1', 'does-not-exist')).rejects.toMatchObject({
        code: 'PROJECT_NOT_FOUND',
        status: 404,
      });
    });

    it('does not throw when unfollowing a project that was never followed', async () => {
      const { service, repository } = await setup();

      await expect(service.unfollow('user-1', 'project-1')).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith('user-1', 'project-1');
    });

    it('never publishes an event: there is no project.unfollowed in the event table', async () => {
      const { service, eventBus } = await setup();

      await service.unfollow('user-1', 'project-1');

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
