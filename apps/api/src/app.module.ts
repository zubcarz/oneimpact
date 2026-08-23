import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateEnv } from './infra/config/env';
import { EventsModule } from './infra/events/events.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ImpactModule } from './modules/impact/impact.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot({ wildcard: true }),
    PrismaModule,
    EventsModule,
    HealthModule,
    // Domain modules (added incrementally): NotificationsModule
    AuthModule,
    CatalogModule,
    ImpactModule,
    PaymentsModule,
    ProjectsModule,
    SubscriptionsModule,
    UsersModule,
  ],
})
export class AppModule {}
