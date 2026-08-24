import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './common/filters/domain-error.filter';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { createSwaggerDocument } from './infra/swagger/create-swagger-document';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // Swaps Nest's default console logger for the structured pino one
  // (`infra/logging/logging.module.ts`) for the rest of the app's
  // lifetime -- every `new Logger(ClassName)` call site elsewhere keeps
  // working unchanged, it just writes through pino now. `bufferLogs: true`
  // above holds any log emitted before this line so nothing before the
  // logger swap is silently dropped.
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(helmet());
  app.enableCors({ origin: config.get<string>('CORS_ORIGINS', '').split(',') });
  app.setGlobalPrefix('v1', { exclude: ['health', 'docs'] });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new DomainErrorFilter());

  SwaggerModule.setup('docs', app, createSwaggerDocument(app));

  const port = config.get<number>('PORT', 5000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port} (docs at /docs)`);
}
void bootstrap();
