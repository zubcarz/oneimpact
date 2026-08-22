# Spec 02 -- api-catalog-and-projects

**Track**: api · **Depende de**: 01 · **Ola**: 1 (paralelo con 03 y 04)
**Rama**: `feat/api-catalog-and-projects` · **Modo**: `/run-plan-worktree`

## Objetivo

Primeros endpoints reales y publicos de la API: planes, zonas y proyectos con
sus avances. Establece el patron de modulo (controller fino, use case,
repositorio Prisma, errores tipados, `{items,total}`) que 05/06/12 copian.

## Alcance

### Infra comun (una sola vez)
- `src/common/errors/domain-error.ts` (`DomainError(code, status, message)`) + `src/common/filters/domain-error.filter.ts` global.
- `src/common/pipes/zod-validation.pipe.ts` via `nestjs-zod` + `ZodValidationPipe` global en `main.ts`.
- `src/common/decorators/public.decorator.ts` (para que 05 lo use; por ahora todo es publico por defecto -- 05 invierte el default).
- `src/infra/events/event-names.ts` con **todos** los nombres de la tabla del vault y `event-bus.ts` (`publish` = `emitAsync` por ahora; firma `publish(event, tx?)` estable para que 12 agregue outbox sin tocar modulos).
- `test/enums.spec.ts`: compara enums de Prisma vs `@oneimpact/shared`.

### Modulo `catalog`
- `GET /v1/plans` -> `Plan[]` (desde DB, no desde `PLANS` de shared).
- `GET /v1/zones` -> `{ items: Zone[], total }` ordenado por `order`.
- `GET /v1/zones/:slug` -> `Zone` + `projects` resumidos. 404 `ZONE_NOT_FOUND`.
- `CatalogService` exportado (unica dependencia cross-modulo permitida).

### Modulo `projects` (solo lectura en este spec)
- `GET /v1/projects?zone=<slug>&status=<ACTIVE|PLANNED|COMPLETED>` -> `{items,total}`.
- `GET /v1/projects/:id` -> `ProjectWithUpdates` (updates ordenados desc). 404 `PROJECT_NOT_FOUND`.
- Repositorio con `findMany` filtrable y `findByIdWithUpdates`.
- Dominio: `domain/projects.events.ts` con tipos de payload de `project.created`, `project.update_published`, `project.followed` (los emite 06/11; aqui solo se definen).

### Swagger
Tags `catalog`, `projects`; DTOs de respuesta documentados con `createZodDto`.

## Fuera de alcance
Escritura de proyectos (POST/PATCH/updates) -> 06 (eventos) y 11 (admin).
Follows -> 06.

## Contrato / invariantes
- Rutas exactamente las de `packages/shared/src/api-paths.ts`.
- Ningun `throw new Error`; todo `DomainError`.
- Controllers sin Prisma.

## Criterios de aceptacion
- e2e: `GET /v1/plans` 3 items; `GET /v1/zones` 5; `GET /v1/zones/amazonia` con proyectos; `GET /v1/projects?zone=borneo` filtra; `GET /v1/projects/<id>` trae updates; 404 tipados.
- Swagger `/docs` lista los 5 endpoints.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit
bash scripts/dev/quality-check.sh --scope api --only e2e     # Postgres arriba
```

## Commits sugeridos
`feat(api): domain errors, zod pipe and event bus` · `feat(api): catalog module (plans, zones)` · `feat(api): projects read endpoints`
