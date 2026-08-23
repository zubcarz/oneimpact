import { Injectable } from '@nestjs/common';
import type { NotificationItem } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { toNotification } from '../infrastructure/notifications.mapper';
import { NotificationsRepository } from '../infrastructure/notifications.repository';

export interface NotificationsList {
  items: NotificationItem[];
  total: number;
}

/**
 * Application service behind `GET /v1/notifications/me` and
 * `PATCH /v1/notifications/:id/read`.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async listMine(userId: string): Promise<NotificationsList> {
    const [rows, total] = await Promise.all([
      this.repository.findManyByUser(userId),
      this.repository.countByUser(userId),
    ]);
    return { items: rows.map(toNotification), total };
  }

  /**
   * 404 `NOTIFICATION_NOT_FOUND` both when `id` does not exist at all AND
   * when it belongs to a different user. This is deliberate, not an
   * oversight: `NotificationsRepository.markRead` filters by BOTH `id` and
   * `userId` IN the query (see its class doc), so this service never
   * receives a row it would then have to check ownership on -- it only ever
   * sees "updated" or "not mine to update", and both surface as the exact
   * same 404. If a caller could distinguish "does not exist" from "exists
   * but is not yours", that difference alone would let an attacker enumerate
   * other users' notification ids (an IDOR through the error response
   * itself, even with the write correctly blocked).
   */
  async markRead(userId: string, id: string): Promise<NotificationItem> {
    const updated = await this.repository.markRead(userId, id);
    if (!updated) {
      throw DomainError.notFound('NOTIFICATION_NOT_FOUND', 'La notificacion no existe.');
    }
    return toNotification(updated);
  }
}
