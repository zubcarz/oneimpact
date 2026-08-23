import { Injectable } from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import type { UpdateProfileInput, UserProfile } from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { UsersRepository } from '../infrastructure/users.repository';

const DEFAULT_LIST_TAKE = 100;

export interface ListUsersResult {
  items: UserProfile[];
  total: number;
}

function toUserProfile(user: User): UserProfile {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Profile (`GET /v1/me`, `PATCH /v1/me`) and admin (`GET /v1/admin/users`,
 * `PATCH /v1/admin/users/:id/role`) use cases. No Prisma import here:
 * everything goes through `UsersRepository`.
 */
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw DomainError.notFound('USER_NOT_FOUND', 'Usuario no encontrado');
    }
    return toUserProfile(user);
  }

  /**
   * `input` is already validated with `updateProfileSchema.strict()` at the
   * controller boundary, so `role` (or any other field) can never reach
   * here -- only `name` is ever written.
   */
  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.repository.updateName(id, input.name);
    return toUserProfile(user);
  }

  async listUsers(): Promise<ListUsersResult> {
    const { items, total } = await this.repository.list({ skip: 0, take: DEFAULT_LIST_TAKE });
    return { items: items.map(toUserProfile), total };
  }

  /**
   * `role` never editable by the user themselves -- this is only reachable
   * from `AdminUsersController`, guarded by `@Roles('ADMIN')`.
   *
   * Refuses to demote the last remaining admin: without this check an admin
   * could lock every admin out of `/admin/*` by demoting themselves (or the
   * only other admin), with no way back short of a manual DB edit.
   */
  async setRole(id: string, role: Role): Promise<UserProfile> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw DomainError.notFound('USER_NOT_FOUND', 'Usuario no encontrado');
    }

    const isDemotingLastAdmin = user.role === 'ADMIN' && role !== 'ADMIN';
    if (isDemotingLastAdmin) {
      const adminCount = await this.repository.countAdmins();
      if (adminCount <= 1) {
        throw new DomainError('LAST_ADMIN', 409, 'No se puede quitar el ultimo administrador');
      }
    }

    const updated = await this.repository.updateRole(id, role);
    return toUserProfile(updated);
  }
}
