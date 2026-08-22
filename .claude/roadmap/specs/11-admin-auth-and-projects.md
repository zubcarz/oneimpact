# Spec 11 -- admin-auth-and-projects

**Track**: admin · **Depende de**: 02, 05 (06 para publicar avances; si no esta, la fase de avances se deja para el final) · **Ola**: 3 (paralelo con 06 y 08)
**Rama**: `feat/admin-auth-and-projects` · **Modo**: `/run-plan-worktree`
**Minimo Fase 1**: login + tabla de proyectos + Playwright `login.spec` en CI. Resto si hay tiempo.

## Objetivo

Admin web usable: login con cookie httpOnly, middleware por rol, tabla de
proyectos con progreso, crear/editar proyecto y publicar avance con imagen.

## Spec del vault
`admin-web.md`. Regla `40-admin-conventions.md`, `60-design-system.md`.

## Alcance

### Auth
- `src/lib/api.ts`: `createApiClient` server-side leyendo la cookie; cliente con `credentials: 'include'` via route handlers proxy (`/api/proxy/[...path]`) **o** pasando el token desde un Server Component -- decidir en el plan (default: proxy minimo para no exponer el token).
- `app/api/auth/login/route.ts`: POST -> API `/v1/auth/login` -> set-cookie `oi_access` (httpOnly, sameSite=lax, 15 min) + `oi_refresh`; `logout/route.ts`.
- `middleware.ts`: sin cookie -> `/login`; decodifica el JWT (sin verificar firma; la verifica la API) y bloquea `role !== 'ADMIN'` con pagina 403 con tokens del sistema.
- `(auth)/login/page.tsx`: form `react-hook-form` + `loginSchema`; error inline.

### Layout
- `Sidebar` forest con logo blanco y nav pildoras; `Topbar` con nombre y logout; `PageHeader`.

### Proyectos
- `(dashboard)/projects/page.tsx`: tabla shadcn (titulo, zona, estado badge, `ProgressBar`, ultimo avance, acciones). Filtros zona/estado via query params. Loading/empty/error.
- `projects/new` y `projects/[id]`: `ProjectForm` (`createProjectSchema`/`updateProjectSchema`), select de zona desde `useZones`, lat/lng, fecha objetivo.
- `projects/[id]/updates`: lista + `PublishUpdateForm` (`publishUpdateSchema`): titulo, texto, slider de progreso, imagen -> `POST /uploads/sign` -> upload directo -> URL. Invalida queries.

### Playwright
- `e2e/login.spec.ts` (ya existe como smoke): extender a login real con seed (`admin@oneimpact.org`) -> dashboard; `ana@` -> 403.
- `e2e/projects.spec.ts`: crear proyecto -> aparece en tabla -> publicar avance 40 % -> barra 40 % -> `GET /v1/projects/:id` lo refleja.
- `storageState` generado en `global-setup`.
- CI: job `admin-e2e` que levanta Postgres + API (seed) + admin y corre Playwright (agregar a `ci.yml` en este spec, no en 14).

## Fuera de alcance
Metricas, usuarios, suscripciones (13). Zonas CRUD (13).

## Invariantes
- Token nunca en JS del cliente ni en localStorage.
- Paleta del sistema (no shadcn por defecto).

## Criterios de aceptacion
- Login admin -> tabla con 5 proyectos del seed; user normal -> 403.
- Crear proyecto y publicar avance funcionan de punta a punta contra la API local.
- `pnpm --filter @oneimpact/admin test:e2e` verde local y en CI.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit
pnpm --filter @oneimpact/admin test:e2e
```

## Commits sugeridos
`feat(admin): cookie auth and role middleware` · `feat(admin): projects table and forms` · `feat(admin): publish project updates with image upload` · `ci: admin playwright job`
