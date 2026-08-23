import { Injectable } from '@nestjs/common';
import type { Prisma, Project, ProjectUpdate, Zone } from '@prisma/client';
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

/** Input for `ProjectsRepository.create`. Named `*Data` (not `CreateProjectInput`) to avoid colliding with the `@oneimpact/shared` schema type of the same shape but different fields (that one has `zoneSlug`, not `zoneId`). */
export interface CreateProjectData {
  slug: string;
  zoneId: string;
  title: string;
  summary: string;
  description: string;
  status: Project['status'];
  progress: number;
  targetDate?: Date;
  lat?: number;
  lng?: number;
  coverKey?: string;
  createdById: string;
}

/** Input for `ProjectsRepository.update`. Every field optional: `PATCH` semantics, undefined fields are left untouched by Prisma. */
export interface UpdateProjectData {
  title?: string;
  summary?: string;
  description?: string;
  status?: Project['status'];
  progress?: number;
  targetDate?: Date;
  lat?: number;
  lng?: number;
  coverKey?: string;
}

export interface CreateProjectUpdateData {
  projectId: string;
  title: string;
  body: string;
  progress: number;
  /** See `ProjectsWritesService.publishUpdate` doc for why this is called `mediaKey` here but `mediaUrl` on the input side. */
  mediaKey?: string;
  authorId?: string;
}

/**
 * Only place in the `projects` module allowed to touch `PrismaService`.
 * `ProjectsService` and `ProjectsWritesService` (application layer) never
 * import Prisma directly, except for the `Prisma.TransactionClient` TYPE
 * threaded through `runTransaction`, same pattern as
 * `subscriptions.repository.ts`.
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

  findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  /**
   * Resolves a `Zone.id` from its `slug`. Queried directly against `Zone`
   * (not filtered through `Project`, unlike `findMany` above) because at
   * creation time there is no project row yet to filter by. This stays a
   * plain Prisma lookup in this module's own repository -- no `CatalogService`
   * injection -- per the plan's explicit instruction.
   */
  async findZoneIdBySlug(zoneSlug: string): Promise<string | null> {
    const zone = await this.prisma.zone.findUnique({
      where: { slug: zoneSlug },
      select: { id: true },
    });
    return zone?.id ?? null;
  }

  /** Used by `ProjectsWritesService` to resolve slug collisions before creating. */
  async slugExists(slug: string): Promise<boolean> {
    const found = await this.prisma.project.findUnique({ where: { slug }, select: { id: true } });
    return found !== null;
  }

  /**
   * Runs `work` inside a single Prisma transaction and returns whatever it
   * resolves to, same pattern as `subscriptions.repository.ts`'s
   * `runTransaction`: callers use it to write a row and publish the domain
   * event with the same transaction handle.
   */
  runTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  create(tx: Prisma.TransactionClient, data: CreateProjectData): Promise<Project> {
    return tx.project.create({ data });
  }

  update(id: string, data: UpdateProjectData): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  createUpdate(
    tx: Prisma.TransactionClient,
    data: CreateProjectUpdateData,
  ): Promise<ProjectUpdate> {
    return tx.projectUpdate.create({ data });
  }

  async updateProgress(
    tx: Prisma.TransactionClient,
    projectId: string,
    progress: number,
  ): Promise<void> {
    await tx.project.update({ where: { id: projectId }, data: { progress } });
  }
}
