import type { Notification as PrismaNotification } from '@prisma/client';
import { NotificationType } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import type { NotificationsRepository } from '../infrastructure/notifications.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const buildRow = (overrides: Partial<PrismaNotification> = {}): PrismaNotification => ({
    id: 'notification-1',
    userId: 'user-1',
    type: NotificationType.WELCOME,
    title: 'Bienvenida a One Impact',
    body: 'Hola Ana, gracias por sumarte a One Impact.',
    refId: 'user-1',
    readAt: null,
    createdAt: new Date('2026-08-15T12:00:00.000Z'),
    ...overrides,
  });

  describe('listMine', () => {
    it('reports the notifications ordered by createdAt desc and the total', async () => {
      // `findManyByUser` already orders `desc` at the query level
      // (`NotificationsRepository`, `orderBy: { createdAt: 'desc' }`); this
      // asserts the service preserves that order instead of re-sorting or
      // reversing it while mapping to `NotificationItem`.
      const newer = buildRow({
        id: 'notification-2',
        createdAt: new Date('2026-08-10T00:00:00.000Z'),
      });
      const older = buildRow({
        id: 'notification-1',
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      const repository = {
        findManyByUser: jest.fn().mockResolvedValue([newer, older]),
        countByUser: jest.fn().mockResolvedValue(2),
      };
      const service = new NotificationsService(repository as unknown as NotificationsRepository);

      const result = await service.listMine('user-1');

      expect(repository.findManyByUser).toHaveBeenCalledWith('user-1');
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.id)).toEqual(['notification-2', 'notification-1']);
      expect(result.items.map((item) => item.createdAt)).toEqual([
        '2026-08-10T00:00:00.000Z',
        '2026-08-01T00:00:00.000Z',
      ]);
    });
  });

  describe('markRead', () => {
    it("marks the caller's own notification as read", async () => {
      const row = buildRow({ readAt: new Date('2026-08-20T00:00:00.000Z') });
      const repository = { markRead: jest.fn().mockResolvedValue(row) };
      const service = new NotificationsService(repository as unknown as NotificationsRepository);

      const result = await service.markRead('user-1', 'notification-1');

      expect(repository.markRead).toHaveBeenCalledWith('user-1', 'notification-1');
      expect(result.readAt).toBe('2026-08-20T00:00:00.000Z');
    });

    it('throws NOTIFICATION_NOT_FOUND for a notification that belongs to another user (IDOR)', async () => {
      // `NotificationsRepository.markRead` filters by BOTH `id` and `userId`
      // in the query itself, so it returns `null` here exactly as it would
      // for an id that does not exist at all -- the service cannot (and must
      // not) tell the two cases apart.
      const repository = { markRead: jest.fn().mockResolvedValue(null) };
      const service = new NotificationsService(repository as unknown as NotificationsRepository);

      await expect(service.markRead('someone-else', 'notification-1')).rejects.toThrow(DomainError);
      await expect(service.markRead('someone-else', 'notification-1')).rejects.toMatchObject({
        code: 'NOTIFICATION_NOT_FOUND',
        status: 404,
      });
      expect(repository.markRead).toHaveBeenCalledWith('someone-else', 'notification-1');
    });

    it('throws the same NOTIFICATION_NOT_FOUND for an id that does not exist at all', async () => {
      const repository = { markRead: jest.fn().mockResolvedValue(null) };
      const service = new NotificationsService(repository as unknown as NotificationsRepository);

      await expect(service.markRead('user-1', 'does-not-exist')).rejects.toMatchObject({
        code: 'NOTIFICATION_NOT_FOUND',
        status: 404,
      });
    });
  });
});
