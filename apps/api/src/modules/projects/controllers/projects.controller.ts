import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectStatus } from '@oneimpact/shared';
import { ProjectsService } from '../application/projects.service';
import { ProjectsQueryDto } from './dto/projects-query.dto';
import { ProjectListDto } from './dto/project.dto';
import { ProjectWithUpdatesDto } from './dto/project-with-updates.dto';

/**
 * `@Controller('projects')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/projects` and `/v1/projects/:id`. Do NOT prefix the decorators with
 * `/v1`.
 *
 * No `@Public()` here: the `auth` module (and its global `JwtAuthGuard`) is
 * not implemented yet, so there is no guard to opt out of.
 *
 * Thin controller: delegates to `ProjectsService`, never touches
 * `PrismaService` directly. Query validation (`zoneSlug`, `status`) is done
 * by the global zod pipe against `ProjectsQueryDto`, so an invalid query
 * short-circuits with 400 before reaching this handler.
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiQuery({ name: 'zoneSlug', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiOkResponse({ type: ProjectListDto })
  async list(@Query() query: ProjectsQueryDto): Promise<ProjectListDto> {
    return this.projects.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProjectWithUpdatesDto })
  getById(@Param('id') id: string): Promise<ProjectWithUpdatesDto> {
    return this.projects.getById(id);
  }
}
