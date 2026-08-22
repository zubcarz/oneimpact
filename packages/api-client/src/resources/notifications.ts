import { API_PATHS } from '@oneimpact/shared';
import type { NotificationItem } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createNotificationsResource(request: RequestFn) {
  return {
    me: () => request<{ items: NotificationItem[]; total: number }>(API_PATHS.notificationsMe),
  };
}
