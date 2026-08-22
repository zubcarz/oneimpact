import { Injectable } from '@nestjs/common';
import type { Project, ProjectUpdate, Zone } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export type ProjectWithUpdatesRow = Project & { updates: ProjectUpdate[]; zone: Zone };

export interface FindManyProjectsParams {
  zoneSlug?: string;
  status?: Project['status'];
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

/**
 * Only place in the `projects` module allowed to touch `PrismaService`.
 * `ProjectsService` (application layer) never imports Prisma directly.
 */
@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany({ zoneSlug, status }: FindManyProjectsParams): Promise<ListResult<Project>> {
    const where = {
      ...(zoneSlug ? { zone: { slug: zoneSlug } } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ where }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  findByIdWithUpdates(id: string): Promise<ProjectWithUpdatesRow | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        zone: true,
        updates: { orderBy: { publishedAt: 'desc' } },
      },
    });
  }
}
