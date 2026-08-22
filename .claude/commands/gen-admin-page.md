---
description: Genera una pagina del admin (apps/admin, Next App Router) con su feature (tabla/form/grafico), hooks sobre api-client, schema zod de shared y spec de Playwright.
argument-hint: <page: dashboard|projects|project-updates|zones|users|subscriptions|login>
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(pnpm --filter @oneimpact/admin *), Bash(npx shadcn *), Bash(bash scripts/dev/quality-check.sh *)
---

# /gen-admin-page -- pagina del admin

Antes: carga `oneimpact-context`, lee `.claude/rules/40-admin-conventions.md` y
`60-design-system.md`. Spec funcional en el vault
`01-Tecnologia-Arquitectura/admin-web.md`.

## Paso 1 -- Contexto

1. `$ARGUMENTS` = pagina. Ruta destino en `src/app/(dashboard)/<page>/page.tsx`
   (login en `(auth)/login`). Si ya tiene contenido real, STOP y proponer
   extender.
2. Endpoints que consume (del contrato REST del vault) y si existen ya en
   `packages/api-client`. Si faltan, **se agregan al api-client**, no se hace
   `fetch` suelto.
3. Schemas zod de `packages/shared` para los forms. Si falta uno, se crea ahi.
4. Componentes shadcn necesarios: agregalos con `npx shadcn@latest add <c>` (no
   copies codigo a mano).

## Paso 2 -- Generar

```
src/app/(dashboard)/<page>/page.tsx        Server Component: PageHeader + feature
src/features/<page>/<Page>Table.tsx         'use client' solo aqui: TanStack Query, columnas, filtros
src/features/<page>/<Page>Form.tsx          react-hook-form + zodResolver(schema de shared)
src/features/<page>/use<Page>.ts            hooks de query/mutation sobre api-client
e2e/<page>.spec.ts                          Playwright: render + flujo principal, selectores por rol
```

Reglas:
- Tokens del sistema (`bg-cream`, `bg-forest`, `bg-accent`, pildoras, Geist).
  Nada de la paleta default de shadcn visible.
- Estados loading / empty / error en toda tabla y form.
- Mutaciones invalidan las queries afectadas. Progreso de proyecto como barra
  (`bg-dark-green` sobre `bg-cream`).
- Subida de imagen (project-updates): signed URL de la API -> upload directo.
- Sesion: nada de tokens en cliente; todo via cookie httpOnly y `api-client`
  configurado en `src/lib/api.ts`.

## Paso 3 -- Verificar

```
bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit
pnpm --filter @oneimpact/admin test:e2e -- e2e/<page>.spec.ts
```
(Playwright necesita API con seed en :3000 y admin en :3001.)

## Paso 4 -- Reportar

Archivos, endpoints usados, componentes shadcn agregados, pendientes manuales
(revisar en navegador), commit sugerido `feat(admin): <page> page`. No commitees.
