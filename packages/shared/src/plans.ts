import type { Billing, PlanId } from './enums';

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotal: number;
  recommended?: boolean;
}

/** Mirrors the pricing shown on the One Impact web. */
export const PLANS: Plan[] = [
  { id: 'basico', name: 'Básico', monthlyPrice: 5, annualMonthlyPrice: 4, annualTotal: 48 },
  { id: 'estandar', name: 'Estándar', monthlyPrice: 10, annualMonthlyPrice: 8, annualTotal: 96, recommended: true },
  { id: 'premium', name: 'Premium', monthlyPrice: 15, annualMonthlyPrice: 12, annualTotal: 144 },
];

export function monthlyPriceFor(plan: Plan, billing: Billing): number {
  return billing === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;
}
