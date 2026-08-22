import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

/**
 * `User` access scoped to the `auth` module (registration and login lookup).
 * Named with an `auth-` prefix on purpose: the `users` module (profile,
 * roles, admin listing) has its own repository over the same table. Modules
 * never share a repository or service -- see rule 30, "un modulo no importa
 * servicios de otro modulo".
 */
@Injectable()
export class AuthUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }
}
