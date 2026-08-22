import { Injectable } from '@nestjs/common';
import type { Plan, Zone, Project } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { CatalogRepository } from '../infrastructure/catalog.repository';
import { toPlan, toZone, toProjectSummary } from '../infrastructure/catalog.mapper';

export interface ListResult<T> {
  items: T[];
  total: number;
}

export type ZoneDetail = Zone & { projects: Project[] };

/**
 * `catalog` is the only module the domain rules allow other modules to
 * import directly (read-only). No Prisma import here: everything goes
 * through `CatalogRepository`.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async listPlans(): Promise<ListResult<Plan>> {
    const rows = await this.repository.findPlans();
    const items = rows.map(toPlan);
    return { items, total: items.length };
  }

  async listZones(): Promise<ListResult<Zone>> {
    const rows = await this.repository.findZones();
    const items = rows.map(toZone);
    return { items, total: items.length };
  }

  async getZoneBySlug(slug: string): Promise<ZoneDetail> {
    const row = await this.repository.findZoneBySlug(slug);
    if (!row) {
      throw DomainError.notFound('ZONE_NOT_FOUND', `Zone "${slug}" was not found`);
    }
    return {
      ...toZone(row),
      projects: row.projects.map(toProjectSummary),
    };
  }
}
