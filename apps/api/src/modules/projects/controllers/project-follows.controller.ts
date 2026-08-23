import { Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { FollowsService } from '../application/follows.service';

/**
 * `@Controller('projects')` -> mounted under the global `v1` prefix set in
 * `main.ts`, so the real paths are `/v1/projects/:id/follow`. Do NOT prefix
 * the decorators with `/v1`.
 *
 * A THIRD controller sharing the `projects` path prefix, alongside the
 * read-only `ProjectsController` and the ADMIN-only `AdminProjectsController`
 * -- no route collision (distinct methods/sub-paths).
 *
 * Deliberately NOT `@Public()` and carries no `@Roles(...)`: any
 * authenticated user (not just ADMIN) may follow/unfollow a project.
 * `JwtAuthGuard` (global) still requires a valid access token, so an
 * unauthenticated request gets 401.
 *
 * Thin controller: delegates to `FollowsService`, never touches
 * `PrismaService` directly. Both handlers are idempotent (see
 * `FollowsService`), so calling either one twice returns 200 both times
 * instead of erroring on the second call.
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectFollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post(':id/follow')
  @HttpCode(200)
  @ApiOkResponse({ description: 'El usuario ahora sigue el proyecto (idempotente).' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe (`PROJECT_NOT_FOUND`).' })
  async follow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.follows.follow(user.id, id);
  }

  @Delete(':id/follow')
  @HttpCode(200)
  @ApiOkResponse({ description: 'El usuario ya no sigue el proyecto (idempotente).' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe (`PROJECT_NOT_FOUND`).' })
  async unfollow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.follows.unfollow(user.id, id);
  }
}
