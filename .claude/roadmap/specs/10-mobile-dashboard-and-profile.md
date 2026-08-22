# Spec 10 -- mobile-dashboard-and-profile

**Track**: mobile · **Depende de**: 06 (API), 09 · **Ola**: 5 (paralelo con 12) -- entra en Fase 1 solo si 09 cerro antes del domingo 20:00
**Rama**: `feat/mobile-dashboard-and-profile` · **Modo**: `/run-plan-worktree`
**Write-scope**: `apps/mobile/app/(app)/**`, `apps/mobile/src/features/dashboard/**`, `apps/mobile/src/features/profile/**`, `apps/mobile/src/components/ui/{SubscriptionCard,JourneyLine,NotificationItem}.tsx`

## Objetivo

Zona logueada: **Dashboard** (suscripcion, linea de travesia, proyectos
seguidos, ultimo avance, notificaciones), **Perfil/iPass** y el atajo
**Admin mobile** para rol ADMIN. Tab bar propia del grupo `(app)`.

## Spec del vault
`pantallas/pantallas-nuevas.md` secciones Dashboard, Perfil/iPass, Admin (mobile). `arquitectura-mobile.md`.

## Alcance

### `app/(app)/_layout.tsx`
- Tabs: Dashboard, Proyectos (reusa `/projects` via `href`), Zonas (`/zones`), Perfil. Iconos lucide; activo lima sobre forest. Guard `useRequireAuth`.

### Dashboard (`dashboard.tsx`)
- Header saludo "Hola, {name}" + inicial en circulo + campana con badge lima (`unreadNotifications`).
- `SubscriptionCard` forest: plan, precio/mes, "Activa desde {mes}", meses activos, boton pildora blanca "Gestionar" -> perfil.
- `JourneyLine`: puntos por mes (lima activos, gris futuros, 12 visibles), texto "N meses - N puntos permanentes".
- "Tus proyectos": carrusel de `ProjectCard` compactas (75vw) de `followedProjects`; vacio -> tarjeta crema con CTA "Explorar proyectos".
- "Ultimo avance": 1 `AdvanceCard` del update mas reciente entre los seguidos.
- Notificaciones: lista `NotificationItem` (punto lima si no leida; tap -> `PATCH read`).
- `useDashboard` con pull-to-refresh.

### Perfil (`profile.tsx`)
- Tarjeta iPass (`rounded-3xl bg-forest`, logo blanco, nombre, id corto, QR decorativo con `react-native-qrcode-svg` -> **dependencia nueva, la instala el usuario**).
- Lista: Mi suscripcion (plan actual; "Cancelar" con confirmacion -> `DELETE /subscriptions/me`), Notificaciones, Cerrar sesion. Fila "Panel admin" solo con rol ADMIN.

### Admin mobile (`admin.tsx`)
- `useRequireRole('ADMIN')`. Lista de proyectos con `ProgressBar` + boton "Publicar avance" -> form corto (titulo, texto, slider de progreso) -> `POST /projects/:id/updates`.

## Fuera de alcance
Push notifications (Fase 3). Cambio de plan.

## Criterios de aceptacion
- Tras Bienvenida, el dashboard muestra el plan recien creado y 1 punto.
- Seguir un proyecto desde 08 lo hace aparecer en "Tus proyectos".
- Cancelar suscripcion: card pasa a "Cancelada", puntos intactos.
- USER no ve "Panel admin"; ADMIN publica un avance y el detalle del proyecto lo refleja.
- Tests: `JourneyLine` (N activos), `NotificationItem` (marca leida).

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter "dashboard|profile"
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual: pull-to-refresh, QR, tab bar logueada.

## Commits sugeridos
`feat(mobile): authed tabs and dashboard` · `feat(mobile): profile with ipass and subscription management` · `feat(mobile): admin shortcut to publish updates`
