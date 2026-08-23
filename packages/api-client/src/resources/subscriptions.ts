import { API_PATHS } from '@oneimpact/shared';
import type { CreateSubscriptionInput, Subscription } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createSubscriptionsResource(request: RequestFn) {
  return {
    create: (input: CreateSubscriptionInput) =>
      request<Subscription>(API_PATHS.subscriptions, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // No active subscription is a 404 SUBSCRIPTION_NOT_FOUND, not a 2xx null body.
    me: () => request<Subscription>(API_PATHS.subscriptionsMe),
    cancel: () => request<void>(API_PATHS.subscriptionsMe, { method: 'DELETE' }),
  };
}
