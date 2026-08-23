import { API_PATHS } from '@oneimpact/shared';
import type { Plan } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createPlansResource(request: RequestFn) {
  return {
    // The API returns a paginated list envelope, see PlanListDto
    // (apps/api/src/modules/catalog/controllers/dto/plan.dto.ts) which wraps
    // listResponseSchema(planSchema) around CatalogService.listPlans().
    list: () => request<{ items: Plan[]; total: number }>(API_PATHS.plans),
  };
}
