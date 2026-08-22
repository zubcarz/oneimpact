import { Injectable } from '@nestjs/common';
import type { Project, ProjectWithUpdates } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { ProjectsRepository } from '../infrastructure/projects.repository';
import type { FindManyProjectsParams } from '../infrastructure/projects.repository';
import { toProject, toProjectWithUpdates } from '../infrastructure/projects.mapper';

export interface ListResult<T> {
  items: T[];
  total: number;
}

/**
 * Read-only application service for the `projects` module. No Prisma import
 * here: everything goes through `ProjectsRepository`. No `CatalogService`
 * injection either: the `zoneSlug` filter is resolved directly in the
 * repository's Prisma query (`zone: { slug }`), so there is no need to reach
 * into the `catalog` module.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  async list(query: FindManyProjectsParams): Promise<ListResult<Project>> {
    const { items, total } = await this.repository.findMany(query);
    return { items: items.map(toProject), total };
  }

  async getById(id: string): Promise<ProjectWithUpdates> {
    const row = await this.repository.findByIdWithUpdates(id);
    if (!row) {
      throw DomainError.notFound('PROJECT_NOT_FOUND', `Project "${id}" was not found`);
    }
    return toProjectWithUpdates(row);
  }
}
