import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { DomainErrorFilter } from '../../src/common/filters/domain-error.filter';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';

/**
 * Builds a Nest test application that replicates the request-affecting parts
 * of `src/main.ts` (global prefix, zod validation pipe, domain error filter).
 * Helmet and CORS are omitted: they do not affect supertest requests.
 *
 * Any e2e spec hitting `/v1/...` must use this helper instead of building the
 * app straight from `AppModule.compile()`, or it gets a 404 from the missing
 * prefix.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('v1', { exclude: ['health', 'docs'] });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new DomainErrorFilter());
  await app.init();

  return app;
}
