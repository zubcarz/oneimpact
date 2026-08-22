import { createZodDto } from 'nestjs-zod';
import { projectSchema, zoneSchema } from '@oneimpact/shared';

/**
 * Response DTO for `GET /v1/zones/:slug`. There is no dedicated
 * "zone with projects" schema in `@oneimpact/shared`, so this composes the
 * existing `zoneSchema` and `projectSchema` here, matching what
 * `CatalogService.getZoneBySlug` returns (`Zone & { projects: Project[] }`,
 * see `packages/api-client/src/resources/zones.ts`).
 */
const zoneDetailSchema = zoneSchema.extend({ projects: projectSchema.array() });

export class ZoneDetailDto extends createZodDto(zoneDetailSchema) {}
