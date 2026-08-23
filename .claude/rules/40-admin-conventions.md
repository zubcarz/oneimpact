# Convenciones de `apps/admin` (Next.js App Router)

Spec: vault `01-Tecnologia-Arquitectura/admin-web.md`.

## Estructura

```
src/app/(auth)/login
src/app/(dashboard)/{dashboard,projects,projects/[id]/updates,zones,users,subscriptions}
src/app/api/auth/*        route handlers: login -> cookie httpOnly; logout
src/middleware.ts         redirige sin cookie; bloquea rol != ADMIN
src/components/ui        shadcn/ui (generados con el CLI, no copiados a mano)
src/components/layout    Sidebar, Topbar, PageHeader
src/features/<f>         tablas, forms, graficos por dominio
src/lib                  api (packages/api-client con cookie), auth, utils
e2e/                     Playwright
```

## Reglas

- **Mismo sistema visual que la app**: tokens en `globals.css` (`@theme`) espejo
  de `packages/ui-tokens`; Geist; pildoras; crema de fondo, forest en sidebar.
  El admin no es un panel generico.
- Server Components por defecto; `'use client'` solo en forms, tablas
  interactivas y graficos.
- Datos: TanStack Query en cliente; fetch directo en Server Components. Siempre a
  traves de `packages/api-client`.
- Forms: `react-hook-form` + `zodResolver` con schemas de `packages/shared`.
- Sesion admin en **cookie httpOnly** emitida por un route handler que llama a la
  API; el token nunca toca `localStorage`.
- Subida de imagenes: pedir signed URL a la API y subir directo a Supabase
  Storage. El admin no proxea bytes.
- Puerto 5001 (`next dev -p 5001`).

## Playwright

- Specs en `e2e/*.spec.ts`. `storageState` para login unico. `trace:
  'on-first-retry'`. Un spec por flujo: `login`, `projects` (crear + publicar
  avance + barra de progreso), `metrics`.
- En CI corre contra la API levantada con seed en el mismo job.
- Selectores por rol/label (`getByRole`, `getByLabel`), no por clases CSS.
