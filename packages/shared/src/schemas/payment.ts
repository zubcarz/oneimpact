import { z } from 'zod';
import { Billing, PlanId } from '../enums';

export const cardBrandSchema = z.enum(['visa', 'mastercard', 'amex', 'unknown']);
export type CardBrand = z.infer<typeof cardBrandSchema>;

/** What the server receives. The full PAN never leaves the device (simulated payment). */
export const simulatedCardSchema = z.object({
  brand: cardBrandSchema,
  last4: z.string().regex(/^\d{4}$/),
  holder: z.string().min(2).max(80),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2100),
});
export type SimulatedCard = z.infer<typeof simulatedCardSchema>;

export const createSubscriptionSchema = z.object({
  planId: z.enum([PlanId.BASICO, PlanId.ESTANDAR, PlanId.PREMIUM]),
  billing: z.enum([Billing.MONTHLY, Billing.ANNUAL]),
  card: simulatedCardSchema,
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

/** Luhn check, run client-side before discarding the PAN. */
export function isValidLuhn(pan: string): boolean {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(pan: string): CardBrand {
  const d = pan.replace(/\D/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return 'unknown';
}
