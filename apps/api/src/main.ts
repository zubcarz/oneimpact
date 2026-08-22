import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './common/filters/domain-error.filter';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { createSwaggerDocument } from './infra/swagger/create-swagger-document';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string>('CORS_ORIGINS', '').split(',') });
  app.setGlobalPrefix('v1', { exclude: ['health', 'docs'] });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new DomainErrorFilter());

  SwaggerModule.setup('docs', app, createSwaggerDocument(app));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port} (docs at /docs)`);
}
void bootstrap();
