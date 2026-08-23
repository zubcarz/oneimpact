import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Project, ProjectUpdate } from '@oneimpact/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ProjectsWritesService } from '../application/projects-writes.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDto } from './dto/project.dto';
import { ProjectUpdateDto } from './dto/project-update.dto';
import { PublishUpdateDto } from './dto/publish-update.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

/**
 * `@Controller('projects')` -> mounted under the global `v1` prefix set in
 * `main.ts`, so the real paths are `/v1/projects`, `/v1/projects/:id` and
 * `/v1/projects/:id/updates`. Do NOT prefix the decorators with `/v1`.
 *
 * A SEPARATE controller from the read-only `ProjectsController`
 * (`projects.controller.ts`), which is `@Public()` at the class level: its
 * own doc explicitly warns that a write endpoint must not inherit that. This
 * controller carries its own class-level `@Roles('ADMIN')` instead, and no
 * `@Public()` anywhere -- `JwtAuthGuard` (global) rejects an unauthenticated
 * request with 401 before `RolesGuard` even runs.
 *
 * Both controllers share the `projects` path prefix on purpose (different
 * HTTP methods / sub-paths, no route collision): Nest supports multiple
 * controllers mounted on the same base path.
 *
 * Thin controller: delegates to `ProjectsWritesService`, never touches
 * `PrismaService` directly.
 */
@ApiTags('projects')
@Roles('ADMIN')
@Controller('projects')
export class AdminProjectsController {
  constructor(private readonly writes: ProjectsWritesService) {}

  @Post()
  @ApiCreatedResponse({ type: ProjectDto })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no es ADMIN.' })
  @ApiResponse({ status: 404, description: 'La zona `zoneSlug` no existe (`ZONE_NOT_FOUND`).' })
  create(
    @Body() body: CreateProjectDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<Project> {
    return this.writes.create(body, admin.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProjectDto })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no es ADMIN.' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe (`PROJECT_NOT_FOUND`).' })
  update(@Param('id') id: string, @Body() body: UpdateProjectDto): Promise<Project> {
    return this.writes.update(id, body);
  }

  @Post(':id/updates')
  @ApiCreatedResponse({ type: ProjectUpdateDto })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no es ADMIN.' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe (`PROJECT_NOT_FOUND`).' })
  publishUpdate(
    @Param('id') id: string,
    @Body() body: PublishUpdateDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<ProjectUpdate> {
    return this.writes.publishUpdate(id, body, admin.id);
  }
}
