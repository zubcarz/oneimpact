# Plan -- Admin: auth con cookie y gestion de proyectos (por fases, checkpoint por fase)

> **Fecha**: 2026-08-23
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/11-admin-auth-and-projects.md` (item 11, ola 3)
> **Base**: vault `01-Tecnologia-Arquitectura/admin-web.md`; reglas `.claude/rules/40-admin-conventions.md`, `60-design-system.md`, `50-testing-and-verification.md`; plan previo `.claude/plans/20260822-api-payments-subscriptions-events.plan.md` (decisiones D5a y D6, que condicionan la subida de imagenes)
> **Areas**: admin (+ `ci` en la fase 3, + `scripts/dev/quality-check.sh` en la fase 3)
> **Contrato shared tocado**: **No.** Se consumen `loginSchema`, `createProjectSchema`, `updateProjectSchema`, `publishUpdateSchema`, `uploadSignSchema`, `API_PATHS` y `ProjectStatus` sin modificarlos. Ver **D4** para la unica grieta detectada del contrato, que se resuelve **sin** tocar `packages/shared`.
> **Schema Prisma tocado**: **No.** Sin migracion, sin cambios de seed, sin cambios en MSW de mobile.
> **Eventos**: **No** emite ni escucha. El admin llama endpoints REST que ya publican `project.created` y `project.update_published` desde `ProjectsWritesService` (`apps/api/src/modules/projects/application/projects-writes.service.ts:63`, `:137`).
> **Zonas de riesgo**: **auth y roles** (cookie httpOnly, middleware de rol, casos negativos 401/403 obligatorios). Sin pago simulado. Sin config de Metro.
> **Fase del roadmap**: Fase 1 el minimo (fases 0-3: login + tabla + `login.spec` en CI); Fase 2 el resto (fases 4-6).
> **Como ejecutar**: `/run-plan-worktree admin-auth-and-projects` (rama `feat/admin-auth-and-projects`, como indica el spec). `/run-plan-guided` si se prefiere revisar fase por fase en el arbol principal.
> **Estado de arranque**: **listo**. Sin decisiones bloqueantes: las cinco estan
> resueltas abajo. Este item **no depende del 07** -- es la unica lane de las
> tres que nunca estuvo bloqueada por el, y su unica dependencia real (el item
> 06, que sirve los endpoints de escritura) esta en `main` desde `d0fab7b`.

## Objetivo

Dejar `apps/admin` usable de punta a punta contra la API local: login que deja
la sesion en una cookie httpOnly, middleware que exige rol `ADMIN`, tabla de
proyectos con progreso y filtros, alta/edicion de proyecto y publicacion de
avances con imagen, mas Playwright (`login.spec`, `projects.spec`) corriendo en
CI contra Postgres + API sembrada.

El corte minimo de la entrega del lunes (login + tabla + `login.spec` en CI)
queda cerrado al terminar la **fase 3**; de la fase 4 en adelante es valor
adicional que se puede dejar caer sin romper nada.

## Contexto y hallazgos del analisis

### La API ya tiene todo lo que el admin necesita

- `POST /v1/auth/login` es `@Public()` y devuelve `{ user, tokens }`
  (`apps/api/src/modules/auth/controllers/auth.controller.ts:44`). El access
  token dura 15 min y el refresh 30 d
  (`apps/api/src/modules/auth/application/tokens.service.ts:20-21`).
- `POST /v1/auth/logout` **no** es publico: exige access token en el header
  **y** `refreshToken` en el body (`auth.controller.ts:56-61`). El route handler
  de logout tiene que mandar las dos cosas.
- El claim de rol viaja dentro del access token como `role`
  (`tokens.service.ts:39-42`), asi que el middleware puede decidir sin llamar a
  la API.
- Escrituras de proyecto: `AdminProjectsController` tiene `@Roles('ADMIN')` a
  nivel de clase y ningun `@Public()`
  (`apps/api/src/modules/projects/controllers/admin-projects.controller.ts:34-35`):
  `POST /v1/projects`, `PATCH /v1/projects/:id`, `POST /v1/projects/:id/updates`.
  Sin token -> 401; con rol `USER` -> 403.
- Lecturas: `ProjectsController` es `@Public()` con filtros `zoneSlug`/`status`
  (`apps/api/src/modules/projects/controllers/projects.controller.ts:27-38`);
  `GET /v1/zones` tambien es publico.
- `POST /v1/uploads/sign` es `@Roles('ADMIN')`
  (`apps/api/src/modules/projects/controllers/uploads.controller.ts:25-26`).
- `packages/api-client` ya cubre el contrato completo
  (`packages/api-client/src/index.ts:22-35`): no hace falta escribir `fetch` a
  mano en el admin ni tocar el package.

### El admin de hoy es un placeholder

- `apps/admin/src/app/(auth)/login/page.tsx` es un form sin `onSubmit` ni
  validacion.
- `apps/admin/src/app/(dashboard)/layout.tsx:10-30` tiene un sidebar minimo pero
  ya correcto en tokens (`bg-forest`, pildoras).
- `apps/admin/src/app/(dashboard)/projects/page.tsx` dice "pendiente de
  implementar".
- **No existe** `src/middleware.ts`, **no existe** `src/app/api/`, y
  `src/components/ui`, `src/components/layout`, `src/features` y `src/lib` son
  solo `.gitkeep`.
- `apps/admin/src/app/globals.css:4-18` ya tiene los tokens del sistema en
  `@theme` (espejo de `packages/ui-tokens/src/index.ts`). No hay que
  reimportarlos.
- `apps/admin/e2e/login.spec.ts` es un smoke que pasa **sin** API levantada. Al
  volverlo login real, el scope `admin --only e2e` pasa a depender de Postgres +
  API.

### shadcn/ui no esta instalado

No existe `apps/admin/components.json` y no hay `class-variance-authority`,
`clsx`, `tailwind-merge` ni ningun paquete `@radix-ui` en las dependencias
(`apps/admin/package.json`). La regla `40-admin-conventions.md` pide "shadcn/ui
generados con el CLI"; el spec 11 pide "paleta del sistema (no shadcn por
defecto)". Los dos requisitos chocan en la practica: `shadcn init` escribe su
propia capa de variables de tema en `globals.css`, que convive mal con el bloque
`@theme` que ya tiene los tokens de One Impact. -> **Decision D3.**

### El admin no tiene testing de DOM

`apps/admin/vitest.config.ts` no configura `environment: 'jsdom'` y no hay
`@testing-library/react` en `devDependencies`. La regla 50 espera "Vitest + RTL"
para el admin. -> **Decision D5** (no bloqueante).

### La subida de imagen no cierra el circulo hoy

Tres hechos, verificados en codigo:

1. `StorageService` devuelve `simulated: true` y un `uploadUrl`
   **deliberadamente no resoluble** (`local-simulated://...`) cuando faltan
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET`
   (`apps/api/src/infra/storage/storage.service.ts:72-81`). En local y en CI
   faltan siempre: **la subida real nunca se ejecuta en esta entrega**.
2. `signedUploadSchema` devuelve `uploadUrl`, `key`, `expiresAt` y `simulated`
   (`packages/shared/src/schemas/payment.ts:115-120`). **No devuelve la URL
   publica** resultante. Ni siquiera en la rama real de Supabase el admin puede
   derivarla sin conocer `SUPABASE_URL` y el bucket por su cuenta.
3. `publishUpdateSchema.mediaUrl` es `z.url()` opcional
   (`packages/shared/src/schemas/projects.ts:33`) y la API lo guarda **verbatim**
   en `ProjectUpdate.mediaKey` (decision D5a,
   `projects-writes.service.ts:113-121`). Mandar un `key` pelado
   (`uploads/<uuid>-foto.jpg`) **no valida**: no es una URL.

-> **Decision D4.** Arreglar (2) de raiz seria agregar `publicUrl` a
`signedUploadSchema`, o sea tocar `packages/shared` + API + MSW, fuera del
write-scope del spec 11. Se resuelve dentro del admin y se anota como
seguimiento para el item 14.

### Next 16: lo que cambia respecto de lo que uno "recuerda"

`apps/admin/CLAUDE.md` trae el bloque `nextjs-agent-rules` que obliga a leer
`node_modules/next/dist/docs/` antes de escribir codigo. Puntos que el plan da
por ciertos y que la **fase 0 debe confirmar contra esos docs**:

- `cookies()` y `headers()` son asincronos (`await cookies()`).
- `params` y `searchParams` de page/layout/route son `Promise`.
- El middleware corre en Edge por defecto: **no** se puede usar `jsonwebtoken`;
  el payload del JWT se decodifica a mano con `atob` (solo para leer `role` y
  `exp`; la firma la verifica la API, no el admin).

### Verificaciones disponibles

`bash scripts/dev/quality-check.sh --list` ->
`scopes: mobile api admin shared all | steps: typecheck lint unit e2e bundle`.
Para `admin` los pasos son `typecheck`, `lint`, `unit` y `e2e` (Playwright,
`scripts/dev/quality-check.sh:71-76`). A diferencia del paso e2e de la API
(`scripts/dev/quality-check.sh:55-59`), el de admin **no** tiene guarda de
"Postgres apagado -> SKIP": en cuanto `login.spec` sea login real, un
`--scope all` sin API levantada se pone en rojo. Se corrige en la fase 3.

## Decisiones resueltas

### D1 -- Como llega el cliente a la API sin exponer el token

**RESUELTA: proxy minimo (la opcion por defecto del spec).** Dos clientes,
ambos sobre `packages/api-client`, cero cambios en el package:

- **Servidor** (`src/lib/api-server.ts`): `createApiClient({ baseUrl: API_URL,
getToken: async () => (await cookies()).get('oi_access')?.value ?? null })`.
  Lo usan los Server Components.
- **Navegador** (`src/lib/api-browser.ts`): `createApiClient({ baseUrl:
'/api/proxy' })`, **sin** `getToken`. Como `API_PATHS` ya empieza por `/v1`
  (`packages/shared/src/api-paths.ts:6`), la ruta final queda
  `/api/proxy/v1/projects`. El route handler `app/api/proxy/[...path]/route.ts`
  lee la cookie y reenvia con `Authorization: Bearer`.

Detalle que evita tocar `packages/api-client`: `createRequestFn` usa `fetch` sin
`credentials` (`packages/api-client/src/http.ts:23`), y el default de `fetch` es
`same-origin`, asi que la cookie **si** viaja al proxy. No hace falta
`credentials: 'include'` ni modificar el package compartido.

Alternativa descartada: pasar el access token desde un Server Component a un
Client Component como prop. Es mas simple, pero pone el token en el payload RSC
serializado, o sea en el HTML: rompe el invariante "token nunca en JS del
cliente".

### D2 -- Donde se refresca el access token (15 min)

**RESUELTA: en el route handler del proxy, una sola vez por request.** Ante
un 401 de la API, el proxy llama `POST /v1/auth/refresh` con `oi_refresh`,
guarda el par nuevo en cookies (un route handler **si** puede escribir cookies) y
reintenta una vez. Los Server Components **no** pueden escribir cookies: si su
lectura devuelve 401, hacen `redirect('/login')`.

El middleware, ademas, redirige a `/login` cuando `oi_access` falta o su `exp`
ya paso. **No** se implementa refresh dentro del middleware: agregaria una
llamada de red a cada navegacion y complica el Edge runtime sin beneficio real
para esta entrega.

Consecuencia aceptada y anotada: si el admin deja la pestana quieta mas de 15
minutos y su primera accion es una navegacion (no una query de cliente), ve el
login otra vez aunque el refresh siga vivo. Alternativa si molesta: mover el
refresh al middleware con `runtime: 'nodejs'`.

### D3 -- shadcn/ui via CLI, o primitivos propios con los tokens

- **(a) `npx shadcn@latest init` + `add button input label table select badge
textarea`.** Cumple la regla 40 al pie de la letra. Costos: agrega ~8
  dependencias, exige red durante la ejecucion del plan, reescribe
  `globals.css` metiendo su paleta `oklch` junto al bloque `@theme` actual, y
  despues hay que re-skinear cada componente igual (pildoras, forest, crema)
  para cumplir el invariante del spec. Riesgo extra: la compatibilidad del CLI
  con Tailwind 4 + Next 16 no esta verificada en esta maquina.
- **(b) Primitivos propios en `src/components/ui`,** escritos con los tokens que
  ya estan en `globals.css`. Cero dependencias nuevas, cero conflicto de paleta,
  y son componentes sin comportamiento de overlay (tabla, badge, input, select,
  textarea, barra de progreso, boton): no se pierde la accesibilidad de Radix
  porque en el alcance de este item no hay dialog ni popover.

**RESUELTA: (b), registrando la desviacion de la regla 40 en un ADR corto**
(`docs/adr/`) en la fase 1. Motivo: el invariante del spec ("paleta del sistema,
no shadcn por defecto") es la restriccion mas fuerte, y (a) termina en el mismo
lugar despues de mas trabajo y mas superficie de riesgo -- ademas de exigir red
durante la ejecucion y de reescribir `globals.css` metiendo una paleta `oklch`
junto al bloque `@theme` actual.

El ADR es obligatorio, no opcional: es lo que impide que esta desviacion se lea
mas adelante como un descuido. Si en algun momento se quiere (a), la fase 1 crece
con un paso de `init` + `add` y otro de re-skin, y hay que verificar que el
`@theme` de One Impact siga ganando.

### D4 -- Que se manda en `mediaUrl` al publicar un avance

**RESUELTA: tres caminos en un solo formulario, en este orden.**

1. El admin elige archivo -> `POST /v1/uploads/sign` (via proxy).
2. Si la respuesta trae `simulated: true` (**siempre en local y en CI**): no se
   hace ningun `PUT`, se **omite** `mediaUrl` del payload y el formulario
   muestra un aviso visible: "Almacenamiento simulado: el avance se publica sin
   imagen". No se inventa una URL para pasar el `z.url()`.
3. Si `simulated: false`: `PUT` directo a `uploadUrl` (nunca a traves del
   proxy) y se compone la URL publica como
   `${NEXT_PUBLIC_SUPABASE_PUBLIC_URL}/${key}`, con
   `NEXT_PUBLIC_SUPABASE_PUBLIC_URL` como variable nueva **del admin**
   (`.env.example`). Si la variable no esta, se degrada al caso 2.
4. Siempre disponible: campo opcional "URL de imagen" para pegar una URL a mano.
   Es lo que hace demostrable el flujo sin Supabase.

Seguimiento fuera de este plan (item 14): agregar `publicUrl` a
`signedUploadSchema` para que el cliente no tenga que reconstruirla.

### D5 -- Tests unitarios del admin sin RTL

**RESUELTA: en este plan, tests unitarios solo de logica pura** (decode del
JWT, construccion de query params de filtros, conversion `datetime-local` <->
ISO, helper de subida con `fetch` mockeado). No se agregan `jsdom` ni
`@testing-library/react`: los formularios quedan cubiertos por Playwright, que
es cobertura mas fiel para este item. Montar RTL se difiere al item 13, que trae
tablas y graficos con mas logica de presentacion.

## Principios

- Aditivo antes que destructivo: las paginas placeholder de `zones`, `users`,
  `subscriptions` y `dashboard` **se dejan como estan** (son del item 13).
- Verde por fase, con el gate acotado a lo que la fase declara.
- El spec del vault manda en UI: paleta, pildoras, forest en el sidebar, crema
  de fondo. Ningun hex suelto en un componente; todo por token de `globals.css`.
- Los schemas viven una sola vez, en `packages/shared`; el admin los importa, no
  los redefine.
- El token nunca toca `localStorage` ni el JS del cliente.
- Sin supresiones nuevas (`eslint-disable`, `@ts-ignore`), sin tests debilitados.
- Copy visible en espanol; codigo, rutas e identificadores en ingles.

## Mapa de fases

| Fase | Nombre                                       | Area         | Impacto                                                            | Shared | Prisma | Commit sugerido                                                                                      |
| ---- | -------------------------------------------- | ------------ | ------------------------------------------------------------------ | ------ | ------ | ---------------------------------------------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                    | --           | Ninguno                                                            | No     | No     | _(sin commit)_                                                                                       |
| 1    | Auth con cookie httpOnly y middleware de rol | admin        | Aditivo (reescribe `login/page.tsx`)                               | No     | No     | `feat(admin): cookie auth and role middleware`                                                       |
| 2    | Shell del panel y tabla de proyectos         | admin        | Aditivo (reescribe `(dashboard)/layout.tsx` y `projects/page.tsx`) | No     | No     | `feat(admin): admin shell and projects table`                                                        |
| 3    | Playwright con login real y job de CI        | admin + ci   | Aditivo (reescribe `e2e/login.spec.ts`)                            | No     | No     | `ci: add admin playwright job`                                                                       |
| 4    | Formularios de alta y edicion de proyecto    | admin        | Aditivo                                                            | No     | No     | `feat(admin): projects table and forms`                                                              |
| 5    | Avances con progreso e imagen                | admin        | Aditivo                                                            | No     | No     | `feat(admin): publish project updates with image upload`                                             |
| 6    | e2e del flujo completo y cierre              | admin + docs | Aditivo                                                            | No     | No     | `test(admin): cover create project and publish update` + `docs: log admin auth and projects session` |

**Corte minimo de la entrega del lunes: al terminar la fase 3.**

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar los supuestos de Next 16 y del entorno antes de escribir
una linea, y cerrar D1-D5.
**Area**: --
**Archivos**: ninguno (solo lectura y comandos).
**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Leer las guias de `apps/admin/node_modules/next/dist/docs/` que cubren route
   handlers, middleware y APIs asincronas (`cookies`, `params`, `searchParams`).
   Anotar cualquier diferencia con lo asumido en "Contexto"; si el doc
   contradice al plan, **gana el doc** y se anota la discrepancia.
2. Levantar el entorno: `pnpm db:up`, `pnpm --filter @oneimpact/api db:setup`,
   `pnpm dev:api`.
3. Verificar el contrato a mano y pegar las salidas en el resumen de la fase:
   - `curl -s localhost:5000/v1/zones` -> 5 zonas.
   - login de `admin@oneimpact.org / Admin123!` -> `user.role: "ADMIN"` + tokens.
   - login de `ana@oneimpact.org / User123!` -> `user.role: "USER"`.
   - `GET /v1/projects` -> 5 proyectos del seed.
   - `POST /v1/projects` **sin** token -> 401; con el token de `ana` -> 403.
   - `POST /v1/uploads/sign` con token de admin -> confirmar `simulated: true`.
4. Comprobar el comportamiento real de `z.url()` de zod 4 sobre
   `local-simulated://uploads/x.jpg` y sobre `uploads/x.jpg`, con un script de
   tres lineas en el scratchpad. Es lo que decide si el caso 2 de **D4** puede
   mandar algo o tiene que omitir el campo. **Hoy el plan asume que hay que
   omitirlo**; si el chequeo dice otra cosa, se ajusta la fase 5.
5. Baseline verde:
   `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`.
6. **D3 ya esta resuelta** (primitivos propios + ADR): la fase 1 arranca sin
   esperar nada. Lo unico que se comprueba aca es que `src/components/ui/` sigue
   vacio salvo su `.gitkeep`, o sea que nadie metio shadcn por otro lado.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- Salidas de los `curl` del punto 3 pegadas en el resumen, no resumidas de
  memoria.

**Riesgos**:

- Si `pnpm dev:api` choca de puerto, `docs/local-run-status.md` (seccion 2)
  explica el sintoma (IPv4/IPv6 partido) y la salida (`PORT=5010`).

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Auth con cookie httpOnly y middleware de rol

**Objetivo**: que iniciar sesion como admin deje una cookie httpOnly y de acceso
al panel; que un `USER` vea un 403 con la identidad visual del producto; que sin
cookie todo redirija a `/login`.

**Area**: admin
**Spec**: `admin-web.md`, seccion "Rutas" (`(auth)/login`, `middleware.ts`) +
spec 11, seccion "Auth".
**Shared**: No -- se importan `loginSchema` y `API_PATHS` tal cual.
**Prisma**: No
**Eventos**: No

**Archivos** (nuevos salvo donde se indica):

- `apps/admin/src/lib/env.ts` -- lee `API_URL` (servidor) con fallback a
  `NEXT_PUBLIC_API_URL` y a `http://localhost:5000`.
- `apps/admin/src/lib/session.ts` -- nombres y opciones de cookie (`oi_access`,
  `oi_refresh`), `decodeJwtPayload()` sin dependencias (`atob` + base64url),
  `readSession()`.
- `apps/admin/src/lib/session.test.ts` -- unit.
- `apps/admin/src/lib/api-server.ts` -- `getServerApi()` (D1).
- `apps/admin/src/lib/api-browser.ts` -- `browserApi` contra `/api/proxy` (D1).
- `apps/admin/src/app/api/auth/login/route.ts`
- `apps/admin/src/app/api/auth/logout/route.ts`
- `apps/admin/src/app/api/proxy/[...path]/route.ts`
- `apps/admin/src/middleware.ts`
- `apps/admin/src/app/403/page.tsx`
- `apps/admin/src/components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`,
  `FieldError.tsx`
- `apps/admin/src/features/auth/LoginForm.tsx` (`'use client'`)
- `apps/admin/src/app/(auth)/login/page.tsx` -- **se reescribe** (hoy es un form
  muerto)
- `apps/admin/.env.example` -- agregar `API_URL`
- `docs/adr/` -- ADR corto si se confirma D3(b)

**Acciones** (una por invocacion del `implementer`):

1. `src/lib/env.ts` + `src/lib/session.ts`: constantes de cookie
   (`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` solo en
   produccion; `oi_access` 15 min, `oi_refresh` 30 d, espejando
   `tokens.service.ts:20-21`) y `decodeJwtPayload`, que devuelve
   `{ sub, email, role, exp } | null` y **nunca lanza** ante un token basura.
   Con su test unitario: token valido, token con payload no-JSON, token de una
   sola parte, token expirado.
2. `src/lib/api-server.ts` y `src/lib/api-browser.ts` segun **D1**. Documentar en
   comentario por que el cliente de navegador no lleva `getToken` y por que el
   default `same-origin` de `fetch` alcanza (referencia
   `packages/api-client/src/http.ts:23`).
3. `app/api/auth/login/route.ts`: valida el body con `loginSchema`, llama
   `POST /v1/auth/login` y, ante exito, escribe las dos cookies y responde
   `{ role }`. **Escribe la cookie aunque el rol sea `USER`**: quien decide el
   403 es el middleware, no este handler. Esa es la unica forma de que
   `login.spec` pueda afirmar la pagina 403 en la fase 3. Ante 401 de la API,
   responde 401 con un mensaje en espanol y **sin** filtrar el cuerpo de la API.
4. `app/api/auth/logout/route.ts`: lee ambas cookies, llama
   `POST /v1/auth/logout` con el access token en el header y el refresh en el
   body (`auth.controller.ts:56-61`), y **borra las cookies pase lo que pase**
   con la llamada a la API.
5. `app/api/proxy/[...path]/route.ts`: handlers `GET`, `POST`, `PATCH`,
   `DELETE`. Reconstruye la ruta desde `params.path` (que es `Promise`),
   conserva el query string, inyecta `Authorization` desde `oi_access` y aplica
   el refresh-and-retry de **D2**. Sin cookie -> 401 sin llamar a la API. Nunca
   reenvia la cookie a la API ni devuelve el token en el cuerpo.
6. `src/middleware.ts` + `matcher`: protege todo menos `/login`, `/api/auth/*`,
   `/403`, `/_next/*` y estaticos. Sin `oi_access` valido ->
   `redirect('/login')`; `role !== 'ADMIN'` -> `rewrite('/403')` (mantiene la URL
   y evita el bucle con `/login`). Sin dependencias de JWT: usa
   `decodeJwtPayload`. Comentario explicito de que **la firma no se verifica
   aca** -- la verifica la API con `JwtAuthGuard`; el middleware es solo UX.
7. `app/403/page.tsx`: pagina con tokens del sistema (crema de fondo, titulo
   `font-bold`, boton pildora "Cerrar sesion" que pega a `/api/auth/logout`).
   Copy en espanol.
8. Primitivos `Button` / `Input` / `Label` / `FieldError` segun **D3** y la regla
   60: boton pildora (`rounded-full`), variantes `dark` y `accent`, texto
   `font-bold text-sm`, area tactil comoda; inputs `rounded-2xl` sobre crema.
9. `LoginForm` (`'use client'`) con `react-hook-form` +
   `zodResolver(loginSchema)`, POST a `/api/auth/login`, error inline en espanol
   y `router.replace('/projects')` al entrar. `login/page.tsx` queda como Server
   Component fino que lo compone.
10. `.env.example`: agregar `API_URL=http://localhost:5000` con un comentario de
    que `NEXT_PUBLIC_API_URL` sigue existiendo solo para el `PUT` directo a
    storage. Recordar en el resumen que el `.env` local hay que actualizarlo a
    mano (esta gitignorado).
11. Si D3 = (b): ADR corto en `docs/adr/` -- "primitivos propios en vez de
    shadcn/ui en apps/admin", con el motivo y la nota de que se revisa en el
    item 13.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- **Casos negativos, obligatorios y manuales con la API arriba**:
  - `GET http://localhost:5001/projects` sin cookie -> 302 a `/login`.
  - Login con `ana@oneimpact.org` -> pagina 403 (no el dashboard, no un crash).
  - Login con `admin@oneimpact.org` -> `/projects`.
  - Credenciales malas -> error inline en espanol, sin cookie escrita.
  - Cookie `oi_access` manipulada a mano ("abc") -> 302 a `/login`.
  - `curl -i localhost:5001/api/proxy/v1/projects` sin cookie -> 401.
- **Pendiente manual (navegador)**: en DevTools, `document.cookie` **no** debe
  mostrar `oi_access` (httpOnly), `localStorage` debe estar vacio, y ningun
  payload RSC del HTML debe contener el JWT (`Ctrl+U` y buscar "eyJ").

**Riesgos**:

- El middleware en Edge no tolera dependencias de Node: si algo obliga a
  `runtime: 'nodejs'`, anotarlo y confirmarlo contra los docs de Next 16.
- `sameSite: 'lax'` mas navegacion desde Playwright: si el `storageState` de la
  fase 3 no arrastra la cookie, el primer sospechoso es este.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(admin): cookie auth and role middleware`

---

## Fase 2 -- Shell del panel y tabla de proyectos

**Objetivo**: sidebar/topbar/pageheader del sistema de diseno y la tabla de
proyectos con filtros por zona y estado, badge de estado, barra de progreso y
estados de carga, vacio y error.

**Area**: admin
**Spec**: `admin-web.md`, "Rutas" -> `(dashboard)/projects/` y "Progreso de
proyectos"; spec 11, secciones "Layout" y "Proyectos"; regla 60 (forest en el
sidebar, crema de fondo, pildoras, `rounded-2xl`/`3xl`).
**Shared**: No -- se consumen `Project`, `Zone`, `ProjectStatus` y
`ProjectsListParams` de `@oneimpact/api-client`.
**Prisma**: No
**Eventos**: No

**Archivos**:

- `apps/admin/src/components/layout/Sidebar.tsx`, `Topbar.tsx`, `PageHeader.tsx`
- `apps/admin/src/components/ui/Table.tsx`, `Badge.tsx`, `ProgressBar.tsx`,
  `Select.tsx`, `EmptyState.tsx`
- `apps/admin/src/features/projects/ProjectsTable.tsx`
- `apps/admin/src/features/projects/ProjectsFilters.tsx` (`'use client'`)
- `apps/admin/src/features/projects/filters.ts` + `filters.test.ts` (unit)
- `apps/admin/src/features/projects/status.ts` (etiqueta y color por
  `ProjectStatus`, sin hex suelto)
- `apps/admin/src/app/(dashboard)/layout.tsx` -- **se reescribe** (hoy `:10-30`)
- `apps/admin/src/app/(dashboard)/projects/page.tsx` -- **se reescribe**
- `apps/admin/src/app/(dashboard)/projects/loading.tsx`, `error.tsx`

**Acciones**:

1. `filters.ts`: parseo y serializacion de `?zoneSlug=&status=` a
   `ProjectsListParams`, descartando valores que no esten en `ProjectStatus` o
   que no cumplan el formato de slug (`zoneSlugSchema`,
   `packages/shared/src/schemas/catalog.ts:5-7`). Test unitario puro: vacio,
   valido, `status` invalido, slug invalido, ida y vuelta.
2. Primitivos `Table`, `Badge`, `ProgressBar`, `Select`, `EmptyState` con los
   tokens de `globals.css`. `ProgressBar` expone el valor como texto accesible
   (`aria-valuenow` y label "40 %") -- Playwright lo va a afirmar en la fase 6.
3. `Sidebar` (forest, logo `public/logo_blanco.svg`, nav en pildoras con el item
   activo en `bg-accent text-gray-900`), `Topbar` (nombre y email del admin +
   boton "Cerrar sesion" que pega a `/api/auth/logout`) y `PageHeader` (titulo,
   descripcion y slot de acciones).
4. `(dashboard)/layout.tsx`: Server Component que lee la sesion con
   `readSession()` y pasa nombre/email al `Topbar`. Mantiene los cinco links del
   nav actual: `zones`, `users` y `subscriptions` siguen siendo placeholders del
   item 13 y **no se tocan**.
5. `projects/page.tsx`: Server Component. `searchParams` es `Promise` ->
   `await`. Pide en paralelo `zones.list()` y `projects.list(params)` con
   `getServerApi()`. Ante `ApiError` 401 -> `redirect('/login')`.
6. `ProjectsTable`: columnas titulo, zona (nombre resuelto contra la lista de
   zonas), estado (badge), progreso (`ProgressBar`), fecha objetivo y acciones
   (Editar / Avances) como links a rutas que llegan en las fases 4 y 5.
   **Ojo con la columna "ultimo avance" que pide el spec**: `GET /v1/projects`
   devuelve `Project` **sin** `updates`
   (`packages/shared/src/schemas/catalog.ts:26-40`), asi que esa columna no se
   puede llenar con el endpoint actual. Se muestra `targetDate` en su lugar y el
   detalle de avances vive en la fase 5. **Si el implementer cree que hace falta
   el ultimo avance en la tabla, se reporta -- no se agrega un endpoint ni se
   hacen N peticiones al detalle.**
7. `ProjectsFilters` (`'use client'`): dos `Select` que empujan a
   `router.replace` con los query params. Sin estado propio duplicado: la URL es
   la fuente de verdad.
8. `loading.tsx` con skeleton y `error.tsx` con reintento, ambos en espanol.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit --filter src/features/projects`
- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint`
- **Pendiente manual (navegador, API arriba)**: `/projects` lista los 5
  proyectos del seed; el filtro por zona `amazonia` deja 1; el filtro por estado
  devuelve el subconjunto correcto; con la API apagada se ve `error.tsx` y no una
  pantalla en blanco; ningun hex suelto en el diff
  (`grep -rn "#[0-9a-fA-F]\{3,6\}" apps/admin/src` solo debe pegar en
  `globals.css`).

**Riesgos**:

- `GET /v1/projects` no trae el nombre de la zona, solo `zoneId`
  (`catalog.ts:22`). El cruce se hace en la pagina con la lista de zonas; si
  falta una zona, se muestra el `zoneId` en vez de romper.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(admin): admin shell and projects table`

---

## Fase 3 -- Playwright con login real y job de CI

**Objetivo**: cerrar el minimo de la entrega. `login.spec` deja de ser un smoke y
prueba el flujo real contra la API sembrada, con `storageState` reutilizable, y
CI corre el job.

**Area**: admin + ci
**Spec**: spec 11, seccion "Playwright"; `admin-web.md`, seccion "Playwright
(e2e)"; regla 40 ("selectores por rol/label, no por clases CSS").
**Shared**: No
**Prisma**: No -- se usa el seed existente (`apps/api/prisma/seed.ts`), sin
modificarlo.
**Eventos**: No

**Archivos**:

- `apps/admin/e2e/global-setup.ts`
- `apps/admin/e2e/login.spec.ts` -- **se reescribe**
- `apps/admin/playwright.config.ts` -- se modifica
- `apps/admin/.gitignore` -- agregar `e2e/.auth/` y verificar que
  `playwright-report/` y `test-results/` ya esten ignorados (hoy hay archivos de
  ambos en el arbol: comprobar con `git check-ignore -v`)
- `.github/workflows/ci.yml` -- job `admin-e2e`
- `scripts/dev/quality-check.sh:71-76` -- guarda de "API/Postgres apagados ->
  SKIP" para el paso e2e de admin

**Acciones**:

1. `global-setup.ts`: hace login por UI con `admin@oneimpact.org / Admin123!` y
   guarda `e2e/.auth/admin.json`. Credenciales por variable de entorno con
   default al seed; **no son secretos** (son de desarrollo y ya estan publicadas
   en `docs/local-development.md`), pero igual se leen de env para no fijarlas.
2. `playwright.config.ts`: `globalSetup`, dos proyectos chromium -- uno
   autenticado (`storageState`) y otro anonimo para los casos negativos -- y
   `webServer` tambien en CI (o arranque desde el job; elegir uno y dejarlo
   documentado en el propio config, que hoy lo desactiva con
   `process.env.CI ? undefined : ...`, `playwright.config.ts:14-16`).
3. `login.spec.ts` reescrito, con selectores por rol/label:
   - admin -> aterriza en `/projects` y la tabla muestra los 5 proyectos del
     seed.
   - `ana@oneimpact.org / User123!` -> pagina 403 (texto visible), **no** el
     dashboard.
   - sin sesion, ir directo a `/projects` -> termina en `/login`.
   - credenciales invalidas -> mensaje de error visible, sigue en `/login`.
4. `ci.yml`: job `admin-e2e` con el service `postgres:16-alpine` (mismo bloque
   que `api-e2e`, `.github/workflows/ci.yml:24-31`) y los pasos:
   `pnpm install --frozen-lockfile` -> `prisma migrate deploy` ->
   `prisma db seed` -> `pnpm --filter @oneimpact/api build` y `start:prod` en
   segundo plano -> esperar `/health` con reintentos ->
   `pnpm --filter @oneimpact/admin build` y `start` en segundo plano ->
   `npx playwright install --with-deps chromium` ->
   `pnpm --filter @oneimpact/admin test:e2e`.
   Variables: `API_URL`, `NEXT_PUBLIC_API_URL`, `PLAYWRIGHT_BASE_URL`,
   `DATABASE_URL`, `DIRECT_URL`, y `CORS_ORIGINS` (el default de
   `apps/api/src/infra/config/env.ts:12` ya incluye `http://localhost:5001`:
   confirmarlo antes de agregarlo).
5. `quality-check.sh`: envolver el paso e2e de admin en la misma guarda que usa
   la API (`scripts/dev/quality-check.sh:55-59`), de modo que `--scope all` sin
   Docker/API haga `[SKIP]` en vez de `[FAIL]`. **Es un cambio fuera del
   write-scope literal del spec 11 (que nombra solo `apps/admin` y `ci.yml`); se
   hace a proposito, porque sin el, el gate de cierre de la fase 6 queda
   irrealizable en local.** Anotarlo en el resumen de la fase.

**Verificacion** (acotada a la fase):

- Con Postgres + API + admin arriba: `pnpm --filter @oneimpact/admin test:e2e`
  -> los 4 tests verdes.
- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope all --only typecheck,lint,unit`
  (nada de las otras apps se rompio).
- **Casos negativos**: los tres del punto 3 (403 de `ana`, redirect sin sesion,
  credenciales invalidas) son parte del spec, no extras.
- **Pendiente manual**: el job de CI **no se puede validar de verdad hasta que
  haya un push**. Se anota como `SIN CONFIRMAR` hasta ver el run en verde en
  GitHub; no se declara "CI verde" antes de eso.

**Riesgos**:

- Tiempos de arranque en CI: si la API tarda mas que la espera, el job falla de
  forma intermitente. Esperar por `/health` con reintentos, nunca un `sleep`.
- `retries: 1` en CI ya esta configurado (`playwright.config.ts:6`); no subirlo
  para tapar intermitencias.

CHECKPOINT -- Detente aca. **Aca termina el minimo de Fase 1 del roadmap.**
No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `ci: add admin playwright job`

---

## Fase 4 -- Formularios de alta y edicion de proyecto

**Objetivo**: crear y editar un proyecto desde el panel, con validacion del
schema compartido y select de zona alimentado por la API.

**Area**: admin
**Spec**: spec 11, seccion "Proyectos" (`projects/new`, `projects/[id]`);
`admin-web.md`, "Rutas".
**Shared**: No -- `createProjectSchema` y `updateProjectSchema`
(`packages/shared/src/schemas/projects.ts:6-38`) se usan tal cual con
`zodResolver`.
**Prisma**: No
**Eventos**: no los emite el admin; `POST /v1/projects` publica `project.created`
del lado de la API (`projects-writes.service.ts:58-63`).

**Archivos**:

- `apps/admin/src/lib/query-provider.tsx` (`'use client'`) + montaje en
  `(dashboard)/layout.tsx`
- `apps/admin/src/lib/query-keys.ts`
- `apps/admin/src/features/zones/hooks.ts` (`useZones`)
- `apps/admin/src/features/projects/hooks.ts` (`useCreateProject`,
  `useUpdateProject`)
- `apps/admin/src/features/projects/ProjectForm.tsx` (`'use client'`)
- `apps/admin/src/features/projects/form-utils.ts` + `form-utils.test.ts` (unit)
- `apps/admin/src/components/ui/Textarea.tsx`
- `apps/admin/src/app/(dashboard)/projects/new/page.tsx`
- `apps/admin/src/app/(dashboard)/projects/[id]/page.tsx`

**Acciones**:

1. `query-provider.tsx` + `query-keys.ts`, con la misma forma jerarquica que
   mobile (`apps/mobile/src/api/hooks/keys.ts`) para que las invalidaciones por
   prefijo funcionen igual. Mutaciones con `retry: false`, como en
   `apps/mobile/src/api/queryClient.ts:41-47`.
2. `form-utils.ts`: conversion `datetime-local` -> ISO 8601 con `Z` y vuelta.
   **Es necesario**: `createProjectSchema.targetDate` es `z.iso.datetime()`
   (`projects.ts:22`) y un `<input type="datetime-local">` produce
   `2026-12-31T00:00`, que **no** valida. Test unitario de ida y vuelta, valor
   vacio y valor invalido.
3. `ProjectForm`: `react-hook-form` + `zodResolver`, modos `create` y `edit`.
   Campos: titulo, resumen, descripcion, zona (`Select` desde `useZones`),
   estado, progreso (0-100), fecha objetivo, lat, lng. Los errores en espanol
   salen directamente de los mensajes del schema compartido. Aviso visible junto
   al campo progreso: **publicar un avance sobrescribe este valor**
   (`projects-writes.service.ts:125-130`), para que el admin no crea que su
   edicion manual gana.
4. `projects/new/page.tsx`: Server Component fino que compone el form en modo
   create; al exito invalida la lista y navega a `/projects`.
5. `projects/[id]/page.tsx`: `params` es `Promise` -> `await`. Carga el proyecto
   con `getServerApi().projects.get(id)` y lo pasa como `defaultValues`. El
   `PATCH` manda solo los campos tocados (`updateProjectSchema` es `.partial()`).
   Link visible a "Avances" (ruta de la fase 5).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit --filter src/features`
- **Casos negativos** (manuales, API arriba): titulo de 2 caracteres -> error
  inline y **no** se llama a la API; `zoneSlug` inexistente -> la API responde
  404 `ZONE_NOT_FOUND` (`projects-writes.service.ts:36-38`) y el form lo muestra
  sin romperse; sesion caducada a mitad del formulario -> el proxy refresca (D2)
  y el guardado sale bien; si el refresh tambien murio -> se ve el login, no un
  error opaco.
- **Pendiente manual (navegador)**: crear un proyecto y verlo aparecer en la
  tabla; editarlo y ver el cambio; revisar que el select de zona muestre las 5
  zonas por nombre.

**Riesgos**:

- `updateProjectSchema` acepta `zoneSlug`: reenviar el slug actual sin querer no
  rompe nada, pero conviene mandar solo campos modificados para que el `PATCH`
  sea legible en el log.
- El slug del proyecto lo deriva la API del titulo
  (`projects-writes.service.ts:152-172`); el admin **no** lo edita ni lo muestra
  como editable.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(admin): projects table and forms`

---

## Fase 5 -- Avances con progreso e imagen

**Objetivo**: listar los avances de un proyecto y publicar uno nuevo con titulo,
texto, progreso e (idealmente) imagen, respetando **D4**.

**Area**: admin
**Spec**: spec 11, seccion "Proyectos" -> `projects/[id]/updates`;
`admin-web.md`, secciones "Subida de imagenes" y "Progreso de proyectos".
**Shared**: No -- `publishUpdateSchema` y `uploadSignSchema` se usan tal cual.
**Prisma**: No
**Eventos**: los publica la API (`project.update_published`,
`projects-writes.service.ts:132-137`) y el listener de `impact` reacciona. El
admin no participa.

**Archivos**:

- `apps/admin/src/app/(dashboard)/projects/[id]/updates/page.tsx`
- `apps/admin/src/features/projects/UpdatesList.tsx`
- `apps/admin/src/features/projects/PublishUpdateForm.tsx` (`'use client'`)
- `apps/admin/src/features/projects/upload.ts` + `upload.test.ts` (unit, `fetch`
  mockeado)
- `apps/admin/src/features/projects/hooks.ts` -- agregar `usePublishUpdate`
- `apps/admin/src/components/ui/Slider.tsx`
- `apps/admin/.env.example` -- agregar `NEXT_PUBLIC_SUPABASE_PUBLIC_URL`
  (opcional, con comentario de que sin ella la subida queda simulada)

**Acciones**:

1. `upload.ts`: implementa **D4** completo. Firma
   `signAndUpload(file): Promise<{ mediaUrl?: string; simulated: boolean }>`.
   Llama `/v1/uploads/sign` con el cliente de navegador (proxy); si
   `simulated === true` o falta `NEXT_PUBLIC_SUPABASE_PUBLIC_URL`, devuelve
   `{ simulated: true }` **sin** `mediaUrl` y sin hacer ningun `PUT`. Si no,
   `PUT` **directo** a `uploadUrl` (nunca por el proxy: el admin no proxea
   bytes) y compone `${NEXT_PUBLIC_SUPABASE_PUBLIC_URL}/${key}`. Test unitario
   con `fetch` mockeado para ambas ramas y para el `PUT` fallido.
2. `PublishUpdateForm`: RHF + `zodResolver(publishUpdateSchema)`. Titulo, texto,
   `Slider` de progreso 0-100 con el valor visible, input de archivo y campo
   opcional "URL de imagen" para pegar una URL a mano. Si la subida vuelve
   `simulated`, banner visible en espanol: "Almacenamiento simulado: el avance se
   publica sin imagen" -- y **`mediaUrl` se omite del payload**, no se inventa un
   valor para pasar el `z.url()`.
3. `usePublishUpdate`: al exito invalida la lista de proyectos y el detalle, de
   modo que la barra de progreso de la tabla refleje el avance recien publicado.
4. `updates/page.tsx`: Server Component; `getServerApi().projects.get(id)`
   devuelve `ProjectWithUpdates` (`catalog.ts:52-55`) con `updates` ya ordenados
   por la API. `UpdatesList` los muestra con fecha, progreso e imagen si
   `mediaKey` es una URL absoluta (si es una clave relativa, se muestra la clave,
   no una imagen rota -- consecuencia directa de D5a,
   `projects-writes.service.ts:113-121`).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit --filter src/features/projects`
- **Casos negativos** (manuales, API arriba): progreso 101 -> error inline sin
  llamar a la API; cuerpo de 5 caracteres -> error inline; publicar sin imagen ->
  funciona y el avance aparece; con la API sin credenciales de Supabase (el caso
  de siempre en local) -> banner de simulado y avance publicado igual.
- **Pendiente manual (navegador)**: publicar un avance al 40 % y comprobar que la
  barra de la tabla de `/projects` pasa a 40 %, y que
  `curl localhost:5000/v1/projects/<id>` devuelve `progress: 40`.

**Riesgos**:

- `z.url()` sobre esquemas raros: la fase 0 punto 4 ya lo midio. Si el resultado
  contradice lo asumido, **se ajusta este codigo, no el schema compartido**.
- La rama real de Supabase sigue **SIN CONFIRMAR** en este entorno
  (`storage.service.ts:95-98` lo dice explicitamente): no declararla probada.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `feat(admin): publish project updates with image upload`

---

## Fase 6 -- e2e del flujo completo y cierre

**Objetivo**: el spec de Playwright que recorre crear proyecto -> publicar avance
-> verificarlo contra la API, y el cierre del plan (bateria completa, docs, AI
log).

**Area**: admin + docs
**Spec**: spec 11, "Playwright" -> `e2e/projects.spec.ts`, y sus criterios de
aceptacion completos.
**Shared**: No
**Prisma**: No
**Eventos**: No

**Archivos**:

- `apps/admin/e2e/projects.spec.ts`
- `.github/workflows/ci.yml` -- el job `admin-e2e` ya corre toda la suite; solo
  revisar tiempos
- `.claude/plans/README.md` -- indice y estado del plan
- `.claude/roadmap/ROADMAP.md` -- marcar el item 11
- `docs/local-run-status.md` -- el admin deja de ser "no aporta nada"
- `docs/ai-workflow.md` -- via `/ai-log`

**Acciones**:

1. `projects.spec.ts`, con `storageState` de admin y selectores por rol/label:
   crear un proyecto con titulo unico -> aparece en `/projects` -> entrar a sus
   avances -> publicar uno al 40 % -> la barra de la tabla muestra 40 % ->
   `request.get()` a `/v1/projects/<id>` de la API devuelve `progress: 40`
   (assert contra la API, como pide el vault). El titulo unico se deriva del
   `testInfo` para que el spec sea repetible sin limpiar la base entre corridas.
2. Ejecutar la bateria completa: `bash scripts/dev/quality-check.sh --scope all`
   con Postgres, API y admin arriba.
3. Actualizar `.claude/plans/README.md` (fila del plan y header con
   `> **Estado**: ejecutado en feat/admin-auth-and-projects (<hash>..<hash>)`),
   la tabla de estado de `.claude/roadmap/ROADMAP.md` y la seccion 4 de
   `docs/local-run-status.md`.
4. `/ai-log` con la entrada de la sesion: que se pidio, que entrego la IA, que se
   reviso a mano, que se ajusto y por que (entregable de la prueba).

**Verificacion** (acotada a la fase):

- `pnpm --filter @oneimpact/admin test:e2e` -> `login.spec` + `projects.spec`
  verdes.
- `bash scripts/dev/quality-check.sh --scope all` -> `RESULT: GREEN`.
- **Pendiente manual**: run de CI en verde tras el push -- hasta verlo, el estado
  del job es `SIN CONFIRMAR`.

**Riesgos**:

- `projects.spec` **escribe** en la base: si corre contra la base de desarrollo
  deja proyectos de prueba. Es aceptable (el seed es idempotente y no los borra),
  pero hay que decirlo en el resumen; limpiarlos es un reset + `pnpm db:setup`.
- El job `admin-e2e` levanta API + admin + Postgres: es el mas lento del CI. Si
  se pasa de tiempo, la salida es ejecutarlo solo en PR y en `main`, **no**
  recortar asserts.

CHECKPOINT -- Fin del plan.
**Commits sugeridos**: `test(admin): cover create project and publish update` y
`docs: log admin auth and projects session`

---

## Anexo -- write-scope del plan

Se crea o modifica:

```
apps/admin/src/**                       (todo lo del plan)
apps/admin/e2e/**
apps/admin/playwright.config.ts
apps/admin/.env.example
apps/admin/.gitignore
.github/workflows/ci.yml                (fase 3)
scripts/dev/quality-check.sh            (fase 3, guarda de SKIP -- fuera del
                                         write-scope literal del spec, ver fase 3)
docs/adr/                               (fase 1, solo si D3 = primitivos propios)
docs/local-run-status.md                (fase 6)
docs/ai-workflow.md                     (fase 6, via /ai-log)
.claude/plans/README.md                 (fase 6)
.claude/roadmap/ROADMAP.md              (fase 6)
```

**No se toca**: `packages/**`, `apps/api/**`, `apps/mobile/**`,
`apps/api/prisma/**`, ni las paginas placeholder de `zones`, `users`,
`subscriptions` y `dashboard` del admin (son del item 13).
