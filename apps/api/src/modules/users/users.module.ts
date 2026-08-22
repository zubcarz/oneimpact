import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersListener } from './application/users.listener';
import { UsersRepository } from './infrastructure/users.repository';
import { MeController } from './controllers/me.controller';
import { AdminUsersController } from './controllers/admin-users.controller';

/**
 * Profile, admin user management and the `subscription.activated` listener
 * (onboarding). Not exported: no other module is allowed to import this
 * module's services directly -- see rule 30, "un modulo no importa servicios
 * de otro modulo" (the sole exception is `catalog`).
 */
@Module({
  controllers: [MeController, AdminUsersController],
  providers: [UsersRepository, UsersService, UsersListener],
})
export class UsersModule {}
