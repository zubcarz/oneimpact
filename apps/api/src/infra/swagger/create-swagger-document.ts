import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/**
 * Builds the OpenAPI document served at /docs.
 *
 * It lives outside `main.ts` so the e2e spec asserts the document the API
 * actually ships rather than a copy of it -- a copy drifts, and would keep
 * passing after the real bootstrap changed.
 *
 * `cleanupOpenApiDoc` is the post-processing step nestjs-zod v5 documents for
 * zod-backed DTOs (it replaced `patchNestJsSwagger()`); it normalises the
 * document for the target OpenAPI version, mainly how nullable fields are
 * expressed. Measured on this document it is not what makes `createZodDto`
 * responses render: those come out fully described either way.
 */
export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('One Impact API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();

  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
