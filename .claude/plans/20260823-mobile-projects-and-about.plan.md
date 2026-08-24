# Plan -- Mobile: Proyectos y Quienes somos (por fases, checkpoint por fase)

> **Fecha**: 2026-08-23 (revisado el mismo dia tras completarse el item 07)
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/08-mobile-projects-and-about.md`
> **Base**: vault `02-Analisis-Visual/pantallas/pantallas-nuevas.md` (secciones
> "Proyectos", "Detalle de proyecto", "Quienes somos"), `design-tokens.md`,
> `.claude/rules/60-design-system.md`, plan previo
> `.claude/plans/20260822-mobile-data-layer-and-auth.plan.md` (item 07,
> **completo** desde `570cdf5`)
> **Areas**: mobile
> **Contrato shared tocado**: No. Se consumen `projectSchema` /
> `projectWithUpdatesSchema` (`packages/shared/src/schemas/catalog.ts:27-57`) tal
> cual estan
> **Schema Prisma tocado**: No
> **Eventos**: No emite ni escucha. `POST /v1/projects/:id/follow` provoca
> `project.followed` del lado servidor, ya implementado en
> `apps/api/src/modules/projects/application/follows.service.ts:31-36`
> **Zonas de riesgo**: (1) **estado "Siguiendo" sin fuente de verdad en el
> contrato** -- unica que queda viva (D1); (2) **sticky sobre ScrollView** --
> `Screen` es un `ScrollView`, el CTA fijo no puede ir dentro. Pago simulado: no
> se toca (es el item 09)
> **Fase del roadmap**: Fase 1 (entrega lunes 24 ago 2026, 18:00) -- Ola 3,
> paralelo con 11
> **Como ejecutar**: `/run-plan-worktree` sobre `feat/mobile-projects-and-about`
> (lo indica el spec), luego `/merge-plan`
> **Estado de arranque**: **listo**. Sin decisiones bloqueantes: las cuatro que
> tenia este plan estan resueltas abajo, y las dos que dependian del item 07
> quedaron sin objeto.

## Objetivo

Cerrar las dos rutas que el sitio de referencia devuelve como 403 y que el menu
ya enlaza pero no existen como pantalla: **Proyectos** (listado con filtro por
zona + detalle con avances y boton Seguir) y **Quienes somos**. Con esto la app
publica queda al 100 % y el GIF de la entrega puede recorrerla entera.

## Que cambio al completarse el item 07 (revision de este plan)

La version anterior de este plan se escribio cuando el item 07 estaba mergeado
solo hasta su Fase 2. Ahora estan en `main` sus cuatro commits restantes:
`fdb8d72` (MSW), `81016a1` (`AuthProvider` + grupos de ruta), `7ccdcef` (Zonas
sobre hooks) y `570cdf5` (AI log). Consecuencias directas para este plan:

1. **Desaparece el hook puente `useHasSession`** que este plan iba a inventar.
   Existe `useAuth()` con `status: 'loading' | 'guest' | 'authed'`
   (`src/auth/AuthProvider.tsx:15-21`), y `loginHref(returnTo)`
   (`src/auth/routes.ts:20`) ya construye el destino de login con `returnTo`.
   Un archivo menos y ninguna deuda temporal nueva.
2. **Desaparece el resolvedor de assets que este plan iba a escribir.** El item
   07 agrego `assetForKey(key): number | undefined`
   (`src/data/zones.ts:51-53`), la version que no lanza de `assetFor`, mas el
   patron `toZoneView`/`toAdvanceView` que devuelve `undefined` y deja que el
   llamador filtre (`src/data/zones.ts:76-109`). Este plan lo reutiliza en vez
   de duplicarlo.
3. **MSW cubre el contrato completo** (`src/api/msw/handlers.ts`), incluidos
   `GET /v1/projects` con filtros `zoneSlug`/`status` (`:243-255`),
   `GET /v1/projects/:id` (`:260`) y `POST|DELETE /v1/projects/:id/follow`
   (`:291`, `:302`), estos dos ultimos autenticados con
   `resolveUserFromAccessToken`. Los criterios de aceptacion del spec que
   nombran MSW **se pueden cumplir literalmente**, sin reformular nada.
4. **Hay un patron de loading/error ya establecido** que este plan copia en vez
   de inventar: `app/(tabs)/zones.tsx:44-59` con `ZonesSkeleton` y `ZonesError`.

Lo que **no** cambio: `app/(auth)/` sigue vacio (el login es el item 09), y el
contrato sigue sin exponer si el usuario actual sigue un proyecto (D1).

## Contexto y hallazgos del analisis

### 1. El menu ya apunta a `/projects` y `/about`, y hoy no resuelven

`src/data/nav.ts:18` y `:20` declaran ambos destinos, y `FullScreenMenu.tsx:38`
navega con `router.push(item.href as Href)`. El cast existe justamente porque las
rutas no existen (comentario en `src/data/nav.ts:5-6`). `app.json` tiene
`experiments.typedRoutes: true`, asi que en cuanto los archivos existan el cast
sobra -- pero `nav.ts` y `FullScreenMenu.tsx` estan **fuera del write-scope**, se
deja el cast y se anota. El Footer ya no existe como componente: se integro en el
menu en `1cd1a43`, asi que el punto del spec "entrada en FullScreenMenu y Footer"
se cumple solo verificando el menu.

### 2. La API y MSW sirven lo mismo, y ya sirven todo lo necesario

- `GET /v1/projects?zoneSlug&status` y `GET /v1/projects/:id`, ambos `@Public()`
  (`apps/api/src/modules/projects/controllers/projects.controller.ts:27-44`);
  espejados en `src/api/msw/handlers.ts:243-273`.
- `POST|DELETE /v1/projects/:id/follow`, autenticados e **idempotentes**
  (`project-follows.controller.ts:31-45`, `follows.service.ts:24-46`);
  espejados en `handlers.ts:290-309`, con el mismo 404 `PROJECT_NOT_FOUND`.
- Hooks listos: `useProjects`/`useProject` (`src/api/hooks/useProjects.ts`) y
  `useFollowProject` (`useFollowProject.ts:8-27`), con las query keys de
  `src/api/hooks/keys.ts:16-20`.

**El comentario `NOTE (D5, ...)` de `useFollowProject.ts:5-7` esta obsoleto**: dice
que la API no implementa follow, y el item 06 lo implemento (`d35604f`). Se
corrige en la Fase 2.

### 3. `GET /v1/projects` devuelve `zoneId`, no `zoneSlug` ni el nombre de la zona

`projectSchema` (`packages/shared/src/schemas/catalog.ts:27-41`) trae `zoneId`, y
el mapper no agrega la zona en el listado
(`apps/api/src/modules/projects/infrastructure/projects.mapper.ts:18-34`). Solo
el **detalle** incluye `zone` (`projects.mapper.ts:65-71`). MSW hace exactamente
lo mismo: filtra por `zoneSlug` traduciendolo a `zoneId` contra el fixture de
zonas (`handlers.ts:246`) y solo adjunta `zone` en el detalle (`handlers.ts:270`).

Consecuencia concreta: el chip de zona sobre la imagen de la `ProjectCard` y los
chips de filtro necesitan un mapa `zoneId -> {slug, name}` construido en el
cliente con `useZones()` (query ya cacheada, la usa Zonas). No se cambia el
contrato por esto.

### 4. La resolucion segura de assets ya existe

`assetForKey` (`src/data/zones.ts:51-53`) devuelve `undefined` en vez de lanzar,
y `assetFor` (`:35-41`) queda para quien necesite el contrato estricto. Las 5
claves `advances/*.jpg` del seed estan mapeadas (`:23-27`). Un proyecto creado
desde el admin (item 11) con un `coverKey` sin asset local resuelve a
`undefined` y la tarjeta cae al placeholder, no a un crash.

### 5. Dataset de la demo: 5 proyectos, 1 update cada uno

`packages/shared/src/seed-data.ts:72+`: amazonia (2 proyectos), mexico, africa,
borneo. **Patagonia no tiene proyectos** -- es el caso vacio gratis para probar el
filtro. Cuatro `ACTIVE` y uno `COMPLETED`; **ningun `PLANNED`**, asi que el badge
"Planeado" no se puede verificar a ojo. Y con **un solo update por proyecto** el
criterio "updates ordenados desc" no se ve en pantalla: se cubre con test, no con
la vista. Ambas cosas se anotan como pendientes, no se toca el seed (es
territorio del item 01 y cambiar `SEED_*` obliga a re-seedear API, e2e y MSW).

### 6. `stats-bg.jpg` existe; falta el overlay forest

`src/assets/images/stats-bg.jpg` esta. Pero `src/theme/overlays.ts:8-28` solo
tiene overlays negros y blancos: no hay `forest80`, que es lo que pide el hero de
Quienes somos. Es un token de una linea -- ver nota de write-scope.

### 7. `AlliesSection` esta clavada sobre `bg-neutral-100`

`src/features/home/AlliesSection.tsx:18`. El spec de Quienes somos pide esa
seccion **sobre lima**. No existe un `AllyBadge` suelto: el badge esta inline en
`AlliesSection.tsx:27-41`. Ver D4.

### 8. Piezas reutilizables identificadas

| Necesito                                     | Ya existe                                                     | Archivo                                                               |
| -------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Sesion y estado guest/authed                 | `useAuth`, `loginHref`                                        | `src/auth/AuthProvider.tsx:15-21`, `src/auth/routes.ts:20`            |
| Patron loading / error de pantalla con hooks | `zones.tsx` + `ZonesSkeleton` + `ZonesError`                  | `app/(tabs)/zones.tsx:44-59`                                          |
| Mapper `Modelo -> View` que no lanza         | `toZoneView` / `toAdvanceView` / `assetForKey`                | `src/data/zones.ts:51-109`                                            |
| Hero crema + topografico                     | `ZonesHero` (patron, lee su propio copy)                      | `src/features/zones/ZonesHero.tsx`                                    |
| SVG topografico                              | `TopoLines`                                                   | `src/components/icons/TopoLines.tsx`                                  |
| Hero 55vh + back glass + gradiente           | `ZoneDetailHero` (patron; falta chip de zona)                 | `src/features/zones/ZoneDetailHero.tsx:27-53`                         |
| Barra de progreso                            | `ProgressBar` (track `bg-cream`, fill `bg-dark-green`)        | `src/components/ui/ProgressBar.tsx`                                   |
| Boton pildora                                | `Button` (`accent`/`white`/`dark`/`ink`, `fullWidth`, `size`) | `src/components/ui/Button.tsx`                                        |
| Iconos 40px estilo beneficios                | `BenefitItem` + los 6 SVG                                     | `src/components/ui/BenefitItem.tsx`, `src/components/icons/benefits/` |
| Aliados                                      | `AlliesSection` (fondo fijo, ver D4)                          | `src/features/home/AlliesSection.tsx`                                 |
| Scroll + StatusBar                           | `Screen`                                                      | `src/components/layout/Screen.tsx`                                    |

`Chip` **no** sirve para los filtros: es la pildora "Ver mas" con flecha y fondo
lima fijo (`src/components/ui/Chip.tsx:26-34`). `FilterChips` es componente nuevo,
como dice el write-scope del spec.

### 9. `Screen` es un `ScrollView`: el sticky no cabe dentro

`Screen.tsx:29-39` devuelve el `ScrollView` como raiz. Un CTA fijo abajo no puede
ser hijo suyo. El detalle usa `<Screen scroll={false}>` con un `ScrollView`
propio y el `FollowButton` como hermano absoluto, con `paddingBottom` de
`useSafeAreaInsets()`. Es el unico lugar del plan donde se sale del patron de las
demas pantallas, y es por una limitacion real del componente.

### 10. Rutas fuera de `(tabs)`: la tab bar desaparece

`app/projects/*` y `app/about.tsx` cuelgan del `Stack` raiz, igual que
`app/zone/[slug].tsx`. `app/_layout.tsx:86-89` declara `(tabs)` y `(app)`;
expo-router registra el resto por convencion de archivos, asi que **no hay que
tocar el layout raiz**. Estas tres pantallas son publicas: no van dentro de
`(app)`, que tiene el guard de sesion (`app/(app)/_layout.tsx:16-28`).

## Decisiones resueltas

### D1 -- El estado "Siguiendo" no tiene fuente de verdad en el contrato

Ningun endpoint dice si el usuario actual sigue un proyecto:
`dashboardSummarySchema.followedProjects` es **un contador**
(`packages/shared/src/schemas/payment.ts:88`), y `GET /v1/projects/:id` es
`@Public()`, sin contexto de usuario. MSW mantiene el estado
(`src/api/msw/state.ts:413` tiene `isFollowingProject`) pero **no lo expone por
HTTP**, y hace bien: su trabajo es espejar el contrato, no ampliarlo.

**RESUELTA: estado local optimista.** El `FollowButton` arranca en "no seguido" y
alterna con el resultado de la mutacion. Cero cambios de contrato, cabe en el
write-scope mobile. **Limitacion asumida y a declarar en el resumen**: al volver
a entrar a la pantalla vuelve a "Seguir este proyecto" aunque el follow este
persistido.

Descartadas: agregar `following: boolean` a `projectWithUpdatesSchema` con auth
opcional en `GET /:id`, o un `GET /v1/me/follows` nuevo. Ambas tocan
`packages/shared` + `apps/api` + MSW, fuera del write-scope de un item mobile.
**Seguimiento**: queda anotado como entrada de contrato para el item 12.

### D2 -- Sesion para el boton Seguir

**RESUELTA por el item 07, sin coste.** Se usa `useAuth()` directamente. El plan
anterior proponia un hook puente propio; ya no hace falta.

### D3 -- Que hace el boton Seguir cuando no hay sesion

`app/(auth)/login.tsx` no existe todavia (item 09), y `loginHref` lo dice en su
propio comentario (`src/auth/routes.ts:9-15`): hasta que la pantalla exista, ese
`Href` no lo puede verificar `typedRoutes`. Un `router.push` ahi hoy cae en la
pantalla "Unmatched Route" de expo-router.

**RESUELTA tal como lo manda el spec 08 (linea 28)**: `Alert` con "Inicia sesion
para seguir" mientras 09 no aterrice, y un `TODO(item 09)` en el mismo sitio con
la llamada `router.push(loginHref(pathname))` que lo reemplaza. Es un cambio de
dos lineas cuando el login exista.

### D4 -- Aliados sobre lima en Quienes somos

`AlliesSection` tiene `bg-neutral-100` clavado (`AlliesSection.tsx:18`).

**RESUELTA: prop opcional `bgClassName` con default `'bg-neutral-100'`**, o sea
el valor literal de hoy. Una linea, Home no cambia de pixel, y `/about` pasa
`bg-accent-light`. Toca `src/features/home/`, fuera del write-scope declarado --
incluido en la extension de abajo.

Descartadas: extraer `AllyBadge` y duplicar la seccion (mas codigo para el mismo
resultado); envolver en una `View` lima (no sirve, el fondo interno sigue siendo
`neutral-100`).

### D5 -- Resolucion de assets sin crash

**Sin objeto.** La resolvio el item 07 con `assetForKey`
(`src/data/zones.ts:51-53`). Este plan la consume.

### Extensiones de write-scope (aprobadas con este plan)

El spec 08 declara el write-scope en su linea 5. Estos tres archivos quedan
fuera y hacen falta. Ninguno cambia comportamiento existente:

1. `apps/mobile/src/data/projects.ts` -- copy estatico de las pantallas y el
   mapper `Project -> ProjectCardView`. Es la convencion del repo para copy y
   mappers (`src/data/zones.ts`, `src/data/home.ts`).
2. `apps/mobile/src/theme/overlays.ts` -- una entrada `forest80` (hallazgo 6).
   Aditivo puro.
3. `apps/mobile/src/features/home/AlliesSection.tsx` -- la prop opcional de D4.

## Principios

Aditivo antes que destructivo; verde por fase; el spec del vault manda en UI
(orden de secciones, fondos, pesos 900/700, copy exacto); schemas una sola vez en
`packages/shared`; eventos, no imports cruzados; sin PAN en el servidor; sin
supresiones nuevas (`eslint-disable`, `@ts-ignore`, `any`); copy visible en
espanol, identificadores en ingles; colores solo por token.

## Mapa de fases

| Fase | Nombre                                    | Area   | Impacto | Shared | Prisma | Commit sugerido                                        |
| ---- | ----------------------------------------- | ------ | ------- | ------ | ------ | ------------------------------------------------------ |
| 0    | Pre-flight (solo lectura)                 | --     | Ninguno | No     | No     | _(sin commit)_                                         |
| 1    | Listado de Proyectos con filtro por zona  | mobile | Aditivo | No     | No     | `feat(mobile): projects list with zone filters`        |
| 2    | Detalle de proyecto: avances y Seguir     | mobile | Aditivo | No     | No     | `feat(mobile): project detail with updates and follow` |
| 3    | Quienes somos                             | mobile | Aditivo | No     | No     | `feat(mobile): about screen`                           |
| 4    | Cierre: bateria completa, bundle y AI log | --     | Ninguno | No     | No     | `docs: log ai session mobile-projects-and-about`       |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar que el arbol arranca en verde y que las dos fuentes de
datos (API real y MSW) responden, porque este plan se verifica contra las dos.

**Area**: --
**Archivos**: ninguno (solo lectura)
**Spec**: --
**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `git status` limpio y rama `feat/mobile-projects-and-about` creada desde
   `main` (debe incluir `570cdf5`, el cierre del item 07).
2. `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
   en verde como linea base.
3. API real: `pnpm db:up` + `pnpm dev:api`, y comprobar
   `curl -s http://127.0.0.1:5000/v1/projects` -> `total: 5`, y
   `curl -s "http://127.0.0.1:5000/v1/projects?zoneSlug=patagonia"` -> `total: 0`.
4. MSW: confirmar que arranca con `EXPO_PUBLIC_USE_MSW=1` (la puerta esta en
   `app/_layout.tsx:33-44`) y que no aparece el `console.warn('[msw] failed to
start the mock server')`. Este plan se verifica contra las dos fuentes, asi
   que las dos tienen que estar sanas antes de empezar.
5. Bootstrap del worktree: copiar `apps/mobile/.env` (esta en `.gitignore`) y
   compilar `packages/shared` -- las dos cosas que el AI log del item 06 dejo
   registradas como pasos que el comando de worktree no contempla.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
- Los dos `curl` de la accion 3 y el arranque limpio de MSW de la accion 4.

**Riesgos**: si Postgres o la API no estan arriba, las Fases 1 y 2 se pueden
implementar y typechear igual contra MSW, pero la verificacion contra la API real
queda pendiente y hay que anotarla, no darla por hecha.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Listado de Proyectos con filtro por zona

**Objetivo**: `/projects` renderizando el listado real, filtrable por zona, con
estados de carga, vacio y error.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/data/projects.ts` (nuevo -- extension de write-scope)
- `apps/mobile/src/components/ui/FilterChips.tsx` (nuevo)
- `apps/mobile/src/components/ui/ProjectCard.tsx` (nuevo)
- `apps/mobile/src/components/ui/index.ts` (2 exports, tras `ProgressBar` en `:33-34`)
- `apps/mobile/src/features/projects/ProjectsHero.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectsList.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectsSkeleton.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectsError.tsx` (nuevo)
- `apps/mobile/src/features/projects/index.ts` (nuevo)
- `apps/mobile/app/projects/index.tsx` (nuevo; borrar `app/projects/.gitkeep` y
  `src/features/projects/.gitkeep`)
- `apps/mobile/__tests__/FilterChips.test.tsx` (nuevo)
- `apps/mobile/__tests__/projects-data.test.ts` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Proyectos (`/projects`) -- publica",
las cuatro vinetas completas. Tokens: `60-design-system.md`.

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `src/data/projects.ts`: copy en espanol (H1 "Proyectos en marcha", parrafo
   "Cada proyecto tiene coordenadas reales, evidencia y un porcentaje de avance
   verificado.", etiquetas `Activo`/`Planeado`/`Completado`, chip "Todas", copy
   de vacio "Aun no hay proyectos aqui" y de error) mas
   `toProjectCardView(project, zone)`, que sigue el patron de
   `toZoneView`/`toAdvanceView` (`src/data/zones.ts:76-109`): usa `assetForKey`
   e **incluye la vista aunque la imagen sea `undefined`** -- a diferencia de
   Zonas, aca una tarjeta sin foto se degrada al placeholder en vez de
   desaparecer del listado, porque el proyecto es el dato y la foto es el
   adorno. Ese contraste va comentado en el archivo.
2. `FilterChips.tsx`: `items: {value,label}[]`, `value: string | null`,
   `onChange`. `ScrollView` horizontal, `showsHorizontalScrollIndicator={false}`,
   pildoras. Activa `bg-gray-900` + `text-white`, inactiva `bg-white` +
   `text-gray-700`, ambas `font-bold text-sm`. Cada chip
   `accessibilityRole="button"`, `accessibilityState={{ selected }}` y area
   > =44pt (`py-3 px-5`).
3. `ProjectCard.tsx`: `rounded-3xl bg-white p-3 shadow-sm`; imagen
   `h-40 rounded-2xl` con `expo-image` + `contentFit="cover"`; chip de zona
   absoluto `bg-accent`; titulo `font-bold text-lg`; resumen
   `text-sm text-gray-500`; `ProgressBar` + porcentaje `font-bold text-xs` y
   badge de estado (Activo lima, Planeado gris, Completado forest). Con
   `image === undefined`, bloque `bg-cream rounded-2xl h-40` con el chip encima.
   `accessibilityRole="button"` en la card entera.
4. `ProjectsHero.tsx`: mismo patron que `ZonesHero.tsx:8-16` (`bg-cream px-5
pb-14 pt-24` + `TopoLines`), con el copy de `src/data/projects.ts`. Peso
   `font-bold` (700), el de Zonas y Suscripcion, no el 900 de Home.
5. `ProjectsSkeleton.tsx` y `ProjectsError.tsx`: calcados de `ZonesSkeleton` /
   `ZonesError` para que las dos pantallas se comporten igual ante los mismos
   estados.
6. `ProjectsList.tsx`: presentacional puro. Recibe `projects: ProjectCardView[]`
   y `onPressProject`. **No llama hooks de red** (regla de
   `20-mobile-conventions.md`). El vacio (0 proyectos tras filtrar) se resuelve
   aca, que es donde se sabe.
7. `app/projects/index.tsx`: ruta fina, con la misma forma que
   `app/(tabs)/zones.tsx:44-59`. `useState` del filtro; `useZones()` para los
   items del chip (ordenados por `order`) y el mapa `zoneId -> zone`;
   `useProjects(zoneSlug ? { zoneSlug } : undefined)`. `isLoading` = cualquiera
   de las dos `isPending`; `isError` = cualquiera de las dos `isError`, con
   `refetch` de ambas en el retry. Compone `Screen` (`statusBar="dark"`,
   `bg="bg-cream"`) + `Header logo="black"` + `FullScreenMenu` + hero + chips +
   lista. Navega con `router.push(\`/projects/${id}\`)`.
8. Tests: `FilterChips.test.tsx` -- render de N chips, `onChange` con el valor
   correcto, `accessibilityState.selected` en la activa.
   `projects-data.test.ts` -- `toProjectCardView` resuelve las 5 claves del seed,
   conserva la vista con `coverKey` desconocido dejando `image` en `undefined`, y
   mapea el estado a su etiqueta en espanol.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "FilterChips|projects-data"`
- Pendiente manual, **contra las dos fuentes** (API real y `EXPO_PUBLIC_USE_MSW=1`):
  el menu -> "Proyectos" navega; 5 tarjetas; "Patagonia" deja el listado vacio con
  su copy; "Todas" lo restaura; la card de amazonia-carbono muestra badge
  Completado y barra al 100 %.

**Riesgos**:

- Que `useZones()` resuelva despues que `useProjects()` y el chip de zona quede
  vacio un frame: se cubre con el skeleton mientras cualquiera de las dos carga.
- El badge "Planeado" no tiene ningun proyecto en el seed: queda **sin verificar
  visualmente** y se anota como tal.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(mobile): projects list with zone filters`

---

## Fase 2 -- Detalle de proyecto: avances y Seguir

**Objetivo**: `/projects/[id]` con hero 55vh, bloque de datos verificados,
timeline de avances sobre forest y CTA sticky de Seguir.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/components/ui/UpdateTimeline.tsx` (nuevo)
- `apps/mobile/src/components/ui/FollowButton.tsx` (nuevo)
- `apps/mobile/src/components/ui/index.ts` (2 exports)
- `apps/mobile/src/features/projects/ProjectDetailHero.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectFacts.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectUpdates.tsx` (nuevo)
- `apps/mobile/src/features/projects/index.ts` (ampliar)
- `apps/mobile/src/data/projects.ts` (ampliar: copy del detalle)
- `apps/mobile/app/projects/[id].tsx` (nuevo)
- `apps/mobile/src/api/hooks/useFollowProject.ts` (corregir el comentario
  obsoleto de `:5-7`)
- `apps/mobile/__tests__/UpdateTimeline.test.tsx` (nuevo)
- `apps/mobile/__tests__/FollowButton.test.tsx` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Detalle de proyecto (`/projects/[id]`)",
las cuatro vinetas.

**Shared**: No · **Prisma**: No
**Eventos**: No emite. El `POST /follow` dispara `project.followed` en el
servidor (`follows.service.ts:31-36`); el cliente no lo sabe ni lo necesita.

**Acciones**:

1. `ProjectDetailHero.tsx`: calcado de `ZoneDetailHero.tsx:27-53` (55 % del alto
   con `useWindowDimensions`, `expo-image` a sangre, `LinearGradient`
   `black20 -> black80`, back glass `BlurView` de 44pt con `insets.top`) mas un
   chip de zona `bg-accent` sobre el titulo. Titulo `font-black text-3xl` blanco
   (el spec pide 900 aca, como en Home).
2. `ProjectFacts.tsx`: bloque blanco con `ProgressBar` grande, "Avance verificado
   NN %", coordenadas con icono `MapPin` y fecha objetivo formateada en espanol.
   La fila de coordenadas es `Pressable` -> `Linking.openURL` a
   `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, con
   `accessibilityRole="link"`. Si `lat`/`lng` o `targetDate` vienen `undefined`
   (opcionales en `projectSchema:36-38`), la fila **no se renderiza**.
3. `UpdateTimeline.tsx`: `items: ProjectUpdate[]`. Linea vertical `bg-accent/40`,
   punto lima por item; fecha `text-white/50 text-xs`, titulo
   `text-accent font-bold text-sm`, cuerpo `text-white/80 text-xs`, imagen
   opcional `rounded-2xl` via `assetForKey(update.mediaKey)` (undefined -> no se
   pinta). Ordena por `publishedAt` descendente dentro del componente.
4. `ProjectUpdates.tsx`: seccion `bg-forest` con `SectionHeader` "Avances" en
   blanco envolviendo `UpdateTimeline`, y copy de vacio si no hay updates.
5. `FollowButton.tsx`: presentacional puro. Props `following`, `onPress`,
   `disabled`. Siguiendo = `bg-white border` + "Siguiendo"; no seguido =
   `bg-accent` + "Seguir este proyecto". `accessibilityRole="button"`,
   `accessibilityState={{ selected: following }}`, altura >=44pt.
   `expo-haptics` (`selectionAsync`) al pulsar.
6. `app/projects/[id].tsx`: `useLocalSearchParams`, `useProject(id)`,
   `useFollowProject()`, **`useAuth()`**. Estado local `following` (D1),
   inicializado en `false`, que alterna con `onSuccess` de la mutacion.
   `status === 'guest'` -> `Alert.alert('Inicia sesion para seguir', ...)` **sin
   disparar la mutacion**, con el `TODO(item 09)` de D3 al lado.
   `status === 'loading'` -> boton `disabled`. Layout: `<Screen scroll={false}>` +
   `ScrollView` interno con `contentContainerStyle={{ paddingBottom: 96 +
insets.bottom }}` + footer absoluto con el `FollowButton` (hallazgo 9).
   Estado no-encontrado calcado de `app/zone/[slug].tsx:19-28`.
7. Corregir el comentario obsoleto de `useFollowProject.ts:5-7`.
8. Tests: `UpdateTimeline.test.tsx` -- renderiza N items y los ordena
   descendente por `publishedAt` (aca se cubre el criterio que la vista no puede
   mostrar, hallazgo 5). `FollowButton.test.tsx` -- copy y
   `accessibilityState.selected` en ambos estados, y que `onPress` no dispara con
   `disabled`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "UpdateTimeline|FollowButton"`
- Caso negativo obligatorio: **sin sesion**, pulsar Seguir muestra el `Alert` y
  **no** dispara la mutacion.
- Caso negativo obligatorio: **con token invalido**, la mutacion recibe 401,
  `callApi` intenta refresh, falla, limpia tokens y notifica
  (`src/api/client.ts:62-77`); la UI vuelve a "Seguir este proyecto" y la sesion
  pasa a `guest`.
- Caso positivo contra MSW: con `EXPO_PUBLIC_USE_MSW=1`, registrarse desde el
  flujo que ya exista o usar un token emitido por `handlers.ts:125-141`, y
  comprobar que Seguir devuelve 200 y el boton alterna. Es el criterio del spec
  "como authed (token de MSW) alterna estado", **ahora si literal**.
- Pendiente manual: sticky del `FollowButton` sobre el scroll (que no tape el
  ultimo avance y respete `insets.bottom`); apertura de la app de mapas al tocar
  las coordenadas -- en web abre pestana, en Expo Go abre la app: probar en el
  telefono, no solo en :8081.

**Riesgos**:

- El estado `following` local se pierde al volver a entrar (D1, asumido). Va en
  el resumen de la fase, no se disimula.
- `Alert` no existe en web: en el navegador aparece como `window.alert`.
  Aceptable para la demo; el flujo real llega con el item 09.
- Si `useProject` devuelve 404 (id inventado), el estado no-encontrado tiene que
  aparecer sin pantalla en blanco. MSW lanza el mismo `PROJECT_NOT_FOUND`
  (`handlers.ts:264`), asi que se puede probar en las dos fuentes.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): project detail with updates and follow`

---

## Fase 3 -- Quienes somos

**Objetivo**: `/about` con hero oscuro, tres bloques de contenido y cierre lima
con aliados y CTA.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/data/about.ts` (nuevo)
- `apps/mobile/src/theme/overlays.ts` (agregar `forest80` -- extension de
  write-scope)
- `apps/mobile/src/features/about/AboutHero.tsx` (nuevo)
- `apps/mobile/src/features/about/AboutPillars.tsx` (nuevo)
- `apps/mobile/src/features/about/AboutCta.tsx` (nuevo)
- `apps/mobile/src/features/about/index.ts` (nuevo)
- `apps/mobile/src/features/home/AlliesSection.tsx` (prop `bgClassName`, D4 --
  extension de write-scope)
- `apps/mobile/app/about.tsx` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Quienes somos (`/about`)", las cuatro
vinetas. Ritmo de fondos: oscuro -> blanco -> lima, coherente con
`60-design-system.md`.

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `overlays.ts`: agregar `forest80: 'rgba(15,26,10,0.8)'` (el `forest` de
   `packages/ui-tokens` es `#0f1a0a`), con el comentario de a que overlay del
   vault corresponde. Aditivo: no se toca ninguna entrada existente.
2. `src/data/about.ts`: copy propio en espanol, tono del sitio. H1
   "Infraestructura abierta para el impacto colectivo"; tres bloques ("Que
   hacemos", "Como verificamos", "Quien esta detras") de 2-3 lineas cada uno,
   cada uno con su icono de `src/components/icons/benefits/index.ts`; CTA
   "Quiero hacer parte" con `href: '/subscription'`. El texto es **nuevo**: el
   vault da el tono, no las frases, asi que se marca cuales lineas son propuestas
   (misma convencion que `seed-data.ts` con sus `// proposed`).
3. `AboutHero.tsx`: `stats-bg.jpg` a sangre con `expo-image` + `LinearGradient`
   usando `overlay.forest80`, H1 `font-black` blanco, `Header logo="white"`
   encima. Alto fijo por `useWindowDimensions` (0.5), no `vh` -- que no existe
   en RN.
4. `AboutPillars.tsx`: seccion blanca con los tres bloques, icono 40px al estilo
   de `BenefitItem.tsx`. Si `BenefitItem` encaja tal cual, se reutiliza; si su
   layout no sirve (esta pensado para la lista de beneficios de Suscripcion), se
   compone localmente con los mismos SVG. Decidirlo leyendo el componente.
5. `AlliesSection.tsx`: agregar `bgClassName?: string` con
   default `'bg-neutral-100'` -- el valor literal de `:18` hoy -- y usarlo en la
   `View` raiz. Nada mas.
6. `AboutCta.tsx` + seccion lima: `AlliesSection` con
   `bgClassName="bg-accent-light"` y debajo `Button variant="dark" size="lg"
fullWidth` -> `router.push('/subscription')`.
7. `app/about.tsx`: ruta fina. `Screen statusBar="light" bg="bg-cream"` +
   `FullScreenMenu` + las tres secciones en orden.
8. Sin test nuevo: las tres secciones son puramente presentacionales y sin
   estado, y `20-mobile-conventions.md` dice explicitamente que esas no llevan
   test. El typecheck y el lint son el gate.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
  (la bateria unit completa de mobile, porque esta fase toca `overlays.ts` y
  `AlliesSection`, usados por Home)
- Pendiente manual: Home sigue **identica** tras el cambio de `AlliesSection`
  (comparar la seccion de aliados antes/despues); en `/about`, el orden de
  fondos oscuro -> blanco -> lima y el H1 en 900.

**Riesgos**:

- `AlliesSection` la usa Home: un default mal puesto cambia una pantalla ya
  entregada. El default tiene que ser literalmente `'bg-neutral-100'`.
- El copy de `about.ts` es invencion propia dentro del tono del sitio: se marca
  como propuesto para que la revision sepa que no salio del vault.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(mobile): about screen`

---

## Fase 4 -- Cierre: bateria completa, bundle y AI log

**Objetivo**: dejar el arbol verde de punta a punta, confirmar que Metro bundlea
y registrar la sesion como pide la prueba.

**Area**: --
**Archivos**:

- `docs/ai-workflow.md` (entrada nueva via `/ai-log`)
- `.claude/roadmap/ROADMAP.md` (fila 08 a `hecho`)

**Spec**: -- · **Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` -- unica corrida de la
   bateria completa del plan.
2. `bash scripts/dev/quality-check.sh --scope mobile --only bundle` (`expo export
--platform android`): valida que Metro resuelve los `require()` nuevos de
   assets y los imports nuevos. No hay dependencias nuevas en este plan, pero es
   la comprobacion que atrapa un `require()` con template string.
3. `/ai-log` con: que se pidio, que entrego la IA, que se reviso, que se ajusto a
   mano. Anotar **explicitamente**: (a) el estado "Siguiendo" no persiste entre
   entradas a la pantalla (D1); (b) el `Alert` de guest es temporal hasta el item
   09 (D3); (c) el badge "Planeado" quedo sin verificar visualmente por falta de
   dato en el seed; (d) la verificacion en dispositivo real del sticky y de la
   apertura de mapas.
4. Roadmap: marcar 08 `hecho` con su rango de commits.
5. Listar en el resumen los pendientes manuales acumulados de las Fases 1-3, sin
   darlos por hechos.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope all` en verde
- `--only bundle` en verde
- `docs/ai-workflow.md` con la entrada nueva y sin emojis

**Riesgos**: `--scope all` incluye los e2e de la API, que necesitan
`pnpm db:up`. Si Postgres no esta arriba, el paso falla por entorno y no por
codigo: levantarlo y volver a correr, no interpretarlo como regresion.

CHECKPOINT -- Fin del plan. Cerrar con `/merge-plan mobile-projects-and-about`.
**Commit sugerido**: `docs: log ai session mobile-projects-and-about`

---

## Trazabilidad: criterios de aceptacion del spec -> fase

| Criterio del spec 08                             | Fase  | Como se cubre                                                                                                         |
| ------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------- |
| Filtrar por zona cambia el listado (MSW y API)   | 1     | `useProjects({zoneSlug})` + `FilterChips`; verificacion manual con Patagonia (0 proyectos) **contra las dos fuentes** |
| Detalle muestra updates del seed ordenados desc  | 2     | Orden dentro de `UpdateTimeline`, asegurado por test (el seed tiene 1 update por proyecto, no se ve en pantalla)      |
| Follow como guest redirige/alerta                | 2     | `useAuth().status === 'guest'` -> `Alert`, sin disparar la mutacion (D3)                                              |
| Follow como authed (token de MSW) alterna estado | 2     | `useFollowProject` contra `handlers.ts:290-309`; estado local optimista (D1), **no persiste entre montajes**          |
| Test `FilterChips` (selecciona)                  | 1     | `__tests__/FilterChips.test.tsx`                                                                                      |
| Test `FollowButton` (estado following)           | 2     | `__tests__/FollowButton.test.tsx`                                                                                     |
| Test `UpdateTimeline` (renderiza N items)        | 2     | `__tests__/UpdateTimeline.test.tsx`                                                                                   |
| Entrada en menu apunta a `/projects`             | 1     | Ya existe (`src/data/nav.ts:18`); solo se verifica                                                                    |
| `expo export --platform android`                 | 4     | `--only bundle`                                                                                                       |
| Manual: sticky y apertura de mapas               | 2 y 4 | Anotado como pendiente, nunca declarado hecho                                                                         |
