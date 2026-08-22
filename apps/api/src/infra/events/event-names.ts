/**
 * The 8 domain event names of the event table
 * (vault `01-Tecnologia-Arquitectura/backend-nest.md`), one constant per row.
 * Format: `dominio.accion`, past tense.
 *
 * Mirrors the `as const` + derived-type pattern used for enums in
 * `packages/shared/src/enums.ts:1-2`, so `EventName` can be used both as a
 * value (`EventName.PROJECT_CREATED`) and as a type (`type: EventName`).
 */
export const EventName = {
  USER_REGISTERED: 'user.registered',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATE_PUBLISHED: 'project.update_published',
  PROJECT_FOLLOWED: 'project.followed',
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];
