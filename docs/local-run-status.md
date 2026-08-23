# Como levantar lo que hay hoy

Instantanea del **2026-08-22**, con los items 00-05 del roadmap en `main`
(mobile: fundacion + Inicio + Zonas + Suscripcion; api: health, catalog,
projects, auth/roles; admin: solo placeholders).

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
# API  -- ver el aviso del puerto 3000 mas abajo
cd apps/api && PORT=3010 pnpm start:dev

# Mobile (Metro) -- desde la raiz, asi salen el QR y los atajos a/w/r
pnpm dev:mobile
```

El admin (`pnpm dev:admin`, :3001) todavia no aporta nada: sus paginas son
placeholders hasta el item 11.

## 2. Aviso: el puerto 3000 esta ocupado en esta maquina

Otro proyecto local (dev server de Vite, "MincaAI") escucha en `0.0.0.0:3000`.
Windows deja que Nest tambien haga bind, pero entonces **IPv4 va al otro proyecto
e IPv6 a la API de One Impact**: `curl http://127.0.0.1:3000/health` devuelve HTML
en vez de JSON. Sintoma tipico de un "la API responde cosas raras".

Dos salidas:

- Liberar el 3000 (parar el otro dev server) y arrancar normal con `pnpm dev:api`.
- Arrancar en otro puerto sin tocar `.env`: `PORT=3010 pnpm start:dev` desde
  `apps/api`. La variable de entorno gana sobre el `.env` (dotenv no sobrescribe
  lo que ya existe en `process.env`).

Cuando llegue el item 07 (mobile data layer) hay que decidirlo de verdad:
`apps/mobile/.env` apunta a `EXPO_PUBLIC_API_URL=http://localhost:3000`, que hoy
es el otro proyecto. O se libera el 3000, o se cambia esa variable al puerto real.

## 3. Abrir la app

| Via | Como |
|---|---|
| Navegador | http://localhost:8081 (Metro sirve el bundle web) |
| Expo Go (movil) | escanear el QR de la terminal, o "Enter URL manually" -> `exp://<IP-LAN>:8081` |
| Emulador Android | tecla `a` en la terminal de Metro (host de la API: `http://10.0.2.2:<puerto>`) |
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

**API** (con el seed cargado), en `http://localhost:<puerto>`:

- `GET /health`, Swagger en `/docs`
- `GET /v1/plans`, `GET /v1/zones`, `GET /v1/zones/:slug`
- `GET /v1/projects`, `GET /v1/projects/:id`
- `POST /v1/auth/register|login|refresh|logout`
- `GET|PATCH /v1/me`, `GET /v1/admin/users`, `PATCH /v1/admin/users/:id/role`

Usuarios del seed: `admin@oneimpact.org / Admin123!` (ADMIN) y
`ana@oneimpact.org / User123!` (USER).

## 5. Comprobacion rapida por curl

```bash
P=3010
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
netstat -ano | grep LISTENING | grep -E ":(3010|8081) "   # saca el PID
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
