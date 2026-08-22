import type {
  Plan as PrismaPlan,
  Zone as PrismaZone,
  Project as PrismaProject,
} from '@prisma/client';
import type { Plan, Zone, Project } from '@oneimpact/shared';

/**
 * Prisma -> `@oneimpact/shared` contract mappers for the `catalog` module.
 *
 * Every function below MUST keep its explicit return type annotation
 * (`: Plan`, `: Zone`, `: Project`). Without it, forgetting to map a field
 * (or leaking a Prisma-only field like `updatedAt`/`createdById`) would not
 * be caught by the typecheck.
 */

export function toPlan(row: PrismaPlan): Plan {
  return {
    id: row.id,
    name: row.name,
    monthlyPrice: row.monthlyPrice,
    annualMonthlyPrice: row.annualMonthlyPrice,
    annualTotal: row.annualTotal,
    recommended: row.recommended,
  };
}

export function toZone(row: PrismaZone): Zone {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageKey: row.imageKey,
    order: row.order,
  };
}

/**
 * Summarized `Project` as used in list/embedded contexts (e.g. a zone's
 * `projects`). Deliberately drops Prisma-only fields with no equivalent in
 * the shared `Project` contract: `updatedAt`, `createdById`.
 */
export function toProjectSummary(row: PrismaProject): Project {
  return {
    id: row.id,
    slug: row.slug,
    zoneId: row.zoneId,
    title: row.title,
    summary: row.summary,
    description: row.description,
    status: row.status,
    progress: row.progress,
    targetDate: row.targetDate?.toISOString(),
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    coverKey: row.coverKey ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
