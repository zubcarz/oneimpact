# Spec 13 -- admin-metrics-users-subscriptions

**Track**: admin · **Depende de**: 11, 12 · **Ola**: 7 (Fase 2)
**Rama**: `feat/admin-metrics-users-subscriptions` · **Modo**: `/run-plan-worktree`

## Objetivo

Completar el admin: dashboard de metricas con graficos, gestion de usuarios y
roles, suscripciones/pagos simulados, CRUD de zonas y visor del outbox.

## Spec del vault
`admin-web.md` (Rutas). Regla `40-admin-conventions.md`. Para graficos, cargar la skill `dataviz` antes de escribir Recharts.

## Alcance

### Metricas (`(dashboard)/dashboard/page.tsx`)
- Tiles: usuarios, suscripciones activas, MRR simulado, proyectos activos.
- Graficos Recharts con tokens: suscripciones por plan (barras), avances ultimos 30 dias (linea), progreso promedio por zona (barras horizontales).
- `useMetrics` sobre `GET /v1/admin/metrics`, refresco 30 s.

### Usuarios (`users/`)
- Tabla (nombre, email, rol badge, creado, suscripcion activa). Cambiar rol con confirmacion -> `PATCH /admin/users/:id/role`. Busqueda por email.

### Suscripciones (`subscriptions/`)
- Tabla (usuario, plan, billing, estado, inicio) + expandible con pagos simulados (brand, last4, estado). Filtro por estado/plan. Necesita `GET /v1/admin/subscriptions` (**agregar a la API en este spec**, modulo `subscriptions`, ADMIN).

### Zonas (`zones/`)
- Tabla + form (nombre, slug, descripcion, imagen via signed URL, orden). Necesita `POST/PATCH /v1/zones` (ADMIN) en `catalog` -- agregar.

### Outbox (`outbox/`)
- Tabla de `GET /v1/admin/outbox`: tipo, creado, procesado, intentos, error. Es la "ventana" a la arquitectura a eventos para la demo.

### Playwright
- `metrics.spec.ts`: tiles coherentes con seed. `users.spec.ts`: cambiar rol y revertir.

## Fuera de alcance
Exportaciones, auditoria, multi-admin.

## Criterios de aceptacion
- Tras crear una suscripcion desde mobile, el tile y la tabla la reflejan en < 30 s.
- Cambiar rol de `ana@` a ADMIN le habilita el panel admin mobile (10).

## Verificacion
```
bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit
pnpm --filter @oneimpact/admin test:e2e
bash scripts/dev/quality-check.sh --scope api --only e2e   # endpoints nuevos
```

## Commits sugeridos
`feat(api): admin subscriptions and zones endpoints` · `feat(admin): metrics dashboard` · `feat(admin): users, subscriptions, zones and outbox pages`
