import { Module } from '@nestjs/common';
import { NotificationsListener } from './application/notifications.listener';
import { NotificationsService } from './application/notifications.service';
import { NotificationsRepository } from './infrastructure/notifications.repository';
import { NotificationsController } from './controllers/notifications.controller';

/**
 * No domain-module imports: `NotificationsRepository` reads `ProjectFollow`
 * and `Project` rows straight through Prisma for the `project.update_published`
 * fan-out (permitted, see its class doc), never through `projects`'s
 * `FollowsService`/`ProjectsWritesService`. All three listeners react purely
 * by event -- `auth`, `subscriptions` and `projects` never import anything
 * from this module, and this module never imports anything from them.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsListener, NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
