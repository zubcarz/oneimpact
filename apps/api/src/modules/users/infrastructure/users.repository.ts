import { Injectable } from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface ListUsersOptions {
  skip: number;
  take: number;
}

export interface ListUsersResult {
  items: User[];
  total: number;
}

/**
 * `User` access scoped to the `users` module (profile, admin listing,
 * roles, onboarding). The `auth` module has its own repository
 * (`AuthUsersRepository`) over the same table for registration/login --
 * modules never share a repository, see rule 30, "un modulo no importa
 * servicios de otro modulo".
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateName(id: string, name: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { name } });
  }

  async list({ skip, take }: ListUsersOptions): Promise<ListUsersResult> {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take, orderBy: { createdAt: 'asc' } }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }

  updateRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  countAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'ADMIN' } });
  }

  /**
   * Setting the same boolean twice yields the same final state, so this is
   * idempotent by construction: no natural-key upsert needed (unlike
   * `JourneyPoint`/`Notification`, see `30-api-event-driven.md`).
   */
  async markOnboardingCompleted(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
  }
}
