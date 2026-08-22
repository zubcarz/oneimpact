export const Role = { USER: 'USER', ADMIN: 'ADMIN' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const PlanId = { BASICO: 'basico', ESTANDAR: 'estandar', PREMIUM: 'premium' } as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export const Billing = { MONTHLY: 'monthly', ANNUAL: 'annual' } as const;
export type Billing = (typeof Billing)[keyof typeof Billing];

export const ProjectStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const SubscriptionStatus = { ACTIVE: 'ACTIVE', CANCELED: 'CANCELED' } as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentStatus = { SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED' } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const JourneySource = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  FOLLOW: 'FOLLOW',
  EVENT: 'EVENT',
} as const;
export type JourneySource = (typeof JourneySource)[keyof typeof JourneySource];

export const NotificationType = {
  WELCOME: 'WELCOME',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Mirrored by an equivalent test in apps/api against the Prisma enums. */
export const ENUM_VALUES: Readonly<Record<string, readonly string[]>> = {
  Role: Object.values(Role),
  PlanId: Object.values(PlanId),
  Billing: Object.values(Billing),
  ProjectStatus: Object.values(ProjectStatus),
  SubscriptionStatus: Object.values(SubscriptionStatus),
  PaymentStatus: Object.values(PaymentStatus),
  JourneySource: Object.values(JourneySource),
  NotificationType: Object.values(NotificationType),
};
