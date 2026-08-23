# Plan -- API: infra comun, catalogo y lectura de proyectos (por fases, checkpoint por fase)

> **Estado**: ejecutado en `feat/api-catalog-and-projects` (`378cd25..7e849be`)
> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/02-api-catalog-and-projects.md` (ola 1, en paralelo con 03 y 04)
> **Base**: spec 02; vault `01-Tecnologia-Arquitectura/arquitectura-sistema.md` (Contrato API, seccion "Contrato API (REST, versionado /v1)"), `01-Tecnologia-Arquitectura/backend-nest.md` (estructura de modulo, tabla de eventos, outbox); plan previo `20260822-shared-contract-and-seed.plan.md` (contrato y seed ya fijados)
> **Areas**: api, shared (solo aditivo: schemas zod de respuesta)
> **Contrato shared tocado**: si -- se agregan `zoneSchema`, `projectSchema`, `projectUpdateSchema`, `projectWithUpdatesSchema`, `planSchema` y los tipos existentes pasan a derivarse de ellos con `z.infer` (mismos nombres, misma forma). Consumidores hoy (grep): `packages/api-client/src/resources/{plans,zones,projects}.ts` y `apps/api/prisma/seed.ts:1-8`. Ninguna app importa aun `@oneimpact/shared` directamente.
> **Schema Prisma tocado**: **no** -- sin migracion, sin cambios de seed. Se lee el dataset de 01 tal cual.
> **Eventos**: ninguno se emite. Se crean `event-names.ts` (los 8 nombres de la tabla del vault), `EventBus.publish(event, tx?)` y los tipos de payload de `project.created|update_published|followed`, que consumen 06 y 11.
> **Zonas de riesgo**: eventos (solo la infra, sin listeners todavia); nada de auth ni de pago simulado en este item. Riesgo real: configuracion de e2e (prefijo `/v1` y seed compartido, ver hallazgos).
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026), ola 1
> **Como ejecutar**: `/run-plan-worktree api-catalog-and-projects` (rama `feat/api-catalog-and-projects`, modo que indica el spec) | `/run-plan-guided`

## Objetivo

Publicar los primeros endpoints reales de la API -- planes, zonas y proyectos con
sus avances -- y, sobre todo, dejar fijado el **patron de modulo** que 05, 06 y 12
van a copiar: controller fino sin Prisma, use case en `application/`, repositorio
en `infrastructure/`, errores tipados `DomainError`, respuestas `{ items, total }`
y DTOs documentados en Swagger. Junto con eso, la infraestructura comun que hoy
no existe: filtro de errores, pipe zod global, decorador `@Public()` y el
`EventBus` con su tabla de nombres.

## Contexto y hallazgos del analisis

### Estado del codigo

- `apps/api/src/app.module.ts:11-13`: solo `ConfigModule`, `EventEmitterModule`
  (`wildcard: true`), `PrismaModule` y `HealthModule`. Todos los directorios de
  `src/modules/*` estan vacios (`.gitkeep`), igual que `src/common/*` y
  `src/infra/events/`.
- `apps/api/src/main.ts:13`: `setGlobalPrefix('v1', { exclude: ['health','docs'] })`.
  **Consecuencia**: los controllers se declaran sin el `/v1`
  (`@Controller('zones')` -> `/v1/zones`). Las constantes de
  `packages/shared/src/api-paths.ts` traen el prefijo incluido, asi que **no**
  sirven para el decorador `@Controller`; sirven para el cliente y para asertar
  en los e2e. Se documenta en el modulo, no se inventa un helper.
- `apps/api/src/main.ts:20`: `SwaggerModule.setup` sin pasar por `nestjs-zod`.
  Con `nestjs-zod@5.5.0` el patch de Swagger se hace con `cleanupOpenApiDoc(doc)`
  (`node_modules/nestjs-zod/dist/index.d.cts:128,213`), no con el viejo
  `patchNestJsSwagger()`. Sin eso, los DTOs de `createZodDto` salen vacios en
  `/docs`.
- `nestjs-zod@5.5.0` ya esta instalado y acepta zod v4
  (`node_modules/nestjs-zod/package.json:99-104`). Exporta `createZodDto`,
  `ZodValidationPipe`, `ZodSerializerDto` y `cleanupOpenApiDoc`.
- `apps/api/src/infra/prisma/prisma.service.ts:6-8`: `$connect` en
  `onModuleInit`, asi que **cualquier e2e que levante `AppModule` necesita
  Postgres arriba** (`pnpm db:up`), incluso el que solo mira Swagger.
- `packages/shared/src/types/catalog.ts`: `Zone`, `Project`, `ProjectUpdate`,
  `ProjectWithUpdates` son interfaces TS puras, con fechas como `string` y
  opcionales (`targetDate?`, `lat?`, `coverKey?`). Prisma devuelve `Date` y
  `null`. **Hace falta un mapper explicito por modulo** (`Date -> toISOString()`,
  `null -> undefined`); si se serializa la entidad Prisma cruda, el contrato que
  ya consume `packages/api-client` deja de cumplirse.
- El seed de 01 esta listo y es idempotente (`apps/api/prisma/seed.ts`), con 5
  zonas, 5 proyectos (1 update cada uno), 3 planes y 2 usuarios; verificado por
  `apps/api/test/seed.e2e-spec.ts`.

### Hallazgo 1 (bloquea el criterio del spec): `test/enums.spec.ts` no lo corre nadie

El spec pide `test/enums.spec.ts`. La config unit de Jest tiene
`rootDir: "src"` y `testRegex: ".*\\.spec\\.ts$"` (`apps/api/package.json:82-83`)
y la e2e `testRegex: ".e2e-spec.ts$"` (`apps/api/test/jest-e2e.json`). Un archivo
`test/enums.spec.ts` **no lo levanta ninguna de las dos**: quedaria como test
fantasma que nunca falla.

Decision: el test de espejo de enums va a `src/infra/prisma/prisma-enums.spec.ts`
(unit, sin DB: `@prisma/client` exporta los enums como objetos en runtime --
`node_modules/.prisma/client/index.d.ts:145-175`) y compara contra `ENUM_VALUES`
de `packages/shared/src/enums.ts:41-50`. Se anota la desviacion respecto del spec.

### Hallazgo 2: los e2e nuevos necesitan un helper de app

`apps/api/test/app.e2e-spec.ts` crea la app **sin** `setGlobalPrefix`. Le da
igual porque `/health` esta excluido del prefijo, pero cualquier spec nuevo que
pegue a `/v1/...` daria 404 salvo que replique el bootstrap. Se crea
`test/utils/create-test-app.ts` con el mismo bootstrap que `main.ts:11-20`
(prefijo, pipe zod global, filtro de `DomainError`) y se refactoriza
`app.e2e-spec.ts` para usarlo (aditivo, sigue verde).

### Hallazgo 3: los e2e comparten una sola base de datos

Jest e2e no fija `maxWorkers`, asi que con 4 specs correrian en paralelo contra
el unico Postgres local y varios `seed()` simultaneos pueden chocar en los
`upsert` (P2002). Se agrega `"maxWorkers": 1` a `test/jest-e2e.json` y un helper
`test/utils/seed-once.ts` que siembra una sola vez por proceso. No es debilitar
tests: es hacerlos deterministas.

### Hallazgo 4 (contrato): `?zone=` del spec vs `?zoneSlug=` del cliente ya commiteado

El spec 02 pide `GET /v1/projects?zone=<slug>`, pero `packages/api-client` ya
esta en `main` con `zoneSlug` y con un test que lo fija:
`packages/api-client/src/resources/projects.ts:18-22` y
`packages/api-client/src/index.test.ts:99-100`
(`http://api.test/v1/projects?zoneSlug=amazonia`). Regla del repo: ante conflicto
entre un doc y el codigo, **gana el codigo**. Ver Decisiones pendientes 1.

### Radio de impacto de la fase de `shared`

`grep` de los tipos afectados fuera de `packages/shared/src`:
`packages/api-client/src/resources/{plans,zones,projects}.ts` (importan `Plan`,
`Zone`, `Project`, `ProjectWithUpdates`, `ProjectUpdate`, `ProjectStatus`) y
`apps/api/prisma/seed.ts:1-8` (`SEED_*`, que se derivan de esos tipos con
`Omit<>`). Como los tipos conservan **nombre y forma** y solo cambian de origen
(interface -> `z.infer`), el impacto se cubre con el typecheck de `shared` +
`api-client` en la misma fase. `apps/mobile` y `apps/admin` todavia no importan
`@oneimpact/shared`, asi que no hay pantallas que romper (esto vale mientras 03,
04 y 07 no hayan mergeado; el `--scope all` de la fase de cierre lo confirma).

### Verificaciones disponibles

`bash scripts/dev/quality-check.sh --list` -> scopes `mobile api admin shared all`,
pasos `typecheck lint unit e2e bundle`. El paso `e2e` de api se **salta solo** si
Docker no tiene el servicio `db` arriba (`scripts/dev/quality-check.sh:57-60`):
en las fases con e2e hay que verificar que el reporte diga `[OK]` y no `[SKIP]`.

## Decisiones pendientes (bloqueantes)

1. **Rama base**. El item 01 esta en `feat/shared-contract-and-seed`
   (`52fd5d7`), **no en `main`**. Este plan depende de el. Opciones:
   (a) mergear 01 a `main` y crear el worktree de 02 desde `main` (recomendado,
   es lo que asume el roadmap y lo que necesitan 03/04); (b) crear la rama de 02
   sobre `feat/shared-contract-and-seed`. Sin resolver esto no arranca la Fase 1.

2. **Nombre del query param de filtro por zona**. Default propuesto: **`zoneSlug`**,
   que es lo que ya usa `packages/api-client` y su test; el criterio de
   aceptacion del spec (`?zone=borneo`) se reescribe como `?zoneSlug=borneo` y se
   anota la correccion en `.claude/roadmap/specs/02-api-catalog-and-projects.md`.
   Alternativa descartada por defecto: aceptar `zone` como alias -- dos nombres
   para lo mismo en el contrato publico.

3. **Origen de los schemas de respuesta**. Default propuesto: viven en
   `packages/shared/src/schemas/catalog.ts` y los tipos (`Zone`, `Project`, ...)
   pasan a derivarse con `z.infer` -- una sola fuente, `createZodDto` los
   consume tal cual. Alternativa descartada: dejar las interfaces y escribir
   schemas paralelos dentro de `apps/api` (duplica el contrato, deriva segura).

Ninguna otra. Lo demas queda decidido por defecto y es cambiable sin rehacer el
plan:

- La forma del error HTTP es `{ statusCode, code, message }` (`code` es el del
  `DomainError`, `message` es lo que ya lee `ApiError` en
  `packages/api-client/src/http.ts:31`).
- No se activa `ZodSerializerInterceptor` (validacion de respuesta en runtime).
  Los mappers se cubren con asserts de forma en los e2e; encenderlo despues es
  aditivo.

## Principios

Aditivo antes que destructivo; verde por fase; el spec del roadmap y el vault
mandan salvo conflicto con codigo ya commiteado (gana el codigo, se anota);
schemas una sola vez en `packages/shared`; los modulos se hablan por eventos, no
por imports cruzados (`catalog` es la unica excepcion de lectura); ningun
`throw new Error` en un use case; controllers sin Prisma; sin supresiones nuevas
ni tests debilitados; identificadores y commits en ingles, copy en espanol.

## Mapa de fases

| Fase | Nombre                                         | Area   | Impacto | Shared | Prisma | Commit sugerido                                           |
| ---- | ---------------------------------------------- | ------ | ------- | ------ | ------ | --------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                      | --     | Ninguno | No     | No     | _(sin commit)_                                            |
| 1    | Schemas zod de respuesta en shared             | shared | Aditivo | Si     | No     | `feat(shared): response schemas for catalog and projects` |
| 2    | Infra comun de la API (errores, pipe, eventos) | api    | Aditivo | No     | No     | `feat(api): domain errors, zod pipe and event bus`        |
| 3    | Modulo `catalog` (plans, zones)                | api    | Aditivo | No     | No     | `feat(api): catalog module (plans, zones)`                |
| 4    | Modulo `projects` (lectura)                    | api    | Aditivo | No     | No     | `feat(api): projects read endpoints`                      |
| 5    | Cierre: bateria completa y AI log              | --     | Ninguno | No     | No     | `docs: log ai session api-catalog-and-projects`           |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar que el punto de partida es el esperado y que el entorno
puede verificar lo que este plan promete.

**Area**: --
**Archivos**: ninguno (solo lectura)
**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. Confirmar la Decision pendiente 1 (rama base) y que `packages/shared/dist`
   existe o se regenera (`pnpm --filter @oneimpact/shared build`): la API no
   compila contra `shared` sin el `dist` (hallazgo del plan 01).
2. `pnpm db:up` y `pnpm --filter @oneimpact/api exec prisma generate`.
3. Baseline: `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
   y `--only e2e`. Anotar el resultado; si ya viene rojo, se arregla antes de
   empezar (no se mezcla con lo nuevo).
4. Releer `.claude/roadmap/specs/02-api-catalog-and-projects.md` y confirmar que
   las 3 decisiones pendientes estan resueltas.

**Verificacion**: la salida del baseline debe decir `RESULT: GREEN` y el paso
`apps/api e2e` debe decir `[OK]`, no `[SKIP]`.

**Riesgos**: si el paso e2e sale `[SKIP]`, Docker no esta arriba y todos los
gates de las fases 3 y 4 son falsos verdes.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Schemas zod de respuesta en `packages/shared`

**Objetivo**: que el contrato de respuesta exista como schema zod una sola vez,
para que `createZodDto` documente Swagger sin duplicar tipos.

**Area**: shared
**Archivos**:

- `packages/shared/src/schemas/catalog.ts:1-6` (hoy solo `zoneSlugSchema`)
- `packages/shared/src/types/catalog.ts` (interfaces que pasan a derivarse)
- `packages/shared/src/plans.ts:3-10` (`Plan`)
- `packages/shared/src/index.ts` (exports)
- nuevo `packages/shared/src/schemas/catalog.test.ts`

**Shared**: si. Se agregan `planSchema`, `zoneSchema`, `projectSchema`,
`projectUpdateSchema`, `projectWithUpdatesSchema` y el helper
`listResponseSchema(item)` -> `{ items, total }`. `Zone`, `Project`,
`ProjectUpdate`, `ProjectWithUpdates` y `Plan` pasan a `z.infer<...>`
manteniendo **el mismo nombre y la misma forma** (fechas `z.iso.datetime()` ->
`string`, opcionales con `.optional()`). Consumidores a verificar en esta misma
fase: `packages/api-client/src/resources/{plans,zones,projects}.ts` y
`apps/api/prisma/seed.ts:1-8` (usa `Omit<Zone,'id'>` y compania via
`seed-data.ts:5-13`).

**Prisma**: No · **Eventos**: No

**Acciones**:

1. Escribir los schemas en `schemas/catalog.ts` (importan solo `zod` y los enums;
   `zoneSlugSchema` se mantiene y se reutiliza en `zoneSchema.slug`).
2. Derivar los tipos: `types/catalog.ts` reexporta `z.infer` con los nombres
   actuales; `plans.ts` deriva `Plan` de `planSchema` sin tocar `PLANS` ni
   `monthlyPriceFor`.
3. Exportar lo nuevo desde `src/index.ts`.
4. Test (`catalog.test.ts`): `zoneSchema.parse` de un `SEED_ZONES[0]` con `id`
   agregado; `projectWithUpdatesSchema.parse` de un proyecto del seed con su
   update; rechazo de `progress: 101` y de `slug` con mayusculas.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,lint,unit`
  (cubre `shared`, `ui-tokens` y `api-client`: si un tipo derivado cambio de
  forma, el typecheck de `api-client` lo caza).
- `pnpm --filter @oneimpact/shared build` (la API consume `dist`).

**Riesgos**: que `z.infer` produzca `field?: T | undefined` donde la interface
decia `field?: T` y algun consumidor con `exactOptionalPropertyTypes` se queje.
No esta activado en `packages/config`, pero si aparece, se corrige con
`.optional()` explicito en el schema, no con `any`.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(shared): response schemas for catalog and projects`

---

## Fase 2 -- Infra comun de la API: errores tipados, pipe zod y event bus

**Objetivo**: dejar la infraestructura que todos los modulos siguientes asumen.
Sin endpoints nuevos todavia.

**Area**: api
**Archivos** (todos nuevos salvo los dos ultimos):

- `apps/api/src/common/errors/domain-error.ts`
- `apps/api/src/common/filters/domain-error.filter.ts`
- `apps/api/src/common/pipes/zod-validation.pipe.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/infra/events/domain-event.ts`
- `apps/api/src/infra/events/event-names.ts`
- `apps/api/src/infra/events/event-bus.ts`
- `apps/api/src/infra/events/events.module.ts`
- `apps/api/src/infra/events/event-bus.spec.ts`
- `apps/api/src/infra/prisma/prisma-enums.spec.ts`
- `apps/api/test/utils/create-test-app.ts`, `apps/api/test/utils/seed-once.ts`
- `apps/api/src/main.ts:11-20` (pipe global, filtro global, `cleanupOpenApiDoc`)
- `apps/api/src/app.module.ts:11-13` (registrar `EventsModule`)
- `apps/api/test/jest-e2e.json` (`maxWorkers: 1`), `apps/api/test/app.e2e-spec.ts`
  (pasa a usar el helper)

**Spec**: seccion "Infra comun (una sola vez)" del spec 02; estructura de modulo
de `backend-nest.md` lineas 8-30; tabla de eventos de `backend-nest.md` 31-42.

**Shared**: No · **Prisma**: No
**Eventos**: se define la infraestructura, no se emite ninguno.
`event-names.ts` lleva los 8 nombres de la tabla del vault:
`user.registered`, `payment.succeeded`, `payment.failed`,
`subscription.activated`, `subscription.canceled`, `project.created`,
`project.update_published`, `project.followed`.

**Acciones**:

1. `DomainError(code, status, message)` extendiendo `Error`, con subclase o
   factory para 404 (`notFound(code, message)`). Nada de `HttpException` en los
   use cases.
2. `DomainErrorFilter` con `@Catch(DomainError)`, registrado global en
   `main.ts`; responde `{ statusCode, code, message }`.
3. `zod-validation.pipe.ts`: reexporta el `ZodValidationPipe` de `nestjs-zod`
   configurado, y se registra con `app.useGlobalPipes(...)` en `main.ts`.
4. `@Public()` como `SetMetadata(IS_PUBLIC_KEY, true)`. Hoy no hay guard global:
   el decorador queda listo para que 05 invierta el default. Documentarlo en el
   propio archivo.
5. `DomainEvent<TType, TPayload>` = `{ type, occurredAt, payload }`;
   `EventBus.publish(event, tx?)` que hoy hace `emitter.emitAsync(event.type, event)`
   e **ignora `tx`** (documentado: 12 lo cambia por el insert en `OutboxEvent`
   sin tocar la firma). `EventsModule` global, exporta `EventBus`.
6. `main.ts`: envolver el documento en `cleanupOpenApiDoc(...)` antes de
   `SwaggerModule.setup` (`main.ts:20`).
7. `event-bus.spec.ts` (unit, sin DB): publicar y comprobar que un `@OnEvent`
   registrado en un modulo de test recibe el payload; y que `publish` con `tx`
   se comporta igual.
8. `prisma-enums.spec.ts`: por cada clave de `ENUM_VALUES`
   (`packages/shared/src/enums.ts:41-50`), comparar el set de valores contra el
   enum homonimo de `@prisma/client`. **Desviacion respecto del spec**, que lo
   pedia en `test/enums.spec.ts`: ahi no lo corre ningun runner (hallazgo 1).
9. Helpers de test: `createTestApp()` replicando `main.ts:11-20`;
   `seedOnce()` con guarda de modulo. `maxWorkers: 1` en `jest-e2e.json`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (con `pnpm db:up`):
  `app.e2e-spec.ts` refactorizado debe seguir en verde.
- Caso negativo cubierto por el unit del filtro o por un e2e minimo: un
  `DomainError` de 404 sale como `{ statusCode: 404, code, message }` y no como 500.

**Riesgos**: (a) `cleanupOpenApiDoc` mal aplicado deja `/docs` sin esquemas --
se comprueba en la Fase 4 con el e2e de Swagger; (b) el pipe global puede
cambiar el comportamiento de endpoints existentes: hoy solo existe `/health` sin
input, asi que el riesgo es nulo, pero el e2e lo confirma.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(api): domain errors, zod pipe and event bus`

---

## Fase 3 -- Modulo `catalog`: planes y zonas

**Objetivo**: `GET /v1/plans`, `GET /v1/zones`, `GET /v1/zones/:slug` sirviendo
datos reales de Postgres, con el patron de modulo completo.

**Area**: api
**Archivos** (nuevos):

- `apps/api/src/modules/catalog/catalog.module.ts`
- `.../controllers/plans.controller.ts`, `.../controllers/zones.controller.ts`
- `.../controllers/dto/plan.dto.ts`, `.../dto/zone.dto.ts`, `.../dto/zone-detail.dto.ts`
- `.../application/catalog.service.ts`
- `.../infrastructure/catalog.repository.ts`, `.../infrastructure/catalog.mapper.ts`
- `.../application/catalog.service.spec.ts`
- `apps/api/test/catalog.e2e-spec.ts`
- `apps/api/src/app.module.ts` (registrar `CatalogModule`)

**Spec**: seccion "Modulo `catalog`" del spec 02; contrato REST del vault
(`arquitectura-sistema.md`, filas `GET /plans` y `GET /zones` `GET /zones/:slug`).

**Shared**: No (consume los schemas de la Fase 1) · **Prisma**: No · **Eventos**: No

**Acciones**:

1. Repositorio: `findPlans()`, `findZones()` (ordenado por `order` asc),
   `findZoneBySlug(slug)` con `include: { projects: true }`. Unico lugar con
   `PrismaService`.
2. `catalog.mapper.ts`: `toPlan`, `toZone`, `toProjectSummary`
   (`Date -> toISOString()`, `null -> undefined`), devolviendo exactamente los
   tipos de `@oneimpact/shared`.
3. `CatalogService`: `listPlans()`, `listZones()` -> `{ items, total }`,
   `getZoneBySlug(slug)` -> zona + `projects` resumidos, y `DomainError` 404
   `ZONE_NOT_FOUND` si no existe. `CatalogModule` **exporta `CatalogService`**
   (unica dependencia cross-modulo permitida por las reglas).
4. Controllers finos con `@ApiTags('catalog')` y DTOs de respuesta con
   `createZodDto` sobre los schemas de la Fase 1. Rutas sin `/v1` (lo agrega el
   prefijo global, `main.ts:13`); el path completo del contrato es el de
   `packages/shared/src/api-paths.ts:11-14`.
5. Unit del service con repositorio mockeado: orden de zonas por `order` y 404
   tipado cuando el slug no existe.
6. e2e `catalog.e2e-spec.ts` con `createTestApp()` + `seedOnce()`:
   - `GET /v1/plans` -> 200, 3 items, incluye `basico|estandar|premium`.
   - `GET /v1/zones` -> 200, `total === 5`, `items[0].slug === 'amazonia'`
     (orden por `order`).
   - `GET /v1/zones/amazonia` -> 200, con `projects` (el seed le da 2:
     `guainia` y `amazonia-carbono`).
   - `GET /v1/zones/no-existe` -> **404 con `code: 'ZONE_NOT_FOUND'`**.
   - Forma del mapper: `typeof items[0].id === 'string'` y ninguna propiedad
     `Date` cruda (`imageKey` presente, sin `createdAt` de Prisma filtrado).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (Postgres arriba;
  el paso debe decir `[OK]`, no `[SKIP]`)
- Casos negativos: el 404 tipado de arriba.
- Pendiente manual: `pnpm dev:api` y mirar `http://localhost:5000/docs` --
  que el tag `catalog` liste los 3 endpoints con su schema de respuesta.

**Riesgos**: el mapper es codigo a mano; si se olvida un campo, el typecheck lo
caza solo si el tipo de retorno esta anotado explicitamente. Anotarlo siempre
(`function toZone(row: PrismaZone): Zone`).

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(api): catalog module (plans, zones)`

---

## Fase 4 -- Modulo `projects` (lectura) y contrato de sus eventos

**Objetivo**: `GET /v1/projects?zoneSlug&status` y `GET /v1/projects/:id` con sus
avances, mas los tipos de payload de los eventos que emitiran 06 y 11.

**Area**: api
**Archivos** (nuevos):

- `apps/api/src/modules/projects/projects.module.ts`
- `.../controllers/projects.controller.ts`
- `.../controllers/dto/projects-query.dto.ts`, `.../dto/project.dto.ts`,
  `.../dto/project-with-updates.dto.ts`
- `.../application/projects.service.ts`, `.../application/projects.service.spec.ts`
- `.../domain/projects.events.ts`
- `.../infrastructure/projects.repository.ts`, `.../infrastructure/projects.mapper.ts`
- `apps/api/test/projects.e2e-spec.ts`, `apps/api/test/swagger.e2e-spec.ts`
- `apps/api/src/app.module.ts` (registrar `ProjectsModule`)

**Spec**: seccion "Modulo `projects` (solo lectura en este spec)" del spec 02.
Fuera de alcance explicito: POST/PATCH, updates y follows (van a 06 y 11).

**Shared**: No · **Prisma**: No
**Eventos**: se **definen** (no se emiten) los tipos de payload de
`project.created`, `project.update_published` y `project.followed` en
`domain/projects.events.ts`, usando `DomainEvent` de la Fase 2 y los nombres de
`event-names.ts`. Payloads planos con ids (`projectId`, `zoneId`, `updateId`,
`userId`), nunca entidades Prisma.

**Acciones**:

1. `projects-query.dto.ts` con zod: `zoneSlug` opcional (reusa `zoneSlugSchema`)
   y `status` opcional (`z.enum` de `ProjectStatus`). Ver Decision pendiente 2.
2. Repositorio: `findMany({ zoneSlug, status })` -- filtra por
   `zone: { slug }` -- devolviendo `{ items, total }`; y
   `findByIdWithUpdates(id)` con `updates` ordenados `publishedAt desc`.
3. `projects.mapper.ts`: `toProject`, `toProjectUpdate`, `toProjectWithUpdates`
   (incluye `zone` mapeada), con tipos de retorno anotados.
4. `ProjectsService`: `list(query)` y `getById(id)` con `DomainError` 404
   `PROJECT_NOT_FOUND`. Sin tocar `CatalogService` (no hace falta: el filtro por
   slug se resuelve en la query de Prisma).
5. Controller `@ApiTags('projects')`, DTOs de respuesta con `createZodDto`.
6. Unit del service con repositorio mockeado: que el filtro llegue al
   repositorio tal cual, y 404 tipado.
7. e2e `projects.e2e-spec.ts`:
   - `GET /v1/projects` -> 200, `total === 5`.
   - `GET /v1/projects?zoneSlug=borneo` -> 1 item (`borneo-monitoreo`).
   - `GET /v1/projects?status=COMPLETED` -> 1 item (`amazonia-carbono`).
   - `GET /v1/projects?status=INVALIDO` -> **400** (pipe zod global).
   - `GET /v1/projects/<id real>` -> 200 con `updates` no vacio y ordenado desc.
   - `GET /v1/projects/no-existe` -> **404 `PROJECT_NOT_FOUND`**.
8. e2e `swagger.e2e-spec.ts`: construir el documento con
   `SwaggerModule.createDocument` + `cleanupOpenApiDoc` y asertar que
   `paths` contiene los 5 endpoints del contrato (`/v1/plans`, `/v1/zones`,
   `/v1/zones/{slug}`, `/v1/projects`, `/v1/projects/{id}`). Esto automatiza el
   criterio de aceptacion "Swagger `/docs` lista los 5 endpoints".

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (Postgres arriba)
- Casos negativos: 400 por query invalida y 404 tipado.
- Pendiente manual: `/docs` con los tags `catalog` y `projects` completos.

**Riesgos**: (a) el id de proyecto es un `cuid` generado por el seed, asi que el
e2e debe buscarlo por `slug` antes de pegarle a `/v1/projects/:id`, no
hardcodearlo; (b) `updates` ordenados desc con un solo update por proyecto no
prueba nada -- el assert de orden se hace comparando `publishedAt` de la lista si
hay mas de uno, y si no, se deja documentado como cubierto por 06 (que agrega
updates).

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(api): projects read endpoints`

---

## Fase 5 -- Cierre: bateria completa, correcciones de spec y AI log

**Objetivo**: dejar el arbol entero en verde y la evidencia del proceso escrita.

**Area**: --
**Archivos**: `docs/ai-workflow.md`, `.claude/roadmap/ROADMAP.md` (tabla Estado),
`.claude/roadmap/specs/02-api-catalog-and-projects.md` (correcciones: `zoneSlug`
y ubicacion del test de enums), `.claude/plans/README.md` (indice + estado del
plan), `.claude/plans/20260822-api-catalog-and-projects.plan.md` (header
`> **Estado**: ejecutado en ...`).

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` (con Postgres arriba). Es la
   unica corrida completa del plan.
2. Anotar en el spec 02 las dos desviaciones aceptadas (query `zoneSlug`,
   `prisma-enums.spec.ts` en `src/`).
3. `/ai-log` con la sesion; marcar el item 02 como hecho en la tabla Estado del
   roadmap y agregar el plan al indice de `.claude/plans/README.md`.
4. Si se ejecuto en worktree: cerrar con `/merge-plan api-catalog-and-projects`
   (no lo hace esta fase).

**Verificacion**:

- `RESULT: GREEN` en `--scope all`, con `apps/api e2e` en `[OK]`.
- Pendiente manual anotado: revision visual de `/docs`.

**Riesgos**: `--scope all` incluye `apps/mobile` (typecheck, unit y, si se pide,
`expo export`). Si 03 o 04 mergearon mientras tanto, un fallo ahi no es de este
plan: se reporta, no se arregla dentro de esta rama.

CHECKPOINT -- Detente aca.
**Commit sugerido**: `docs: log ai session api-catalog-and-projects`
