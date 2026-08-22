import { INestApplication } from '@nestjs/common';
import type { OpenAPIObject, ReferenceObject, SchemaObject } from '@nestjs/swagger';
import { App } from 'supertest/types';
import { createSwaggerDocument } from '../src/infra/swagger/create-swagger-document';
import { createTestApp } from './utils/create-test-app';

jest.setTimeout(60000);

/**
 * Contract paths the plan asks Swagger to document, expressed the way
 * OpenAPI writes path parameters (`{slug}`), not the way expo-router / Nest
 * decorators write them (`:slug`).
 */
const CONTRACT_PATHS = [
  '/v1/plans',
  '/v1/zones',
  '/v1/zones/{slug}',
  '/v1/projects',
  '/v1/projects/{id}',
] as const;

function isReferenceObject(schema: SchemaObject | ReferenceObject): schema is ReferenceObject {
  return '$ref' in schema;
}

/**
 * Resolves a schema that may be a `$ref` into the components.schemas
 * entry it points to. One level is enough here: we only need to inspect
 * top-level `properties`, not walk the full graph.
 */
function resolveSchema(
  document: OpenAPIObject,
  schema: SchemaObject | ReferenceObject,
): SchemaObject {
  if (!isReferenceObject(schema)) {
    return schema;
  }
  const name = schema.$ref.split('/').pop();
  const resolved = name ? document.components?.schemas?.[name] : undefined;
  if (!resolved || isReferenceObject(resolved)) {
    throw new Error(`could not resolve schema ref ${schema.$ref}`);
  }
  return resolved;
}

describe('Swagger document (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  beforeAll(async () => {
    app = await createTestApp();

    // The very function `main.ts` hands to `SwaggerModule.setup`, not a
    // replica of it, so this spec keeps describing the document actually
    // served at /docs as the bootstrap evolves.
    document = createSwaggerDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(CONTRACT_PATHS)('lists %s under the v1 prefix', (path) => {
    expect(document.paths[path]).toBeDefined();
  });

  it('documents exactly the 5 contract endpoints as GET operations', () => {
    for (const path of CONTRACT_PATHS) {
      expect(document.paths[path]?.get).toBeDefined();
    }
  });

  it('does not leave the /v1 prefix off the documented paths', () => {
    // If this fails, `createTestApp()` stopped applying `setGlobalPrefix`
    // the way `main.ts` does; do not relax the assert to match paths
    // without the prefix, that would hide a real regression.
    const paths = Object.keys(document.paths);
    expect(paths.some((path) => path.startsWith('/v1/'))).toBe(true);
    expect(paths).not.toContain('/plans');
  });

  it('documents a non-empty response schema for GET /v1/plans', () => {
    const operation = document.paths['/v1/plans']?.get;
    const okResponse = operation?.responses['200'];
    if (!okResponse || isReferenceObject(okResponse)) {
      throw new Error('expected an inline 200 response for GET /v1/plans');
    }

    const rawSchema = okResponse.content?.['application/json']?.schema;
    if (!rawSchema) {
      throw new Error('expected a JSON schema on the 200 response for GET /v1/plans');
    }
    const schema = resolveSchema(document, rawSchema);

    // `PlanListDto` is a `createZodDto(listResponseSchema(planSchema))`.
    // This is the assert that /docs is actually usable: a DTO that reaches
    // the document without `properties` renders as an empty box, which is
    // how a zod DTO that was never wired up shows.
    expect(schema.properties).toBeDefined();
    expect(Object.keys(schema.properties ?? {}).length).toBeGreaterThan(0);
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties).toHaveProperty('total');
  });
});
