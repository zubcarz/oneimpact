import type { z } from 'zod';
import type {
  subscriptionSchema,
  paymentSchema,
  dashboardSummarySchema,
  notificationSchema,
} from '../schemas/payment';

export type Subscription = z.infer<typeof subscriptionSchema>;

/**
 * Never a field with the full card number (PAN). The server and clients only
 * ever see brand + last4 for a simulated payment.
 */
export type Payment = z.infer<typeof paymentSchema>;

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

/** Named `NotificationItem` to avoid colliding with the DOM `Notification` type. */
export type NotificationItem = z.infer<typeof notificationSchema>;
