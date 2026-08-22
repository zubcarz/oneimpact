export const Role = { USER: 'USER', ADMIN: 'ADMIN' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const PlanId = { BASICO: 'basico', ESTANDAR: 'estandar', PREMIUM: 'premium' } as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export const Billing = { MONTHLY: 'monthly', ANNUAL: 'annual' } as const;
export type Billing = (typeof Billing)[keyof typeof Billing];

export const ProjectStatus = { PLANNED: 'PLANNED', ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED' } as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const SubscriptionStatus = { ACTIVE: 'ACTIVE', CANCELED: 'CANCELED' } as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
