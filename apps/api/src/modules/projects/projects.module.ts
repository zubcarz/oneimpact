import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { FollowsService } from './application/follows.service';
import { ProjectsService } from './application/projects.service';
import { ProjectsWritesService } from './application/projects-writes.service';
import { AdminProjectsController } from './controllers/admin-projects.controller';
import { ProjectFollowsController } from './controllers/project-follows.controller';
import { ProjectsController } from './controllers/projects.controller';
import { UploadsController } from './controllers/uploads.controller';
import { FollowsRepository } from './infrastructure/follows.repository';
import { ProjectsRepository } from './infrastructure/projects.repository';

/**
 * Reads AND writes for `projects`: browsing (`ProjectsController`, public),
 * admin writes (`AdminProjectsController`: create/update/publish an update),
 * follows for any authenticated user (`ProjectFollowsController`), and
 * signed upload URLs for project media (`UploadsController`, ADMIN-only, via
 * the imported `StorageModule`).
 *
 * `ProjectsService` (reads) and `ProjectsWritesService`/`FollowsService`
 * (writes) are NOT exported: `projects` is not a sanctioned cross-module
 * read-only exception like `catalog`, so its services stay private to this
 * module -- every controller that needs them is declared here.
 */
@Module({
  imports: [StorageModule],
  controllers: [
    ProjectsController,
    AdminProjectsController,
    ProjectFollowsController,
    UploadsController,
  ],
  providers: [
    ProjectsRepository,
    ProjectsService,
    ProjectsWritesService,
    FollowsRepository,
    FollowsService,
  ],
})
export class ProjectsModule {}
