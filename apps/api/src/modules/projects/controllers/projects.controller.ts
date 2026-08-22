import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectStatus } from '@oneimpact/shared';
import { Public } from '../../../common/decorators/public.decorator';
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
 * `@Public()`: both handlers here are read-only project listings, browsable
 * before registering or logging in. If a write endpoint (follow, admin
 * create/update) is added to this controller later, it must NOT inherit this
 * class-level `@Public()` -- give it its own `@Roles(...)` instead.
 *
 * Thin controller: delegates to `ProjectsService`, never touches
 * `PrismaService` directly. Query validation (`zoneSlug`, `status`) is done
 * by the global zod pipe against `ProjectsQueryDto`, so an invalid query
 * short-circuits with 400 before reaching this handler.
 */
@ApiTags('projects')
@Public()
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
