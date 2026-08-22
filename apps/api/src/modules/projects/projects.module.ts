import { Module } from '@nestjs/common';
import { ProjectsService } from './application/projects.service';
import { ProjectsRepository } from './infrastructure/projects.repository';
import { ProjectsController } from './controllers/projects.controller';

/**
 * Read-only projects module (list + detail with updates).
 *
 * `ProjectsService` is NOT exported: unlike `catalog`, `projects` is not the
 * sanctioned read-only cross-module exception, so it stays private to this
 * module (the controller declared here in the same module can still inject
 * it without an export).
 */
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
})
export class ProjectsModule {}
