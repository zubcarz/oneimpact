import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UserProfile } from '@oneimpact/shared';
import { Role } from '@oneimpact/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UsersService } from '../application/users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserProfileDto, UserProfileListDto } from './dto/user-profile.dto';

/**
 * `@Controller('admin/users')` -> mounted under the global `v1` prefix set
 * in `main.ts`, so the real paths are `/v1/admin/users` and
 * `/v1/admin/users/:id/role`.
 *
 * `@Roles('ADMIN')` at the class level: every handler here requires the
 * caller to be authenticated (implicit, `JwtAuthGuard` runs first) AND hold
 * the `ADMIN` role (`RolesGuard`). A `USER` gets 403, not 404 -- the route
 * exists, the caller is just not allowed to use it.
 */
@ApiTags('users')
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserProfileListDto })
  list(): Promise<{ items: UserProfile[]; total: number }> {
    return this.users.listUsers();
  }

  @Patch(':id/role')
  @ApiOkResponse({ type: UserProfileDto })
  updateRole(@Param('id') id: string, @Body() body: UpdateUserRoleDto): Promise<UserProfile> {
    return this.users.setRole(id, body.role);
  }
}
