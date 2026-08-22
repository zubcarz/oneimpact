import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateEnv } from './infra/config/env';
import { PrismaModule } from './infra/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot({ wildcard: true }),
    PrismaModule,
    HealthModule,
    // Domain modules (added incrementally): AuthModule, UsersModule, CatalogModule,
    // ProjectsModule, SubscriptionsModule, PaymentsModule, ImpactModule, NotificationsModule
  ],
})
export class AppModule {}
