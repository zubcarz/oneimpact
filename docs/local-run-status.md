# Como levantar lo que hay hoy

Instantanea del **2026-08-22**, con los items 00-05 del roadmap en `main`
(mobile: fundacion + Inicio + Zonas + Suscripcion; api: health, catalog,
projects, auth/roles; admin: solo placeholders).

Actualizado el **2026-08-23** solo en lo que toca al **admin** (item 11, rama
`feat/admin-auth-and-projects`): sus secciones 1, 4 y 8. El resto del documento
sigue siendo la foto del 22 y puede haber quedado corto respecto de mobile.

El doc canonico de setup completo es [local-development.md](local-development.md).
Esto es el atajo para "quiero ver la app corriendo ahora" mas las particularidades
del entorno de esta maquina.

## 1. Arranque desde cero

```bash
pnpm install                 # solo la primera vez o tras cambiar deps
pnpm db:up                   # Postgres 16 en :5432 (docker compose)
pnpm --filter @oneimpact/api db:setup   # migrate + seed (idempotente)
```

Luego, una terminal por proceso:

```bash
# API en :5000
pnpm dev:api

# Mobile (Metro) -- desde la raiz, asi salen el QR y los atajos a/w/r
pnpm dev:mobile

# Admin en :5001 -- necesita la API arriba y la base sembrada
pnpm dev:admin
```

El admin no habla con la API directamente desde el navegador: pasa por sus
propios route handlers, que leen `API_URL` (server-only). Los valores de
desarrollo estan en `apps/admin/.env.example`; copiarlo a `apps/admin/.env` si
la API no esta en `http://localhost:5000`.

## 2. Puertos

| Proceso | Puerto |
|---|---|
| API (NestJS) | 5000 |
| Admin (Next.js) | 5001 |
| Metro (Expo) | 8081 |
| Postgres (docker) | 5432 |

El rango 5000+ se eligio a proposito: los puertos 3000/3001/4000 son el default
de casi cualquier dev server y en esta maquina conviven otros proyectos que los
usan. Si dos dev servers hacen bind del mismo puerto, Windows lo permite y el
resultado es peor que un error: **IPv4 va a un proceso e IPv6 al otro**, asi que
`curl http://127.0.0.1:5000/health` puede devolver HTML en vez de JSON. Sintoma
tipico de "la API responde cosas raras".

Para arrancar en otro puerto sin tocar `.env`: `PORT=5010 pnpm start:dev` desde
`apps/api` -- la variable de entorno gana sobre el `.env` (dotenv no sobrescribe
lo que ya existe en `process.env`). Si se cambia, hay que alinear
`EXPO_PUBLIC_API_URL` en `apps/mobile/.env` y `NEXT_PUBLIC_API_URL` en
`apps/admin/.env`.

## 3. Abrir la app

| Via | Como |
|---|---|
| Navegador | http://localhost:8081 (Metro sirve el bundle web) |
| Expo Go (movil) | escanear el QR de la terminal, o "Enter URL manually" -> `exp://<IP-LAN>:8081` |
| Emulador Android | tecla `a` en la terminal de Metro (host de la API: `http://10.0.2.2:5000`) |
| Simulador iOS | tecla `i` |

La IP LAN sale de `ipconfig` (IPv4 del adaptador Wi-Fi). En esta maquina es
`192.168.0.3`, y hay ademas interfaces virtuales (`172.21.16.1`, `100.100.58.3`,
`10.156.1.100`) que **no** sirven para el telefono.

Si Metro se lanza en segundo plano (sin TTY) no imprime QR ni acepta atajos:
para eso hay que correrlo en una terminal propia.

## 4. Que se puede probar hoy

**Mobile** -- todo estatico, todavia sin llamadas de red (item 07 pendiente):

- Inicio: `app/(tabs)/index.tsx` -- hero con video, stats, zonas, testimonios
- Zonas: `app/(tabs)/zones.tsx` y detalle `app/zone/[slug].tsx`
- Suscripcion: `app/(tabs)/subscription.tsx` -- toggle mensual/anual, selector de
  plan, beneficios

`app/(auth)/`, `app/(app)/` y `app/projects/` estan vacias: son los items 08, 09 y 10.

**API** (con el seed cargado), en `http://localhost:5000`:

- `GET /health`, Swagger en `/docs`
- `GET /v1/plans`, `GET /v1/zones`, `GET /v1/zones/:slug`
- `GET /v1/projects`, `GET /v1/projects/:id`
- `POST /v1/auth/register|login|refresh|logout`
- `GET|PATCH /v1/me`, `GET /v1/admin/users`, `PATCH /v1/admin/users/:id/role`

Usuarios del seed: `admin@oneimpact.org / Admin123!` (ADMIN) y
`ana@oneimpact.org / User123!` (USER).

**Admin** (item 11, en la rama `feat/admin-auth-and-projects`) en
`http://localhost:5001`. Deja de ser placeholders: es un panel usable de punta a
punta contra la API local.

- `/login` -- form con `react-hook-form` + `loginSchema` de `packages/shared`.
  Las credenciales van a `POST /api/auth/login`
  (`apps/admin/src/app/api/auth/login/route.ts`), que llama a la API y deja
  access y refresh en **cookies httpOnly**. Los tokens nunca llegan al body de la
  respuesta ni a `localStorage`.
- Guarda de rutas en `apps/admin/src/proxy.ts` (en Next 16 el archivo
  `middleware.ts` esta deprecado y se llama `proxy.ts`): sin cookie redirige a
  `/login`; con sesion de rol `USER` reescribe a `/403`. `/` redirige a
  `/projects`.
- `/projects` -- tabla con progreso, filtros por zona y por estado (se reflejan
  en la query string) y enlace a cada proyecto. Datos del seed: 5 proyectos
  (4 `ACTIVE` + 1 `COMPLETED`), 2 de ellos en `amazonia`; ninguno `PLANNED`.
- `/projects/new` y `/projects/[id]` -- alta y edicion, con
  `createProjectSchema` / `updateProjectSchema` de `packages/shared`.
- `/projects/[id]/updates` -- publicacion de avances con porcentaje e imagen. La
  imagen pide una signed URL a la API y sube directo al bucket; en local la API
  responde `simulated: true` (no hay credenciales de Supabase) y el avance se
  publica sin imagen. Para ver un avance con imagen, pegar una URL absoluta en el
  campo "URL de imagen".
- `/dashboard`, `/zones`, `/users` y `/subscriptions` **siguen siendo
  placeholders**: son del item 13.

Playwright (`login.spec.ts` y `projects.spec.ts`):

```bash
pnpm --filter @oneimpact/admin test:e2e
```

Playwright levanta el admin por su cuenta (`webServer` con
`reuseExistingServer`), pero **la API y Postgres tienen que estar arriba**. El
`globalSetup` inicia sesion una vez por la UI real y guarda el estado en
`apps/admin/e2e/.auth/` (ignorado por git: contiene una cookie de sesion de
verdad).

## 5. Comprobacion rapida por curl

```bash
P=5000
curl -s http://127.0.0.1:$P/health
curl -s http://127.0.0.1:$P/v1/plans

TOKEN=$(curl -s -X POST http://127.0.0.1:$P/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oneimpact.org","password":"Admin123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

curl -s http://127.0.0.1:$P/v1/me -H "Authorization: Bearer $TOKEN"
```

Esperado: `database: "up"`, tres planes, y `/v1/me` con `role: "ADMIN"`.

## 6. Parar todo

`Ctrl+C` en cada terminal, y `pnpm db:down` para Postgres (los datos sobreviven
en el volumen `pgdata`; `docker compose down -v` los borra).

Si un proceso quedo huerfano en segundo plano:

```bash
netstat -ano | grep LISTENING | grep -E ":(5000|5001|8081) "   # saca el PID
taskkill //PID <pid> //F
```

## 7. Problemas conocidos en web

### 7.1 Sin estilos y overlay de error al arrancar

Sintoma: en http://localhost:8081 la app sale sin estilos, con un overlay
"Uncaught Error: Cannot manually set color scheme, as dark mode is type 'media'.
Please use StyleSheet.setFlag('darkMode', 'class')".

Causa: el runtime web de NativeWind
(`react-native-css-interop/dist/runtime/web/color-scheme.js`) monta un
MutationObserver que, en cuanto aparece el elemento `style` generado, llama a
`colorScheme.set(...)`; ese `set` lanza si el flag `darkMode` vale `media`, que es
el valor por defecto del preset. El error corta el arranque antes de que se
apliquen los estilos, por eso se ve el HTML crudo. Solo ocurre en web: en Expo Go
no hay MutationObserver.

Arreglo aplicado: `darkMode: 'class'` en `apps/mobile/tailwind.config.js`. La app
es light-only y no usa ninguna utilidad `dark:`, asi que el cambio solo legaliza
ese camino. Tras tocar el config hay que reiniciar Metro con `--clear` y recargar
el navegador con Ctrl+Shift+R.

### 7.2 Overlay "Received `false` for a non-boolean attribute `accessible`"

Sintoma: overlay de error en las rutas `/zones` y `/subscription`.

Causa: `react-native-svg` reenvia al `<svg>` del DOM todas las props que no
reconoce (`lib/module/web/utils/prepare.js` hace `...rest`), asi que un
`accessible={false}` puesto sobre `<Svg>` llega a React DOM como atributo y este
lo rechaza. En nativo la prop es correcta; solo estorba en web. Las `View` de
react-native-web no tienen el problema: filtran props contra una lista.

Arreglo aplicado: la marca de decorativo se movio del `Svg` al `View` que lo
envuelve, en `src/components/icons/TopoLines.tsx` (que ademas pasa
`pointerEvents` por estilo, no por prop) y en `src/components/ui/BenefitItem.tsx`
(cubre los 6 iconos de beneficio de una vez). Los `Svg` ya no llevan
`accessible`.

### 7.3 Avisos que siguen abiertos (solo Inicio, no bloquean)

- `props.pointerEvents is deprecated. Use style.pointerEvents`
- `"shadow*" style props are deprecated. Use "boxShadow"`

Son deprecaciones de react-native-web: la pantalla funciona, pero conviene
limpiarlas cuando se toque Inicio.

### 7.4 Metro se cae solo con ENOENT si hay un worktree activo

Sintoma: Metro muere con
`Error: ENOENT: no such file or directory, watch '...\.claude\worktrees\<lane>
ode_modules\prettier_tmp_NNNN'`
y el proceso sale con codigo 7.

Causa: `metro.config.js` vigilaba toda la raiz del monorepo, y los worktrees de
`.claude/worktrees/` viven dentro de ella con su propio `node_modules`. Cuando
otra lane instala o formatea, sus temporales aparecen y desaparecen, y el watcher
de Metro se cae al intentar vigilar uno que ya no existe.

Arreglo aplicado: `config.watchFolders` ahora apunta solo a
`node_modules/` y `packages/` del workspace en vez de a la raiz entera
(`apps/mobile` se vigila por defecto). Los worktrees dejan de estar en el radar.

Queda un caso que el config no puede tapar: un `pnpm install` **en la raiz**
mientras Metro corre. pnpm escribe directorios `<pkg>_tmp_<pid>` dentro de
`node_modules` y los renombra; el watcher de fallback de Metro (Windows sin
watchman) intenta vigilar uno que ya desaparecio y muere igual. Regla practica:
no instalar dependencias con Metro levantado, y si hace falta, reiniciar Metro
despues del install.

## 8. Estado de verificacion

- [OK] Postgres arriba, 3 migraciones aplicadas, seed cargado
- [OK] API arriba: `/health`, `/v1/plans`, `/v1/zones`, `/v1/projects`, login y
  `/v1/me` respondiendo con datos del seed
- [OK] Metro arriba en :8081; el bundle web de `expo-router` compila (200)
- [OK] Web renderizada y capturada con Playwright (chromium, 420x900) en `/`,
  `/zones` y `/subscription`: estilos aplicados, hero con foto, tarjetas de zona,
  iconos de beneficio y footer correctos; consola sin errores en las tres rutas
- [OK] `pnpm --filter @oneimpact/mobile typecheck | lint | test` en verde
  (12 suites, 42 tests) tras los arreglos de web
- SIN CONFIRMAR: prueba en dispositivo real con Expo Go, y el video del hero
  (`expo-video`) en movimiento -- la captura muestra el poster, no el video.

### 8.1 Admin (item 11, 2026-08-23)

- [OK] `bash scripts/dev/quality-check.sh --scope all --only typecheck,lint,unit`
  en verde en los 6 scopes (shared 44, ui-tokens 0, api-client 7, api 120,
  mobile 83, admin 159)
- [OK] `pnpm --filter @oneimpact/admin test:e2e`: 5/5 verdes, tanto contra
  `next dev` como contra `next start` (build de produccion, que es lo que usa CI)
- [FAIL] `pnpm --filter @oneimpact/api test:e2e` en local, por dos causas ajenas
  al codigo del admin:
  1. `projects.spec.ts` del admin **escribe** en la base de desarrollo
     compartida, y los e2e de la API afirman conteos exactos (`toBe(5)` recibio
     9 y 10). En CI no puede pasar: los jobs `api-e2e` y `admin-e2e` estan
     separados y cada uno levanta su propio service `postgres:16-alpine`.
     Limpieza en local: reset de la base + `pnpm --filter @oneimpact/api db:setup`.
  2. `apps/api/test/jest-e2e.json` no carga dotenv y
     `apps/api/test/seed.e2e-spec.ts` instancia `PrismaClient` fuera de Nest, asi
     que en local hace falta `DATABASE_URL` exportada en el shell. Preexistente y
     ajeno al item 11; en CI el job define la variable.
- SIN CONFIRMAR: el job `admin-e2e` de CI. No se puede dar por bueno hasta que
  haya un push con un run verde en GitHub.
- SIN CONFIRMAR: revision visual del panel en el navegador. Lo que se comprobo es
  el HTML servido, `curl` y los specs de Playwright, no el aspecto de las
  pantallas.
- Nota: `/403` responde HTTP **200** (App Router solo emite ese status con
  `forbidden()`, que exige `experimental.authInterrupts`) y
  `/projects/<id-inexistente>` responde **200** por el streaming que arranca el
  `loading.tsx` del segmento. Ninguno de los dos tiene impacto de seguridad: la
  autorizacion real la hace la API, que si responde 401/403.
