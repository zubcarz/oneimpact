import { NotificationType } from '@oneimpact/shared';
import { EventName } from '../../../infra/events/event-names';
import type { UpsertNotificationInput } from '../infrastructure/notifications.repository';
import { NotificationsRepository } from '../infrastructure/notifications.repository';
import type {
  ProjectUpdatePublishedEvent,
  SubscriptionActivatedEvent,
  UserRegisteredEvent,
} from './notifications.listener';
import { NotificationsListener } from './notifications.listener';

describe('NotificationsListener', () => {
  /**
   * Fake repository that behaves like a real Postgres `upsert` on the
   * `[userId, type, refId]` natural key: keying an in-memory `Map` on
   * exactly that triple and always overwriting (never adding) lets these
   * tests assert the actual invariant -- "one row survives two deliveries"
   * -- instead of only asserting the repository was called. Same pattern as
   * `ImpactListener`'s spec.
   */
  const buildFakeRepository = () => {
    const store = new Map<string, UpsertNotificationInput>();
    const upsertNotification = jest.fn((input: UpsertNotificationInput) => {
      const key = `${input.userId}::${input.type}::${input.refId}`;
      store.set(key, input);
      return Promise.resolve({
        id: 'notification-1',
        ...input,
        readAt: null,
        createdAt: new Date(),
      });
    });
    const findProjectTitle = jest.fn().mockResolvedValue({ title: 'Rio Limpio' });
    const findFollowerIds = jest.fn().mockResolvedValue(['user-1']);
    return { store, upsertNotification, findProjectTitle, findFollowerIds };
  };

  const buildRegisteredEvent = (
    overrides: Partial<UserRegisteredEvent['payload']> = {},
  ): UserRegisteredEvent => ({
    type: EventName.USER_REGISTERED,
    occurredAt: new Date('2026-08-15T12:00:00.000Z'),
    payload: { userId: 'user-1', name: 'Ana', ...overrides },
  });

  const buildActivatedEvent = (
    overrides: Partial<SubscriptionActivatedEvent['payload']> = {},
  ): SubscriptionActivatedEvent => ({
    type: EventName.SUBSCRIPTION_ACTIVATED,
    occurredAt: new Date('2026-08-15T12:00:00.000Z'),
    payload: { userId: 'user-1', subscriptionId: 'sub-1', ...overrides },
  });

  const buildUpdatePublishedEvent = (
    overrides: Partial<ProjectUpdatePublishedEvent['payload']> = {},
  ): ProjectUpdatePublishedEvent => ({
    type: EventName.PROJECT_UPDATE_PUBLISHED,
    occurredAt: new Date('2026-08-15T12:00:00.000Z'),
    payload: { projectId: 'project-1', updateId: 'update-1', ...overrides },
  });

  describe('user.registered -> WELCOME', () => {
    it('delivering the same event twice leaves exactly one notification', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);
      const event = buildRegisteredEvent();

      await listener.handleUserRegistered(event);
      await listener.handleUserRegistered(event);

      expect(repository.store.size).toBe(1);
      expect(repository.upsertNotification).toHaveBeenCalledTimes(2);
    });

    it('uses a non-null refId (the userId itself)', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);

      await listener.handleUserRegistered(buildRegisteredEvent());

      expect(repository.upsertNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.WELCOME, refId: 'user-1' }),
      );
      const [[input]] = repository.upsertNotification.mock.calls;
      expect(input.refId).not.toBeNull();
      expect(input.refId).not.toBeUndefined();
    });

    it('does not throw toward the emitter when the repository fails', async () => {
      const upsertNotification = jest.fn().mockRejectedValue(new Error('db unavailable'));
      const listener = new NotificationsListener({
        upsertNotification,
      } as unknown as NotificationsRepository);

      await expect(listener.handleUserRegistered(buildRegisteredEvent())).resolves.toBeUndefined();
    });
  });

  describe('subscription.activated -> SUBSCRIPTION', () => {
    it('delivering the same event twice leaves exactly one notification', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);
      const event = buildActivatedEvent();

      await listener.handleSubscriptionActivated(event);
      await listener.handleSubscriptionActivated(event);

      expect(repository.store.size).toBe(1);
      expect(repository.upsertNotification).toHaveBeenCalledTimes(2);
    });

    it('uses a non-null refId (the subscriptionId)', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);

      await listener.handleSubscriptionActivated(buildActivatedEvent());

      expect(repository.upsertNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.SUBSCRIPTION, refId: 'sub-1' }),
      );
      const [[input]] = repository.upsertNotification.mock.calls;
      expect(input.refId).not.toBeNull();
      expect(input.refId).not.toBeUndefined();
    });

    it('does not throw toward the emitter when the repository fails', async () => {
      const upsertNotification = jest.fn().mockRejectedValue(new Error('db unavailable'));
      const listener = new NotificationsListener({
        upsertNotification,
      } as unknown as NotificationsRepository);

      await expect(
        listener.handleSubscriptionActivated(buildActivatedEvent()),
      ).resolves.toBeUndefined();
    });
  });

  describe('project.update_published -> PROJECT_UPDATE', () => {
    it('delivering the same event twice leaves exactly one notification per follower', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);
      const event = buildUpdatePublishedEvent();

      await listener.handleProjectUpdatePublished(event);
      await listener.handleProjectUpdatePublished(event);

      expect(repository.store.size).toBe(1);
      expect(repository.upsertNotification).toHaveBeenCalledTimes(2);
    });

    it('uses a non-null refId (the updateId)', async () => {
      const repository = buildFakeRepository();
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);

      await listener.handleProjectUpdatePublished(buildUpdatePublishedEvent());

      expect(repository.upsertNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.PROJECT_UPDATE, refId: 'update-1' }),
      );
      const [[input]] = repository.upsertNotification.mock.calls;
      expect(input.refId).not.toBeNull();
      expect(input.refId).not.toBeUndefined();
    });

    it('creates one notification per follower, titled in Spanish with the project name', async () => {
      const repository = buildFakeRepository();
      repository.findFollowerIds.mockResolvedValue(['user-1', 'user-2']);
      const listener = new NotificationsListener(repository as unknown as NotificationsRepository);

      await listener.handleProjectUpdatePublished(buildUpdatePublishedEvent());

      expect(repository.upsertNotification).toHaveBeenCalledTimes(2);
      expect(repository.upsertNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', title: 'Nuevo avance en Rio Limpio' }),
      );
      expect(repository.upsertNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-2', title: 'Nuevo avance en Rio Limpio' }),
      );
    });

    it('does not throw toward the emitter when the repository fails', async () => {
      const findProjectTitle = jest.fn().mockRejectedValue(new Error('db unavailable'));
      const findFollowerIds = jest.fn().mockResolvedValue([]);
      const listener = new NotificationsListener({
        findProjectTitle,
        findFollowerIds,
      } as unknown as NotificationsRepository);

      await expect(
        listener.handleProjectUpdatePublished(buildUpdatePublishedEvent()),
      ).resolves.toBeUndefined();
    });
  });
});
