# Plan -- Mobile: Dashboard, Perfil/iPass y atajo Admin (por fases, checkpoint por fase)

> **Fecha**: 2026-08-24
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/10-mobile-dashboard-and-profile.md`
> **Base**: vault `02-Analisis-Visual/pantallas/pantallas-nuevas.md` (secciones
> "Dashboard", "Perfil / iPass", "Admin (mobile, solo rol admin)"),
> `01-Tecnologia-Arquitectura/arquitectura-mobile.md` (`app/(app)/**`, capas),
> `design-tokens.md`, `.claude/rules/60-design-system.md`. Depende de 06 (hecho,
> `d0fab7b`) y 09 (hecho, `5dcd596`) -- ambos ya en `main`, el item queda
> desbloqueado.
> **Areas**: mobile (principal) + api + shared (Fase 1, decision del usuario --
> ver abajo)
> **Contrato shared tocado**: **Si**. `dashboardSummarySchema`
> (`packages/shared/src/schemas/payment.ts:83-92`) gana un campo aditivo
> `followedProjectIds: string[]`. Consumidores verificados por grep: solo
> `DashboardSummaryDto` (api, auto-generado con `createZodDto`, sin cambio de
> codigo) y el tipo `DashboardSummary` que consume
> `apps/mobile/src/api/hooks/useDashboard.ts` (sin cambio de codigo, el tipo se
> ensancha solo). No hay mas usos de `followedProjects` fuera de
> `dashboard.service.ts`/`.spec.ts` y `admin-state.ts` (grep confirmado).
> **Schema Prisma tocado**: No. Se reusan `ProjectFollow` y `Subscription` tal
> cual estan; el cambio es de query (`findFirst` sin filtrar por `ACTIVE`), no
> de schema.
> **Eventos**: No emite ni escucha eventos nuevos. `GET /v1/dashboard/me` sigue
> siendo una lectura pura.
> **Zonas de riesgo**: (1) contrato del dashboard incompleto para dos criterios
> de aceptacion del spec -- resuelto en Fase 1, ver "Decisiones" abajo; (2)
> `react-native-qrcode-svg` es una dependencia nueva que **instala el usuario**,
> no el implementer (asi lo marca el spec); (3) rol ADMIN en `admin.tsx` --
> `useRequireRole('ADMIN')` ya probado por items 07/09, se reusa tal cual: caso
> negativo (USER no ve "Panel admin") es fila condicional en Perfil, no una
> ruta nueva que proteger desde cero. Pago simulado: no se toca.
> **Fase del roadmap**: declarada "Fase 1 (si hay tiempo) / 2" en
> `ROADMAP.md`. Con fecha de hoy (lunes 24, dia de entrega) y 06/09 ya
> mergeados, este item corre igual; documentar en el cierre si cae de un lado u
> otro de las 18:00.
> **Como ejecutar**: `/run-plan-worktree` sobre `feat/mobile-dashboard-and-profile`
> (lo indica el spec), luego `/merge-plan`.
> **Estado de arranque**: **listo**, con dos decisiones ya resueltas por el
> usuario antes de escribir este plan (ver "Decisiones pendientes").

## Objetivo

Cerrar la zona logueada: **Dashboard** (suscripcion, linea de travesia,
proyectos seguidos, ultimo avance, notificaciones), **Perfil/iPass** (tarjeta
con QR decorativo, gestion de suscripcion, cerrar sesion) y el atajo **Admin
mobile** (lista de proyectos + publicar avance) para rol ADMIN, con su propia
tab bar bajo `(app)`.

## Decisiones pendientes (bloqueantes) -- YA RESUELTAS

Durante el analisis aparecieron dos huecos reales entre el contrato congelado
(`dashboardSummarySchema`, items 01/06/07) y los criterios de aceptacion que
este mismo spec 10 exige. Se consultaron al usuario antes de fijar el mapa de
fases; ambas respuestas quedan registradas aca para que la ejecucion no las
reabra:

**D1 -- "Tus proyectos" necesita la lista real de proyectos seguidos, no un
conteo.** `dashboardSummarySchema` solo trae `followedProjects: number`
(`payment.ts:88`); ni `GET /v1/dashboard/me` ni `GET /v1/projects` (publico,
sin contexto de usuario) exponen los ids. Sin esto, "Seguir un proyecto ...
lo hace aparecer en 'Tus proyectos'" (criterio de aceptacion del spec) no se
puede cumplir.
**Resuelto**: extender `dashboardSummarySchema` con `followedProjectIds:
string[]` (aditivo, `followedProjects` como conteo se mantiene). El dashboard
cruza esos ids contra `GET /v1/projects` (ya publico, ya tiene `useProjects()`
en mobile). Se descartaron la alternativa de un endpoint nuevo dedicado (mas
superficie de API de la necesaria) y la de degradar la UI a solo texto (no
cumple el criterio tal como esta escrito).

**D2 -- Cancelar suscripcion pierde el plan del dashboard.**
`DashboardService.getSummary` resuelve la suscripcion con
`ImpactRepository.findActiveSubscription` (`impact.repository.ts:54-58`),
filtrado a `status: ACTIVE`. Tras cancelar, esa query no devuelve nada y la
respuesta cae en la rama "nunca se suscribio" (`plan: null, status: null,
activeMonths: 0`) -- no en `status: CANCELED` con el plan visible. El criterio
"Cancelar suscripcion: card pasa a 'Cancelada', puntos intactos" no se puede
cumplir de forma persistente con el codigo actual (confirmado: ningun test
existente cubre `dashboard.status` tras un cancel real, solo `journeyPoints`).
**Resuelto**: cambiar `ImpactRepository` para resolver la suscripcion **mas
reciente sin filtrar por status** (`findLatestSubscription`, `orderBy:
startedAt desc`) y dejar que `status` viaje tal cual (`ACTIVE` o `CANCELED`);
`activeMonths` se congela en `canceledAt` cuando el status es `CANCELED` (el
metodo `activeMonthsSince` ya acepta un `now` parametrizable,
`dashboard.service.ts:106-114`). `dashboardSummarySchema.status` ya admite
`CANCELED` (`payment.ts:86`), asi que no hay cambio de schema aca, solo de
logica + su test. Se descarto resolverlo solo con estado local en Perfil
(no sobrevive a reabrir la app / volver al dashboard).

Ambos cambios entran en la Fase 1, la unica que toca `apps/api` y
`packages/shared` -- fuera del write-scope literal del spec
(`apps/mobile/app/(app)/**`, `src/features/dashboard|profile/**`, 3
componentes de `ui`), documentado aca por la misma razon que items previos
(ver `ROADMAP.md`, "Sobre el 07"/"Sobre el 11").

## Contexto y hallazgos del analisis

### 1. El grupo `(app)` ya existe, es un placeholder deliberado

`app/(app)/_layout.tsx` ya implementa el guard (`useRequireAuth` + `Stack`,
sin tabs propias) y `app/(app)/dashboard.tsx` es un placeholder explicito
("TODO(item 10): replace this placeholder entirely...", `dashboard.tsx:6-9`)
que solo prueba que el guard protege la ruta. Este plan reemplaza ambos
archivos, no los crea desde cero. La Fase 3 convierte el `Stack` en `Tabs`
manteniendo exactamente la misma logica de guard (`status !== 'authed' ->
null`), solo cambiando el componente raiz que envuelve.

### 2. La capa de datos ya cubre la mayor parte del contrato -- faltan 3 mutaciones

`src/api/hooks/` ya tiene `useDashboard()` y `useNotifications()` (ambos ya
tipados contra `DashboardSummary`/`NotificationItem`, sin cambios de Fase 3 en
adelante) y `useFollowProject()`. Lo que falta y no existe en ningun lado:

- **Cancelar suscripcion**: `api.subscriptions.cancel()` existe en
  `packages/api-client/src/resources/subscriptions.ts:14`, pero ningun hook lo
  llama. Tampoco hay un hook para `GET /v1/subscriptions/me`
  (`api.subscriptions.me()`) pese a que `queryKeys.subscription.me()`
  (`keys.ts:30-32`) ya esta reservado para eso -- claramente anticipado por el
  item 07 y nunca usado.
- **Marcar notificacion leida**: `api.notifications.markRead(id)` existe
  (`packages/api-client/src/resources/notifications.ts:8-9`), sin hook.
- **Publicar avance (admin)**: `api.projects.publishUpdate(id, input)` existe
  (`packages/api-client/src/resources/projects.ts:44-48`), apunta al
  `AdminProjectsController` (`@Roles('ADMIN')`,
  `apps/api/src/modules/projects/controllers/admin-projects.controller.ts:34-36`),
  sin hook.

Los tres son mutaciones de una linea siguiendo el patron exacto de
`useFollowProject.ts`/`useCreateSubscription.ts`: `src/api/hooks/` no esta en
el write-scope literal del spec, pero sin estos tres hooks los criterios de
aceptacion "Cancelar suscripcion", "marca leida" y "ADMIN publica un avance"
son irrealizables. Se documenta como extension necesaria del write-scope
(Fase 2), mismo criterio que D1/D2.

### 3. `toProjectCardView` + `UpdateTimeline` ya resuelven "Tus proyectos" y "Ultimo avance"

`src/data/projects.ts:104-115` (`toProjectCardView(project, zone)`) ya mapea
`Project -> ProjectCardView` con imagen resuelta (`assetForKey`) y nombre de
zona. La Fase 3 reusa exactamente este mapper: cruza
`dashboard.data.followedProjectIds` contra `useProjects()` (todos los
proyectos publicos, ya cacheado si el usuario visito `/projects`) + `useZones()`
para el nombre de zona, igual que hace `app/(tabs)/projects.tsx:44-50`.

Para "Ultimo avance" no hace falta un componente nuevo: `dashboard.latestUpdate`
es un `ProjectUpdate` completo (`payment.ts`, via `projectUpdateSchema`), y
`UpdateTimeline` (`src/components/ui/UpdateTimeline.tsx`) ya sabe renderizar
uno solo (fecha, titulo, cuerpo, imagen opcional via `mediaKey` ->
`assetForKey`, igual patron que `ProjectUpdates.tsx` en el detalle de
proyecto). Se envuelve en una seccion de `src/features/dashboard/` que
resuelve el titulo del proyecto (buscando `latestUpdate.projectId` en la
misma lista de proyectos seguidos ya resuelta para el carrusel) y pasa
`items={[latestUpdate]}`.

### 4. `Screen` no soporta pull-to-refresh; no se toca

`src/components/layout/Screen.tsx` no tiene `refreshing`/`onRefresh`. Esta
fuera del write-scope y no hace falta tocarlo: `dashboard.tsx` usa
`Screen scroll={false}` (devuelve solo `View` + `StatusBar`,
`Screen.tsx:20-26`) y mete su propio `ScrollView` con `RefreshControl` adentro,
igual de simple, sin extender un componente compartido para un solo caso de
uso.

### 5. Sin dependencia de slider -- decision de diseno menor, no bloqueante

El spec pide un "slider de progreso" en el form de publicar avance
(Fase 5), pero `@react-native-community/slider` no esta instalado
(`apps/mobile/package.json` grep confirmado) y agregar una segunda
dependencia nativa nueva el mismo dia de entrega (ademas de
`react-native-qrcode-svg`, ya asumida por el spec) es riesgo evitable. Se
implementa un control de progreso propio (pasos de 10 en 10 con `Pressable`

- `ProgressBar` de preview, sin gestos de arrastre) reusando componentes ya
  en `ui/`. No requiere aprobacion: es un detalle de implementacion reversible,
  no un cambio de contrato ni de alcance.

### 6. Dependencia nueva declarada por el spec: `react-native-qrcode-svg`

`pantallas-nuevas.md:48` y el spec 10 (`10-mobile-dashboard-and-profile.md:31`)
la marcan explicitamente como "la instala el usuario" -- no es un paso del
implementer. `react-native-svg` (su peer) ya esta instalado
(`package.json:36`). La Fase 4 queda bloqueada hasta que exista ese
`pnpm --filter @oneimpact/mobile add react-native-qrcode-svg` en el arbol; se
anota como pre-requisito manual de esa fase, no se intenta instalar desde el
plan ni desde el implementer.

## Principios

Aditivo antes que destructivo; verde por fase; spec del vault manda en UI;
schemas una sola vez en shared; eventos, no imports cruzados; sin PAN en
servidor; sin supresiones nuevas; copy en espanol, codigo en ingles.

## Mapa de fases

| Fase | Nombre                                                                  | Area                       | Impacto                         | Shared | Prisma | Commit sugerido                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------------------- | ------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                                               | --                         | Ninguno                         | No     | No     | _(sin commit)_                                                                          |
| 1    | Contrato: dashboard summary correcto tras cancelar + followedProjectIds | api + shared + mobile(msw) | Aditivo + fix de logica         | Si     | No     | `feat(shared): fix dashboard summary after cancel and expose followed project ids`      |
| 2    | Hooks faltantes: cancelar, marcar leida, publicar avance                | mobile                     | Aditivo                         | No     | No     | `feat(mobile): add subscription cancel, notification read and publish-update mutations` |
| 3    | Tabs logueadas + Dashboard                                              | mobile                     | Aditivo (reemplaza placeholder) | No     | No     | `feat(mobile): authed tabs and dashboard`                                               |
| 4    | Perfil / iPass + gestion de suscripcion                                 | mobile                     | Aditivo                         | No     | No     | `feat(mobile): profile with ipass and subscription management`                          |
| 5    | Admin mobile: lista + publicar avance                                   | mobile                     | Aditivo                         | No     | No     | `feat(mobile): admin shortcut to publish updates`                                       |
| 6    | Cierre: bateria completa + AI log                                       | --                         | Ninguno                         | No     | No     | _(sin commit de codigo; commit de `docs/ai-workflow.md` via `/ai-log`)_                 |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar que `main` sigue en el estado asumido por este plan
antes de abrir el worktree.
**Area**: --
**Acciones**:

1. `git log --oneline -5` en `main`: confirmar que `d0fab7b` (item 06) y
   `5dcd596` (item 09) siguen en el historial.
2. `grep -rn "followedProjects" apps/api/src packages/shared/src apps/mobile/src`
   para reconfirmar que la lista de archivos de la Fase 1 no cambio desde este
   analisis.
3. `bash scripts/dev/quality-check.sh --scope shared,api,mobile --only typecheck`
   como linea de base (debe estar verde antes de tocar nada).

**Verificacion**: los tres pasos anteriores, sin cambios de codigo.
**Riesgos**: ninguno, es de solo lectura.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Contrato: dashboard summary correcto tras cancelar + followedProjectIds

**Objetivo**: que `GET /v1/dashboard/me` (real y MSW) exponga los ids de
proyectos seguidos y mantenga `status: CANCELED` + el plan visible despues de
un cancel, resolviendo D1 y D2.
**Area**: api + shared + mobile (solo `src/api/msw/`)
**Archivos**:

- `packages/shared/src/schemas/payment.ts:83-92` (`dashboardSummarySchema`):
  agregar `followedProjectIds: z.array(z.string())`.
- `packages/shared/src/schemas/payment.test.ts:23-79`: actualizar los tres
  `safeParse` existentes con `followedProjectIds`, agregar un caso que
  verifique que falta el campo => `success: false`.
- `apps/api/src/modules/impact/infrastructure/impact.repository.ts:54-62`:
  reemplazar `findActiveSubscription` por `findLatestSubscription(userId):
Promise<Subscription | null>` (`findFirst` sin filtro de `status`, `orderBy:
{ startedAt: 'desc' }`); reemplazar `countFollowedProjects` por
  `listFollowedProjectIds(userId): Promise<string[]>`
  (`projectFollow.findMany({ where: { userId }, select: { projectId: true } })`
  mapeado a `string[]`).
- `apps/api/src/modules/impact/application/dashboard.service.ts:45-114`:
  usar `listFollowedProjectIds` (deriva `followedProjects = ids.length` y
  `followedProjectIds = ids`); usar `findLatestSubscription`; cuando hay
  suscripcion, `status` viaja tal cual (`ACTIVE`/`CANCELED`) y `activeMonths`
  se calcula con `activeMonthsSince(subscription.startedAt, subscription.status
=== 'CANCELED' ? new Date(subscription.canceledAt!) : new Date())`.
- `apps/api/src/modules/impact/application/dashboard.service.spec.ts`: renombrar
  los mocks (`countFollowedProjects` -> `listFollowedProjectIds` devolviendo
  `string[]`; `findActiveSubscription` -> `findLatestSubscription`); agregar
  `followedProjectIds` a los `toEqual`/asserts existentes; **nuevo test**:
  suscripcion cancelada (`status: 'CANCELED'`, `canceledAt` fijo) => el summary
  trae `plan` resuelto, `status: 'CANCELED'`, `activeMonths` congelado en la
  fecha de cancelacion, no en "ahora".
- `apps/mobile/src/api/msw/admin-state.ts:56-82` (`getDashboardSummary`):
  cambiar la condicion `!subscription || subscription.status !== ACTIVE` a
  solo `!subscription`; cuando hay suscripcion (cualquier status), agregar
  `followedProjectIds` al objeto `shared` (ya se computa en la linea 58, solo
  falta incluirlo en el spread) y congelar `activeMonths` en `canceledAt`
  cuando el status sea `CANCELED`, mismo criterio que el API real.
  **Shared**: `dashboardSummarySchema` gana `followedProjectIds: string[]`
  (aditivo). Consumidores re-grepeados al cerrar la fase:
  `apps/api/**/dashboard*`, `apps/mobile/src/api/hooks/useDashboard.ts`,
  `apps/mobile/src/api/msw/**`.
  **Prisma**: No.
  **Eventos**: No.
  **Acciones**:

1. Editar `dashboardSummarySchema` + su test en `packages/shared`.
2. Editar `ImpactRepository` (dos metodos).
3. Editar `DashboardService.getSummary` para usar los metodos nuevos y la
   nueva regla de `status`/`activeMonths`.
4. Actualizar `dashboard.service.spec.ts` (mocks renombrados + test nuevo de
   cancelacion).
5. Espejar el mismo fix en `apps/mobile/src/api/msw/admin-state.ts`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,unit --filter dashboard`
- `bash scripts/dev/quality-check.sh --scope api --only e2e --filter subscriptions-flow`
  (necesita `pnpm db:up`) -- spot-check de que el flujo existente
  (`apps/api/test/subscriptions-flow.e2e-spec.ts:184-213`) sigue verde con el
  cambio de comportamiento en cancel.
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck` (MSW
  sigue tipando contra `DashboardSummary`).
- Caso negativo cubierto por el test nuevo: usuario con suscripcion cancelada
  ya no cae en la rama "nunca se suscribio".

**Riesgos**: cambiar `findActiveSubscription` a `findLatestSubscription`
podria, en teoria, exponer una suscripcion vieja si un usuario tuviera mas de
una fila `Subscription` histórica sin que la mas reciente sea la relevante --
no aplica hoy (`SubscriptionsService.create` rechaza una segunda suscripcion
mientras haya una `ACTIVE`, 409 `SUBSCRIPTION_EXISTS`), pero si el modelo de
negocio cambiara a permitir resuscribirse tras cancelar, este `orderBy` sigue
siendo la eleccion correcta (la mas reciente por `startedAt`).

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(shared): fix dashboard summary after cancel and expose followed project ids`

---

## Fase 2 -- Hooks faltantes: cancelar suscripcion, marcar notificacion leida, publicar avance

**Objetivo**: completar la capa de datos mobile con las tres mutaciones que
Dashboard/Perfil/Admin necesitan y que hoy no existen en `src/api/hooks/`.
**Area**: mobile (extiende write-scope, ver "Contexto", punto 2)
**Archivos**:

- `apps/mobile/src/api/hooks/useSubscription.ts` (nuevo): `useSubscription()`
  (`GET /v1/subscriptions/me` via `api.subscriptions.me()`, `queryKey:
queryKeys.subscription.me()`, `enabled` a cargo del caller -- 404 sin
  suscripcion no debe reintentar en loop) + `useCancelSubscription()`
  (mutation `api.subscriptions.cancel()`, invalida `dashboard.detail()` y
  `subscription.me()` al resolver, mismo patron que
  `useCreateSubscription.ts`).
- `apps/mobile/src/api/hooks/useMarkNotificationRead.ts` (nuevo): mutation
  `api.notifications.markRead(id)`, invalida `notifications.all()` y
  `dashboard.detail()` (el badge de `unreadNotifications` depende de ese
  conteo).
- `apps/mobile/src/api/hooks/usePublishUpdate.ts` (nuevo): mutation
  `api.projects.publishUpdate(id, input)`, invalida `projects.detail(id)`,
  `projects.list()` y `dashboard.detail()` (puede cambiar `latestUpdate`).
- `apps/mobile/src/api/hooks/index.ts` (editar): exportar los tres hooks
  nuevos.
  **Shared**: No (consume `CreateSubscriptionInput`... na, consume tipos ya
  existentes: `PublishUpdateInput`, sin cambios).
  **Prisma**: No.
  **Eventos**: No (los endpoints ya publican sus eventos del lado del
  servidor, items 06/07; estos hooks solo los invocan).
  **Acciones**:

1. Crear los tres archivos de hooks siguiendo el patron exacto de
   `useFollowProject.ts`/`useCreateSubscription.ts` (mutation + invalidate).
2. Exportarlos desde `src/api/hooks/index.ts`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck`
- Sin unit tests propios en esta fase (son wrappers finos de una linea sobre
  `api-client`, ya cubierto por `packages/api-client/src/index.test.ts` y por
  los tests de componente que los invocan en las Fases 3-5).

**Riesgos**: ninguno nuevo; mismo shape que hooks ya en produccion.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): add subscription cancel, notification read and publish-update mutations`

---

## Fase 3 -- Tabs logueadas + Dashboard

**Objetivo**: reemplazar el placeholder de `(app)` por la tab bar real
(Dashboard, Proyectos, Zonas, Perfil) y el Dashboard completo.
**Area**: mobile
**Spec**: `pantallas-nuevas.md:38-45` ("Dashboard"), `arquitectura-mobile.md:29-33`.
**Archivos**:

- `apps/mobile/app/(app)/_layout.tsx` (editar): mantener exactamente el mismo
  guard (`useRequireAuth(pathname)`, `status !== 'authed' -> null`), pero
  envolver en `Tabs` en vez de `Stack`, mismo patron visual que
  `(tabs)/_layout.tsx:20-83` (`tabBarActiveTintColor: colors.accent`,
  `tabBarStyle` forest). 4 tabs: `dashboard` (icono `LayoutDashboard` o
  similar), `projects` y `zones` con `listeners={{ tabPress: (e) => {
e.preventDefault(); router.push('/(tabs)/projects' | '/(tabs)/zones'); } }}`
  (reusan las pantallas publicas via navegacion, no vistas propias -- "reusa
  `/projects` via href" del spec), `profile` (pantalla propia, Fase 4).
- `apps/mobile/app/(app)/dashboard.tsx` (reemplazar el placeholder completo):
  compone las secciones de abajo; `Screen scroll={false}` + `ScrollView`
  propio con `RefreshControl` (`refreshing`/`onRefresh` atados a
  `dashboardQuery.isRefetching`/`.refetch`).
- `apps/mobile/src/components/ui/SubscriptionCard.tsx` (nuevo, en
  write-scope): props `{ plan: Plan | null; billing: Billing | null; status:
SubscriptionStatus | null; activeMonths: number; startedAt: string |
undefined; onManagePress: () => void }`. `rounded-3xl bg-forest`; sin plan
  -> copy "Aun no tienes un plan activo" + CTA; `status === 'CANCELED'` ->
  badge "Cancelada" visible junto al plan (no se oculta el plan); boton
  pildora blanca "Gestionar" -> `onManagePress` (navega a `/(app)/profile`).
- `apps/mobile/src/components/ui/JourneyLine.tsx` (nuevo, en write-scope):
  props `{ activeMonths: number; totalPoints: number; testID? }`. 12 puntos
  fijos, `min(activeMonths, 12)` en `bg-accent`, resto `bg-gray-300`; texto
  `"{activeMonths} meses · {totalPoints} puntos permanentes"`. **Test
  obligatorio** (criterio de aceptacion del spec): con `activeMonths=3`
  renderiza exactamente 3 puntos lima y 9 grises.
- `apps/mobile/src/components/ui/NotificationItem.tsx` (nuevo, en
  write-scope): props `{ notification: NotificationItem /* alias de import
para no chocar con el tipo DOM */; onPress?: () => void }`. Punto lima si
  `!readAt`; tap dispara `onPress`. **Test obligatorio**: tap en una
  notificacion sin leer llama a `onPress` una vez.
- `apps/mobile/src/features/dashboard/DashboardHeader.tsx` (nuevo): saludo
  "Hola, {user.name}" + inicial en circulo + campana con badge lima si
  `unreadNotifications > 0`.
- `apps/mobile/src/features/dashboard/FollowedProjects.tsx` (nuevo):
  carrusel `FlatList` horizontal (`w-[75vw]`, mismo patron que
  `AdvancesCarousel`/`ZonesCarousel`) de `ProjectCard` (reusa el componente ya
  existente) resueltas via `followedProjectIds` + `useProjects()` +
  `useZones()` + `toProjectCardView`; vacio -> tarjeta crema con CTA
  "Explorar proyectos" -> `/(tabs)/projects`.
- `apps/mobile/src/features/dashboard/LatestUpdateSection.tsx` (nuevo):
  `SectionHeader` + titulo del proyecto (resuelto en el mismo `Map` que arma
  `FollowedProjects`) + `UpdateTimeline items={[dashboard.latestUpdate]}`
  (reusa el componente existente, sin crear uno nuevo); si no hay
  `latestUpdate`, no renderiza la seccion.
- `apps/mobile/src/features/dashboard/NotificationsSection.tsx` (nuevo):
  lista `NotificationItem` sobre `useNotifications()`, cada tap llama
  `useMarkNotificationRead().mutate(id)` (Fase 2).
- `apps/mobile/src/features/dashboard/index.ts` (nuevo, barrel).
  **Shared**: No (consume lo que ya expone `dashboardSummarySchema` desde la
  Fase 1).
  **Prisma**: No.
  **Eventos**: No.
  **Acciones**:

1. Convertir `(app)/_layout.tsx` a `Tabs` sin romper el guard existente.
2. Crear `SubscriptionCard`, `JourneyLine` (+ test), `NotificationItem`
   (+ test) en `src/components/ui/` y exportarlos desde
   `src/components/ui/index.ts`.
3. Crear las 4 secciones de `src/features/dashboard/`.
4. Reescribir `app/(app)/dashboard.tsx` componiendolas, con pull-to-refresh
   sobre `useDashboard()`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter "dashboard|JourneyLine|NotificationItem"`
- `npx expo export --platform android --output-dir "$TMPDIR/oi"` (valida que
  Metro bundlea con las tabs nuevas).
- Pendiente manual: pull-to-refresh real en Expo Go; que el tab "Proyectos"/
  "Zonas" navegue correctamente sin duplicar la tab bar publica.

**Riesgos**: `listeners.tabPress` con `preventDefault` + `router.push` es el
punto mas fragil (expo-router puede versionar este API); si no funciona
limpio, la alternativa documentada es un quinto `Tabs.Screen` con `href`
apuntando a la ruta publica en vez del listener.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(mobile): authed tabs and dashboard`

---

## Fase 4 -- Perfil / iPass + gestion de suscripcion

**PRE-REQUISITO MANUAL (bloqueante, no lo hace el implementer)**: el usuario
corre `pnpm --filter @oneimpact/mobile add react-native-qrcode-svg` antes de
arrancar esta fase (`react-native-svg`, su peer, ya esta instalado). El spec
(`10-mobile-dashboard-and-profile.md:31`) marca esta dependencia como
responsabilidad del usuario, no del agente.

**Objetivo**: tarjeta iPass con QR decorativo, gestion de suscripcion
(cancelar con confirmacion) y cerrar sesion.
**Area**: mobile
**Spec**: `pantallas-nuevas.md:47-49` ("Perfil / iPass").
**Archivos**:

- `apps/mobile/app/(app)/profile.tsx` (nuevo).
- `apps/mobile/src/features/profile/IPassCard.tsx` (nuevo): `rounded-3xl
bg-forest`, logo blanco, `user.name`, id corto (`user.id.slice(0, 8)` o
  similar), `QRCode value={user.id}` de `react-native-qrcode-svg` -- decorativo,
  sin logica de escaneo real.
- `apps/mobile/src/features/profile/SubscriptionRow.tsx` (nuevo): "Mi
  suscripcion" -- muestra `plan`/`status` (via `useDashboard()`, ya trae
  `plan`/`billing`/`status` desde la Fase 1); boton "Cancelar" solo si
  `status === 'ACTIVE'`, con `Alert.alert` de confirmacion (mismo patron que
  el login-required de `app/projects/[id].tsx`) antes de llamar
  `useCancelSubscription().mutate()`.
- `apps/mobile/src/features/profile/ProfileMenu.tsx` (nuevo): filas
  "Notificaciones" (navega a Dashboard o abre la lista), "Cerrar sesion"
  (`useAuth().signOut()`), y "Panel admin" **solo si** `user.role === 'ADMIN'`
  -> `/(app)/admin`.
- `apps/mobile/src/features/profile/index.ts` (nuevo, barrel).
  **Shared**: No.
  **Prisma**: No.
  **Eventos**: No (cancelar ya dispara `subscription.canceled` del lado
  servidor, item 06).
  **Acciones**:

1. Verificar que `react-native-qrcode-svg` esta en `apps/mobile/package.json`
   (pre-requisito manual de arriba); si no esta, detenerse y pedirlo antes de
   escribir `IPassCard`.
2. Crear `IPassCard`, `SubscriptionRow`, `ProfileMenu` en
   `src/features/profile/`.
3. Componer `app/(app)/profile.tsx`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter profile`
- `npx expo export --platform android --output-dir "$TMPDIR/oi"` (confirma que
  el nuevo modulo nativo no rompe el bundle).
- Caso negativo: usuario sin suscripcion activa no ve boton "Cancelar";
  usuario con rol USER no ve fila "Panel admin" (se verifica con un test de
  `ProfileMenu` con ambos roles).
- Pendiente manual: QR real en dispositivo/Expo Go, confirmacion nativa del
  `Alert.alert` de cancelar.

**Riesgos**: si el pre-requisito manual no se cumplio, esta fase completa
queda bloqueada -- no hay fallback "sin QR" aceptable porque el spec lo pide
explicitamente como parte de la tarjeta iPass.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(mobile): profile with ipass and subscription management`

---

## Fase 5 -- Admin mobile: lista de proyectos + publicar avance

**Objetivo**: atajo de admin (`admin.tsx`) con lista de proyectos y form
corto para publicar un avance.
**Area**: mobile (extiende write-scope a `src/features/admin/**`, ausente en
la lista literal del spec pero necesaria: `app/(app)/admin.tsx` sola, sin
descomponer en features, superaria comodamente las ~300 lineas objetivo de
`10-monorepo-conventions.md` si incluye lista + form + slider custom).
**Spec**: `pantallas-nuevas.md:51-52` ("Admin (mobile, solo rol admin)").
**Archivos**:

- `apps/mobile/app/(app)/admin.tsx` (nuevo): `useRequireRole('ADMIN')` (ya
  hace el redirect a `/(tabs)` para un USER, sin logica nueva que probar).
- `apps/mobile/src/features/admin/AdminProjectsList.tsx` (nuevo): `useProjects()`
  sin filtro (todos los estados, a diferencia de la lista publica) + `ProgressBar`
  - boton "Publicar avance" por fila que abre `PublishUpdateForm` (modal o
    seccion inline, a criterio del implementer).
- `apps/mobile/src/features/admin/PublishUpdateForm.tsx` (nuevo):
  `react-hook-form` + `zodResolver(publishUpdateSchema)` (mismo patron que
  `RegisterForm.tsx`), campos titulo/texto (`Input`) + progreso (control
  propio de pasos de 10, ver "Contexto" punto 5, con `ProgressBar` de
  preview en vivo); submit llama `usePublishUpdate().mutate({ id, ...values
})` (Fase 2).
- `apps/mobile/src/features/admin/index.ts` (nuevo, barrel).
  **Shared**: No (consume `publishUpdateSchema`/`PublishUpdateInput` tal cual
  existen, `packages/shared/src/schemas/projects.ts:29-35`).
  **Prisma**: No.
  **Eventos**: No (publicar ya dispara `project.update_published`, item 06/08).
  **Acciones**:

1. Crear `app/(app)/admin.tsx` con el guard de rol.
2. Crear `AdminProjectsList` reusando `ProjectCard`/`ProgressBar`.
3. Crear `PublishUpdateForm` con el control de progreso custom + validacion
   `publishUpdateSchema`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter admin`
- Caso negativo: `403`/redirect ya cubierto por `useRequireRole` (reusado, sin
  test nuevo necesario mas alla de confirmar el redirect en un test de
  `admin.tsx` si el implementer lo considera de bajo costo).
- Pendiente manual: publicar un avance real en dispositivo y confirmar que
  `app/projects/[id].tsx` lo refleja (criterio de aceptacion explicito del
  spec).

**Riesgos**: ninguno nuevo; reusa guards y mutaciones ya probados en fases
anteriores.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `feat(mobile): admin shortcut to publish updates`

---

## Fase 6 -- Cierre

**Objetivo**: bateria completa + registro del uso de IA.
**Area**: --
**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all`.
2. `npx expo export --platform android --output-dir "$TMPDIR/oi"` una vez mas
   sobre el arbol completo.
3. Revisar contra el spec seccion por seccion (Dashboard, Perfil, Admin):
   orden de secciones, fondos, copy exacto, pesos 900/700 donde aplique
   (Dashboard/Perfil siguen el peso 700 de Zonas/Suscripcion, no el 900 de
   Home, salvo que el spec diga lo contrario -- confirmar contra
   `tipografia-y-estilo.md` si hay ambiguedad).
4. `/ai-log` con lo pedido/entregado/revisado/ajustado de esta sesion,
   incluyendo las dos decisiones D1/D2 y por que se resolvieron asi.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope all` en verde.
- Pendientes manuales explicitos en el resumen final: pull-to-refresh, QR
  decorativo, tab bar logueada, publicar avance end-to-end -- todos
  verificacion en Expo Go, no se dan por hechos.

**Riesgos**: ninguno nuevo.

**Commit sugerido**: _(el commit de `docs/ai-workflow.md` vía `/ai-log`)_
