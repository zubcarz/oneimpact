import { Injectable } from '@nestjs/common';
import type { Plan, Zone, Project } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export type ZoneWithProjects = Zone & { projects: Project[] };

/**
 * Only place in the `catalog` module allowed to touch `PrismaService`.
 * `CatalogService` (application layer) never imports Prisma directly.
 */
@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany();
  }

  findZones(): Promise<Zone[]> {
    return this.prisma.zone.findMany({ orderBy: { order: 'asc' } });
  }

  findZoneBySlug(slug: string): Promise<ZoneWithProjects | null> {
    return this.prisma.zone.findUnique({
      where: { slug },
      include: { projects: true },
    });
  }
}
