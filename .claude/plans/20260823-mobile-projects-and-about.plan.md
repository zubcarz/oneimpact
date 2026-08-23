# Plan -- Mobile: Proyectos y Quienes somos (por fases, checkpoint por fase)

> **Fecha**: 2026-08-23
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/08-mobile-projects-and-about.md`
> **Base**: vault `02-Analisis-Visual/pantallas/pantallas-nuevas.md` (secciones
> "Proyectos", "Detalle de proyecto", "Quienes somos"), `design-tokens.md`,
> `.claude/rules/60-design-system.md`, plan previo
> `.claude/plans/20260822-mobile-data-layer-and-auth.plan.md` (item 07, entregado
> a medias -- ver D2)
> **Areas**: mobile
> **Contrato shared tocado**: No. Se consume `projectSchema` /
> `projectWithUpdatesSchema` (`packages/shared/src/schemas/catalog.ts:27-57`) y
> `SEED_PROJECTS` (`packages/shared/src/seed-data.ts:72`) tal cual estan
> **Schema Prisma tocado**: No
> **Eventos**: No emite ni escucha. `POST /v1/projects/:id/follow` provoca
> `project.followed` del lado servidor, ya implementado en
> `apps/api/src/modules/projects/application/follows.service.ts:31-36`
> **Zonas de riesgo**: (1) **sesion** -- el boton Seguir necesita saber si hay
> token, y `AuthProvider` **no existe** todavia (D2); (2) **estado "Siguiendo"
> sin fuente de verdad en el contrato** (D1); (3) **resolucion de assets** --
> `assetFor` lanza para claves no mapeadas (D5); (4) **sticky sobre ScrollView**
> -- `Screen` es un `ScrollView`, el CTA fijo no puede ir dentro. Pago simulado:
> no se toca (es el item 09)
> **Fase del roadmap**: Fase 1 (entrega lunes 24 ago 2026, 18:00) -- Ola 3,
> paralelo con 06 y 11
> **Como ejecutar**: `/run-plan-worktree` sobre `feat/mobile-projects-and-about`
> (lo indica el spec), luego `/merge-plan`

## Objetivo

Cerrar las dos rutas que el sitio de referencia devuelve como 403 y que el menu
ya enlaza pero no existen como pantalla: **Proyectos** (listado con filtro por
zona + detalle con avances y boton Seguir) y **Quienes somos**. Con esto la app
publica queda al 100 % y el GIF de la entrega puede recorrerla entera.

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

### 2. La API ya sirve todo lo que estas pantallas necesitan

- `GET /v1/projects?zoneSlug&status` y `GET /v1/projects/:id`, ambos `@Public()`
  (`apps/api/src/modules/projects/controllers/projects.controller.ts:27-44`).
- `POST|DELETE /v1/projects/:id/follow`, autenticados y **idempotentes**
  (`project-follows.controller.ts:31-45`, `follows.service.ts:24-46`).
- El cliente ya los expone: `packages/api-client/src/resources/projects.ts:29-50`.
- Los hooks ya existen: `useProjects`/`useProject`
  (`apps/mobile/src/api/hooks/useProjects.ts`) y `useFollowProject`
  (`useFollowProject.ts:8-27`), con las query keys de
  `src/api/hooks/keys.ts:16-20`.

**El comentario `NOTE (D5, ...)` de `useFollowProject.ts:5-7` esta obsoleto**: dice
que la API no implementa follow, y el item 06 lo implemento (`d35604f`). Se
corrige en la Fase 2, es una linea de comentario dentro de un archivo que ya
tocamos por contexto.

### 3. `GET /v1/projects` devuelve `zoneId`, no `zoneSlug` ni el nombre de la zona

`projectSchema` (`packages/shared/src/schemas/catalog.ts:27-41`) trae `zoneId`, y
el mapper no agrega la zona en el listado
(`apps/api/src/modules/projects/infrastructure/projects.mapper.ts:18-34`). Solo
el **detalle** incluye `zone` (`projects.mapper.ts:65-71`,
`projectWithUpdatesSchema` en `catalog.ts:54-57`).

Consecuencia concreta: el chip de zona sobre la imagen de la `ProjectCard` y los
chips de filtro necesitan un mapa `zoneId -> {slug, name}` construido en el
cliente con `useZones()` (query ya cacheada, la usa Zonas). No se cambia el
contrato por esto.

### 4. Los assets del seed ya estan y hay un resolvedor, pero lanza

`src/data/zones.ts:14-38` mapea claves del seed a `require()` y `assetFor` **tira
`Error`** si la clave no esta. Hoy las 5 claves de `SEED_PROJECTS` (`advances/*.jpg`)
estan mapeadas, asi que contra el seed funciona. Pero el item 11 (admin) crea
proyectos con `coverKey` arbitrario: en cuanto exista uno, el listado revienta.
Ver D5.

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
`AlliesSection.tsx:27-41`. Ver D6.

### 8. Piezas reutilizables identificadas

| Necesito                           | Ya existe                                                                                 | Archivo                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Hero crema + topografico           | `ZonesHero` (patron, no reutilizable tal cual: lee `zonesScreen`)                         | `src/features/zones/ZonesHero.tsx`                                    |
| SVG topografico                    | `TopoLines`                                                                               | `src/components/icons/TopoLines.tsx`                                  |
| Hero 55vh + back glass + gradiente | `ZoneDetailHero` (patron; falta chip de zona)                                             | `src/features/zones/ZoneDetailHero.tsx:27-53`                         |
| Barra de progreso                  | `ProgressBar` (track `bg-cream`, fill `bg-dark-green`, `accessibilityRole="progressbar"`) | `src/components/ui/ProgressBar.tsx`                                   |
| Boton pildora                      | `Button` (`accent`/`white`/`dark`/`ink`, `fullWidth`, `size`)                             | `src/components/ui/Button.tsx`                                        |
| Iconos 40px estilo beneficios      | `BenefitItem` + los 6 SVG                                                                 | `src/components/ui/BenefitItem.tsx`, `src/components/icons/benefits/` |
| Aliados                            | `AlliesSection` (fondo fijo, ver D6)                                                      | `src/features/home/AlliesSection.tsx`                                 |
| Scroll + StatusBar                 | `Screen`                                                                                  | `src/components/layout/Screen.tsx`                                    |

`Chip` **no** sirve para los filtros: es la pildora "Ver mas" con flecha y fondo
lima fijo (`src/components/ui/Chip.tsx:26-34`). `FilterChips` es componente nuevo,
como dice el write-scope del spec.

### 9. `Screen` es un `ScrollView`: el sticky no cabe dentro

`Screen.tsx:29-39` devuelve el `ScrollView` como raiz. Un CTA fijo abajo no puede
ser hijo suyo. El detalle usa `<Screen scroll={false}>` con un `ScrollView`
propio y el `FollowButton` como hermano absoluto, con `paddingBottom` de
`useSafeAreaInsets()`. Es el unico lugar del plan donde se sale del patron de las
demas pantallas, y es por una limitacion real del componente, no por gusto.

### 10. Rutas fuera de `(tabs)`: la tab bar desaparece

`app/projects/*` y `app/about.tsx` cuelgan del `Stack` raiz, igual que
`app/zone/[slug].tsx` hoy. Es consistente con lo ya entregado. `app/_layout.tsx:33-35`
solo declara `<Stack.Screen name="(tabs)" />`; expo-router registra el resto por
convencion de archivos, no hace falta tocar el layout.

## Decisiones pendientes (bloqueantes)

### D1 -- El estado "Siguiendo" no tiene fuente de verdad en el contrato

Ningun endpoint dice si el usuario actual sigue un proyecto:
`dashboardSummarySchema.followedProjects` es **un contador**
(`packages/shared/src/schemas/payment.ts:88`), y `GET /v1/projects/:id` es
`@Public()`, sin contexto de usuario.

- **(a) Estado local optimista (recomendada)**: el `FollowButton` arranca en "no
  seguido" y alterna con el resultado de la mutacion. Honesto para la demo, cero
  cambios de contrato, cabe en el write-scope mobile. Coste: al recargar la
  pantalla vuelve a "Seguir este proyecto" aunque el follow este persistido.
- (b) Agregar `following: boolean` a `projectWithUpdatesSchema` y auth opcional
  en `GET /:id`: toca `packages/shared` + `apps/api`, fuera del write-scope, y
  obliga a revisar los 3 consumidores.
- (c) `GET /v1/me/follows` nuevo: mismo problema que (b).

**Recomendacion: (a)**, y registrar el hueco de contrato como entrada para el
item 12. La limitacion se anota en el resumen de la fase, no se disimula.

### D2 -- El item 07 esta entregado a medias: no hay MSW ni `AuthProvider`

En `main` solo entraron las fases 1 y 2 del plan 07 (`8d7c0d1`, `74521aa`). Las
fases 3 (MSW), 4 (`AuthProvider` + grupos de ruta), 5 (Zonas consume hooks) y 6
(cierre) **no existen**: no hay dependencia `msw` en
`apps/mobile/package.json`, no hay `src/api/msw/`, y `src/auth/` solo tiene
`token-store.ts`. El roadmap sigue marcando 07 como `pendiente`
(`.claude/roadmap/ROADMAP.md:133`).

Esto choca con dos criterios de aceptacion del spec 08, que nombran MSW
explicitamente ("Filtrar por zona cambia el listado (MSW y API)", "como authed
(token de MSW) alterna estado").

- **(a) 08 corre solo contra la API real (recomendada)**: `EXPO_PUBLIC_API_URL`
  ya apunta a `http://192.168.0.3:5000`. Para "hay sesion o no" se lee
  `getAccessToken()` de `src/auth/token-store.ts:11-13` con un hook local minimo
  en `src/features/projects/`, sin adelantar el `AuthProvider` del item 07. Los
  criterios que dicen "MSW" se releen como "contra la API con seed". 08 queda
  autocontenido y mobile-only.
- (b) 08 absorbe las fases 3 y 4 del plan 07: amplia el write-scope, mete
  dependencias nuevas (riesgo de bundling con Metro justo antes de la entrega) y
  hace el trabajo que le toca a 07.

**Recomendacion: (a)**, y reabrir 07 explicitamente como pendiente con sus fases
3-6. Si el usuario prefiere (b), este plan se rehace: cambia el mapa de fases
entero.

### D6 -- Aliados sobre lima en Quienes somos

`AlliesSection` tiene `bg-neutral-100` clavado (`AlliesSection.tsx:18`).

- **(a) Prop opcional `bgClassName` en `AlliesSection` (recomendada)**: una linea,
  default identico al de hoy, Home no cambia de pixel. Toca
  `src/features/home/`, **fuera del write-scope declarado**.
- (b) Extraer `AllyBadge` a `src/components/ui/` y armar una seccion lima propia
  en `src/features/about/`: dentro del write-scope, pero duplica el
  `SectionHeader` y el layout de badges.
- (c) Envolver `AlliesSection` en una `View` lima: no sirve, el fondo interno
  sigue siendo `neutral-100`.

**Recomendacion: (a)**, con la extension de write-scope aprobada abajo.

### Extensiones de write-scope que este plan pide

El spec 08 declara el write-scope en su linea 5. Estos tres archivos quedan
fuera y hacen falta:

1. `apps/mobile/src/data/projects.ts` -- copy estatico de la pantalla y
   resolucion segura de assets. Es la convencion del repo para copy
   (`src/data/zones.ts`, `src/data/home.ts`); meterlo en `src/features/` para
   esquivar el scope seria peor.
2. `apps/mobile/src/theme/overlays.ts` -- una entrada `forest80` para el hero de
   Quienes somos (hallazgo 6). Aditivo puro.
3. `apps/mobile/src/features/home/AlliesSection.tsx` -- solo si se aprueba D6(a).

Ninguna de las tres cambia comportamiento existente. **Sin aprobacion de las tres,
las Fases 1 y 3 no arrancan.**

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

**Objetivo**: confirmar que el arbol arranca en verde y que las tres decisiones
(D1, D2, D6) mas la extension de write-scope estan resueltas antes de escribir
nada.

**Area**: --
**Archivos**: ninguno (solo lectura)
**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `git status` limpio y rama `feat/mobile-projects-and-about` creada desde
   `main`. Ojo: `docs/local-run-status.md` y el cambio de puertos 5000/5001
   (`935e109`) ya estan en `main`; si quedara algo sin commitear, se resuelve
   antes, no dentro de este plan.
2. `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
   en verde como linea base.
3. Confirmar API arriba con seed: `curl -s http://127.0.0.1:5000/v1/projects`
   devuelve `{items:[...5], total:5}` y
   `curl -s "http://127.0.0.1:5000/v1/projects?zoneSlug=patagonia"` devuelve
   `total: 0`. Si la API no esta arriba: `pnpm db:up` y `pnpm dev:api`.
4. Verificar que D1, D2 y D6 tienen respuesta del usuario y que las tres
   extensiones de write-scope estan aprobadas. **Sin eso, parar aca.**

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
- Los dos `curl` de la accion 3.

**Riesgos**: si la API no esta corriendo, las Fases 1 y 2 se pueden implementar y
typechear igual, pero la verificacion manual queda incompleta y hay que anotarla
como pendiente.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Listado de Proyectos con filtro por zona

**Objetivo**: `/projects` renderizando el listado real de la API, filtrable por
zona, con estados de carga, vacio y error.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/data/projects.ts` (nuevo -- **extension de write-scope**)
- `apps/mobile/src/components/ui/FilterChips.tsx` (nuevo)
- `apps/mobile/src/components/ui/ProjectCard.tsx` (nuevo)
- `apps/mobile/src/components/ui/index.ts` (agregar 2 exports, tras
  `ProgressBar` en `:33-34`)
- `apps/mobile/src/features/projects/ProjectsHero.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectsList.tsx` (nuevo)
- `apps/mobile/src/features/projects/index.ts` (nuevo)
- `apps/mobile/app/projects/index.tsx` (nuevo; borrar `app/projects/.gitkeep` y
  `src/features/projects/.gitkeep`)
- `apps/mobile/__tests__/FilterChips.test.tsx` (nuevo)
- `apps/mobile/__tests__/projects-data.test.ts` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Proyectos (`/projects`) -- publica",
las cuatro vinetas completas. Tokens: `60-design-system.md`.

**Shared**: No -- solo se consume `Project` y `ProjectStatus`.
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `src/data/projects.ts`: copy en espanol del hero (H1 "Proyectos en marcha",
   parrafo "Cada proyecto tiene coordenadas reales, evidencia y un porcentaje de
   avance verificado."), etiquetas de estado (`Activo` / `Planeado` /
   `Completado`), label del chip "Todas", copy de vacio ("Aun no hay proyectos
   aqui") y de error. Ademas `projectImage(coverKey?: string): number | null`:
   envuelve `assetFor` de `src/data/zones.ts:32` en try/catch y devuelve `null`
   para clave desconocida o ausente (D5). **No se modifica `assetFor`**: sigue
   lanzando para quien depende de su contrato estricto.
2. `FilterChips.tsx`: `items: {value,label}[]`, `value: string | null`,
   `onChange`. `ScrollView` horizontal, `showsHorizontalScrollIndicator={false}`,
   pildoras. Activa `bg-gray-900` + texto `text-white`, inactiva `bg-white` +
   `text-gray-700`, ambas `font-bold text-sm`. Cada chip `accessibilityRole="button"`,
   `accessibilityState={{ selected }}` y area >=44pt (`py-3 px-5`).
3. `ProjectCard.tsx`: `rounded-3xl bg-white p-3 shadow-sm`; imagen
   `h-40 rounded-2xl` con `expo-image` + `contentFit="cover"`; chip de zona
   absoluto `bg-accent` arriba a la izquierda; titulo `font-bold text-lg`;
   resumen `text-sm text-gray-500`; `ProgressBar` + porcentaje
   `font-bold text-xs` y badge de estado (Activo lima, Planeado gris, Completado
   forest). Cuando `image` es `null`, en vez de la foto va un bloque
   `bg-cream rounded-2xl h-40` con el chip de zona encima -- nunca un crash.
   `accessibilityRole="button"` en la card entera.
4. `ProjectsHero.tsx`: mismo patron que `ZonesHero.tsx:8-16` (`bg-cream px-5
pb-14 pt-24` + `TopoLines`), con el copy de `src/data/projects.ts`. Peso
   `font-bold` (700), que es el de Zonas y Suscripcion, no el 900 de Home.
5. `ProjectsList.tsx`: presentacional. Recibe `projects`, `zonesById`,
   `isLoading`, `isError`, `onPressProject`. Loading = 3 skeletons
   `bg-white rounded-3xl h-64 opacity-60`. Vacio = copy de vacio. Error = copy de
   error + `Button variant="dark"` de reintento. **No llama hooks de red** (regla
   de `20-mobile-conventions.md`).
6. `app/projects/index.tsx`: ruta fina. `useState` del filtro; `useZones()` para
   construir los items del chip (ordenados por `order`) y el mapa
   `zoneId -> zone`; `useProjects(zoneSlug ? { zoneSlug } : undefined)`. Compone
   `Screen` (`statusBar="dark"`, `bg="bg-cream"`) + `Header logo="black"` +
   `FullScreenMenu` + hero + chips + lista, igual que `app/(tabs)/zones.tsx:8-16`.
   Navega al detalle con `router.push(\`/projects/${id}\`)`.
7. Tests: `FilterChips.test.tsx` -- render de N chips, `onChange` con el valor
   correcto al pulsar, y `accessibilityState.selected` en la activa.
   `projects-data.test.ts` -- `projectImage` resuelve las 5 claves de
   `SEED_PROJECTS` y devuelve `null` para `'no/existe.jpg'` y para `undefined`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "FilterChips|projects-data"`
- Pendiente manual (Expo Go / web en :8081): abrir el menu -> "Proyectos" navega;
  el listado muestra 5 tarjetas; tocar "Patagonia" deja el listado vacio con el
  copy correcto; tocar "Todas" lo restaura; la card de "Amazonia carbono" muestra
  badge Completado y barra al 100 %.

**Riesgos**:

- Que `useZones()` resuelva despues que `useProjects()` y el chip de zona quede
  vacio un frame. Se cubre mostrando el skeleton mientras cualquiera de las dos
  este cargando.
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
- `apps/mobile/src/components/ui/index.ts` (agregar 2 exports)
- `apps/mobile/src/features/projects/ProjectDetailHero.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectFacts.tsx` (nuevo)
- `apps/mobile/src/features/projects/ProjectUpdates.tsx` (nuevo)
- `apps/mobile/src/features/projects/useHasSession.ts` (nuevo -- D2(a))
- `apps/mobile/src/features/projects/index.ts` (ampliar)
- `apps/mobile/src/data/projects.ts` (ampliar: copy del detalle)
- `apps/mobile/app/projects/[id].tsx` (nuevo)
- `apps/mobile/src/api/hooks/useFollowProject.ts` (corregir el comentario
  obsoleto de `:5-7`)
- `apps/mobile/__tests__/UpdateTimeline.test.tsx` (nuevo)
- `apps/mobile/__tests__/FollowButton.test.tsx` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Detalle de proyecto (`/projects/[id]`)",
las cuatro vinetas.

**Shared**: No
**Prisma**: No
**Eventos**: No emite. El `POST /follow` dispara `project.followed` en el
servidor (`follows.service.ts:31-36`); el cliente no sabe ni le importa.

**Acciones**:

1. `useHasSession.ts`: hook minimo que lee `getAccessToken()`
   (`src/auth/token-store.ts:11`) una vez en `useEffect` y expone
   `'loading' | 'guest' | 'authed'`. **Deliberadamente no es el `AuthProvider`**
   del item 07: no revalida con `GET /me`, no maneja roles, no persiste nada.
   Lleva un comentario que dice exactamente eso y que debe borrarse cuando 07
   entregue su fase 4.
2. `ProjectDetailHero.tsx`: calcado de `ZoneDetailHero.tsx:27-53` (55 % del alto
   con `useWindowDimensions`, `expo-image` a sangre, `LinearGradient`
   `black20 -> black80`, back glass `BlurView` de 44pt con `insets.top`) mas un
   chip de zona `bg-accent` sobre el titulo. Titulo `font-black text-3xl` blanco
   (el spec pide 900 aca, como en Home).
3. `ProjectFacts.tsx`: bloque blanco con `ProgressBar` grande, "Avance verificado
   NN %", coordenadas con icono `MapPin` de lucide y fecha objetivo formateada en
   espanol. La fila de coordenadas es `Pressable` -> `Linking.openURL` a
   `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, con
   `accessibilityRole="link"`. Si `lat`/`lng` o `targetDate` vienen `undefined`
   (son opcionales en `projectSchema:36-38`), la fila **no se renderiza**.
4. `UpdateTimeline.tsx`: `items: ProjectUpdate[]`. Linea vertical `bg-accent/40`,
   punto lima por item; fecha `text-white/50 text-xs`, titulo
   `text-accent font-bold text-sm`, cuerpo `text-white/80 text-xs`, imagen
   opcional `rounded-2xl` resuelta con `projectImage(update.mediaKey)` (null ->
   no se pinta). Ordena por `publishedAt` descendente dentro del componente.
5. `ProjectUpdates.tsx`: seccion `bg-forest` con `SectionHeader` "Avances" en
   blanco envolviendo `UpdateTimeline`, y copy de vacio si no hay updates.
6. `FollowButton.tsx`: presentacional puro. Props `following`, `onPress`,
   `disabled`. Siguiendo = `bg-white border` + "Siguiendo"; no seguido =
   `bg-accent` + "Seguir este proyecto". `accessibilityRole="button"`,
   `accessibilityState={{ selected: following }}`, altura >=44pt.
   `expo-haptics` (`selectionAsync`) al pulsar.
7. `app/projects/[id].tsx`: `useLocalSearchParams`, `useProject(id)`,
   `useFollowProject()`, `useHasSession()`. Estado local `following` (D1(a)),
   inicializado en `false`, que alterna con `onSuccess` de la mutacion. Guest ->
   `Alert.alert('Inicia sesion para seguir', ...)` (lo que manda el spec 08 hasta
   que 09 cree el login); dejar un `TODO` con el `router.push('/(auth)/login?returnTo=...')`
   que corresponde. Layout: `<Screen scroll={false}>` + `ScrollView` interno con
   `contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}` + footer
   absoluto con el `FollowButton` (hallazgo 9). Estado no-encontrado calcado de
   `app/zone/[slug].tsx:19-28`.
8. Corregir el comentario obsoleto de `useFollowProject.ts:5-7`: el endpoint
   existe desde `d35604f`.
9. Tests: `UpdateTimeline.test.tsx` -- renderiza N items y los ordena
   descendente por `publishedAt` (aca se cubre el criterio que la vista no puede
   mostrar, hallazgo 5). `FollowButton.test.tsx` -- copy y
   `accessibilityState.selected` en ambos estados, y que `onPress` no dispara con
   `disabled`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "UpdateTimeline|FollowButton"`
- Caso negativo obligatorio: **sin token**, pulsar Seguir muestra el `Alert` y
  **no** dispara la mutacion (se asegura en el codigo: el `onPress` corta antes
  de `follow.mutate`).
- Caso negativo obligatorio: **con token invalido**, la mutacion recibe 401,
  `callApi` intenta refresh, falla, limpia tokens y notifica
  (`src/api/client.ts:62-77`); la UI vuelve a "Seguir este proyecto". Se verifica
  a mano, no hay test de red en esta fase.
- Pendiente manual: sticky del `FollowButton` sobre el scroll (que no tape el
  ultimo avance y respete `insets.bottom`); apertura de la app de mapas al tocar
  las coordenadas -- **en web `Linking.openURL` abre pestana, en Expo Go abre la
  app**: probar en el telefono, no solo en :8081.

**Riesgos**:

- El estado `following` local se pierde al volver a entrar (D1(a), asumido). Hay
  que decirlo en el resumen de la fase, no dejarlo pasar como si funcionara.
- `Alert` no existe en web: en el navegador aparece como `window.alert`. Aceptable
  para la demo; el flujo real llega con el item 09.
- Si `useProject` devuelve 404 (id inventado), el estado no-encontrado tiene que
  aparecer sin pantalla en blanco.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): project detail with updates and follow`

---

## Fase 3 -- Quienes somos

**Objetivo**: `/about` con hero oscuro, tres bloques de contenido y cierre lima
con aliados y CTA.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/data/about.ts` (nuevo)
- `apps/mobile/src/theme/overlays.ts` (agregar `forest80` -- **extension de
  write-scope**)
- `apps/mobile/src/features/about/AboutHero.tsx` (nuevo)
- `apps/mobile/src/features/about/AboutPillars.tsx` (nuevo)
- `apps/mobile/src/features/about/AboutCta.tsx` (nuevo)
- `apps/mobile/src/features/about/index.ts` (nuevo)
- `apps/mobile/src/features/home/AlliesSection.tsx` (solo si D6(a):
  prop opcional `bgClassName` -- **extension de write-scope**)
- `apps/mobile/app/about.tsx` (nuevo)

**Spec**: `pantallas-nuevas.md` seccion "Quienes somos (`/about`)", las cuatro
vinetas. Ritmo de fondos: oscuro -> blanco -> lima, coherente con
`60-design-system.md`.

**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `overlays.ts`: agregar `forest80: 'rgba(15,26,10,0.8)'` (el `forest` de
   `packages/ui-tokens` es `#0f1a0a`), con el comentario de a que overlay del
   vault corresponde. Aditivo: no se toca ninguna entrada existente.
2. `src/data/about.ts`: copy propio en espanol, tono del sitio. H1
   "Infraestructura abierta para el impacto colectivo"; tres bloques ("Que
   hacemos", "Como verificamos", "Quien esta detras") de 2-3 lineas cada uno,
   cada uno con su icono de `src/components/icons/benefits/index.ts`; copy del
   CTA "Quiero hacer parte" con `href: '/subscription'`. El texto es **nuevo**:
   el vault da el tono, no las frases, asi que se marca en el archivo cuales
   lineas son propuestas y no vienen del vault (misma convencion que
   `seed-data.ts` con sus `// proposed`).
3. `AboutHero.tsx`: `stats-bg.jpg` a sangre con `expo-image` +
   `LinearGradient` usando `overlay.forest80`, H1 `font-black` blanco,
   `Header logo="white"` encima. Alto fijo por `useWindowDimensions` (0.5), no
   `vh` -- que no existe en RN.
4. `AboutPillars.tsx`: seccion blanca con los tres bloques, icono 40px al estilo
   de `BenefitItem.tsx`. Si `BenefitItem` encaja tal cual, se reutiliza; si su
   layout no sirve (esta pensado para la lista de beneficios de Suscripcion), se
   compone localmente con los mismos SVG. Decidirlo leyendo el componente, no
   antes.
5. `AboutCta.tsx` + seccion lima: `bg-accent-light` con `AlliesSection`
   (`bgClassName="bg-accent-light"` si D6(a)) y debajo `Button variant="dark"
size="lg" fullWidth` con el CTA -> `router.push('/subscription')`.
6. `app/about.tsx`: ruta fina. `Screen statusBar="light" bg="bg-cream"` +
   `FullScreenMenu` + las tres secciones en orden.
7. Sin test nuevo: las tres secciones son puramente presentacionales y sin
   estado, y la regla de `20-mobile-conventions.md` dice explicitamente que esas
   no llevan test. El typecheck y el lint son el gate.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
  (la bateria unit completa de mobile, que es rapida, porque esta fase no agrega
  tests propios pero toca `overlays.ts` y `AlliesSection`, usados por Home)
- Pendiente manual: Home sigue **identica** tras el cambio de `AlliesSection`
  (comparar la seccion de aliados antes/despues); en `/about`, el orden de
  fondos oscuro -> blanco -> lima y el H1 en 900.

**Riesgos**:

- `AlliesSection` la usa Home: un default mal puesto en la prop nueva cambia una
  pantalla ya entregada. El default tiene que ser literalmente
  `'bg-neutral-100'`, el valor actual de `AlliesSection.tsx:18`.
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
- `.claude/roadmap/ROADMAP.md` (fila 08 a `hecho`; **y fila 07 corregida**, ver
  accion 4)

**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` -- unica corrida de la
   bateria completa del plan.
2. `bash scripts/dev/quality-check.sh --scope mobile --only bundle` (`expo export
--platform android`): valida que Metro resuelve los `require()` nuevos de
   assets y los imports nuevos. No hay dependencias nuevas en este plan, asi que
   es una comprobacion barata pero no opcional -- es la que atrapa un
   `require()` con template string.
3. `/ai-log` con: que se pidio, que entrego la IA, que se reviso, que se ajusto a
   mano. Anotar **explicitamente**: (a) el estado "Siguiendo" no persiste entre
   entradas a la pantalla (D1(a)); (b) `useHasSession` es un puente temporal
   hasta la fase 4 del item 07; (c) el badge "Planeado" quedo sin verificar
   visualmente por falta de dato en el seed; (d) la verificacion en dispositivo
   real (Expo Go) del sticky y de la apertura de mapas.
4. Roadmap: marcar 08 `hecho` con su rango de commits. **Y corregir la fila 07**:
   hoy figura `pendiente` sin commits, cuando `8d7c0d1..74521aa` si estan en
   `main`; dejarla como "parcial (fases 1-2); pendientes MSW, AuthProvider y
   Zonas sobre hooks".
5. Listar en el resumen los pendientes manuales acumulados de las Fases 1-3, sin
   darlos por hechos.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope all` en verde
- `--only bundle` en verde
- `docs/ai-workflow.md` con la entrada nueva y sin emojis

**Riesgos**: `--scope all` incluye los e2e de la API, que necesitan
`pnpm db:up`. Si Postgres no esta arriba, el paso falla por entorno y no por
codigo: levantarlo antes y volver a correr, no interpretarlo como regresion.

CHECKPOINT -- Fin del plan. Cerrar con `/merge-plan mobile-projects-and-about`.
**Commit sugerido**: `docs: log ai session mobile-projects-and-about`

---

## Trazabilidad: criterios de aceptacion del spec -> fase

| Criterio del spec 08                            | Fase  | Como se cubre                                                                                                                                |
| ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Filtrar por zona cambia el listado              | 1     | `useProjects({zoneSlug})` + `FilterChips`; verificacion manual con Patagonia (0 proyectos). **Reformulado: contra la API real, no MSW (D2)** |
| Detalle muestra updates del seed ordenados desc | 2     | Orden dentro de `UpdateTimeline`, asegurado por test (el seed tiene 1 update por proyecto, no se ve en pantalla)                             |
| Follow como guest redirige/alerta               | 2     | `useHasSession()` -> `Alert`, sin disparar la mutacion                                                                                       |
| Follow como authed alterna estado               | 2     | Estado local optimista sobre `useFollowProject` (D1(a)); **no persiste entre montajes**                                                      |
| Test `FilterChips` (selecciona)                 | 1     | `__tests__/FilterChips.test.tsx`                                                                                                             |
| Test `FollowButton` (estado following)          | 2     | `__tests__/FollowButton.test.tsx`                                                                                                            |
| Test `UpdateTimeline` (renderiza N items)       | 2     | `__tests__/UpdateTimeline.test.tsx`                                                                                                          |
| Entrada en menu apunta a `/projects`            | 1     | Ya existe (`src/data/nav.ts:18`); solo se verifica                                                                                           |
| `expo export --platform android`                | 4     | `--only bundle`                                                                                                                              |
| Manual: sticky y apertura de mapas              | 2 y 4 | Anotado como pendiente, nunca declarado hecho                                                                                                |
