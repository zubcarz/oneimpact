import type {
  Billing,
  NotificationType,
  PaymentStatus,
  SubscriptionStatus,
  PlanId,
} from '../enums';
import type { Plan } from '../plans';
import type { CardBrand } from '../schemas/payment';
import type { ProjectUpdate } from './catalog';

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  billing: Billing;
  status: SubscriptionStatus;
  startedAt: string;
  canceledAt?: string;
}

/**
 * Never a field with the full card number (PAN). The server and clients only
 * ever see brand + last4 for a simulated payment.
 */
export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  cardBrand: CardBrand;
  cardLast4: string;
  simulated: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  plan: Plan | null;
  billing: Billing | null;
  status: SubscriptionStatus | null;
  activeMonths: number;
  followedProjects: number;
  latestUpdate?: ProjectUpdate;
}

/** Named `NotificationItem` to avoid colliding with the DOM `Notification` type. */
export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  refId?: string;
  readAt?: string;
  createdAt: string;
}
