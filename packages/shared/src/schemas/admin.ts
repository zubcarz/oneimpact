import { z } from 'zod';
import { PlanId, ProjectStatus } from '../enums';

export const outboxEventStatusSchema = z.enum(['PENDING', 'PROCESSED', 'FAILED']);

export const outboxEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: outboxEventStatusSchema,
  attempts: z.number(),
  lastError: z.string().optional(),
  createdAt: z.iso.datetime(),
  processedAt: z.iso.datetime().optional(),
});

/**
 * `GET /v1/admin/metrics` response. `activeSubscriptionsByPlan` and
 * `projectsByStatus` are records keyed by EVERY value of `PlanId`/
 * `ProjectStatus`, not just the ones present in the DB right now --
 * `AdminMetricsRepository` fills absent groups with `0` so a plan/status
 * with no rows still shows up (see its class doc for why that matters).
 */
export const adminMetricsSchema = z.object({
  users: z.number(),
  activeSubscriptionsByPlan: z.record(
    z.enum([PlanId.BASICO, PlanId.ESTANDAR, PlanId.PREMIUM]),
    z.number(),
  ),
  mrrSimulated: z.number(),
  projectsByStatus: z.record(
    z.enum([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED]),
    z.number(),
  ),
  updatesLast30Days: z.number(),
  avgProgressByZone: z.array(
    z.object({
      zoneId: z.string(),
      zoneSlug: z.string(),
      zoneName: z.string(),
      avgProgress: z.number(),
    }),
  ),
  generatedAt: z.iso.datetime(),
});
