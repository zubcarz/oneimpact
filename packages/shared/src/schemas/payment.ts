import { z } from 'zod';
import { Billing, NotificationType, PaymentStatus, PlanId, SubscriptionStatus } from '../enums';
import { planSchema, projectUpdateSchema } from './catalog';

export const cardBrandSchema = z.enum(['visa', 'mastercard', 'amex', 'unknown']);
export type CardBrand = z.infer<typeof cardBrandSchema>;

/**
 * `.strict()` es la invariante de "el PAN completo nunca llega al servidor":
 * un payload con `number`/`pan`/`cvv` extra debe fallar la validacion (400)
 * en lugar de ser descartado silenciosamente, que dejaria el PAN crudo en el
 * body HTTP y al alcance del logger.
 */
export const simulatedCardSchema = z
  .object({
    brand: cardBrandSchema,
    last4: z.string().regex(/^\d{4}$/),
    holder: z.string().min(2).max(80),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(2024).max(2100),
  })
  .strict();
export type SimulatedCard = z.infer<typeof simulatedCardSchema>;

export const createSubscriptionSchema = z
  .object({
    planId: z.enum([PlanId.BASICO, PlanId.ESTANDAR, PlanId.PREMIUM]),
    billing: z.enum([Billing.MONTHLY, Billing.ANNUAL]),
    card: simulatedCardSchema,
  })
  .strict();
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

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.enum([PlanId.BASICO, PlanId.ESTANDAR, PlanId.PREMIUM]),
  billing: z.enum([Billing.MONTHLY, Billing.ANNUAL]),
  status: z.enum([SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED]),
  startedAt: z.iso.datetime(),
  canceledAt: z.iso.datetime().optional(),
});

export const paymentSchema = z.object({
  id: z.string(),
  subscriptionId: z.string().optional(),
  userId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum([PaymentStatus.SUCCEEDED, PaymentStatus.FAILED]),
  cardBrand: cardBrandSchema,
  cardLast4: z.string().regex(/^\d{4}$/),
  simulated: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const dashboardSummarySchema = z.object({
  plan: planSchema.nullable(),
  billing: z.enum([Billing.MONTHLY, Billing.ANNUAL]).nullable(),
  status: z.enum([SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED]).nullable(),
  activeMonths: z.number(),
  followedProjects: z.number(),
  followedProjectIds: z.array(z.string()),
  latestUpdate: projectUpdateSchema.optional(),
  journeyPoints: z.number(),
  unreadNotifications: z.number(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    NotificationType.WELCOME,
    NotificationType.PROJECT_UPDATE,
    NotificationType.SUBSCRIPTION,
  ]),
  title: z.string(),
  body: z.string(),
  refId: z.string().optional(),
  readAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
});

export const uploadSignSchema = z.object({
  filename: z.string().min(1, 'El nombre del archivo es requerido'),
  contentType: z.string().min(1, 'El tipo de contenido es requerido'),
});
export type UploadSignInput = z.infer<typeof uploadSignSchema>;

export const signedUploadSchema = z.object({
  uploadUrl: z.string(),
  key: z.string(),
  expiresAt: z.iso.datetime(),
  simulated: z.boolean(),
});
export type SignedUpload = z.infer<typeof signedUploadSchema>;
