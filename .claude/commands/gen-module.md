---
description: Genera un modulo NestJS de apps/api siguiendo el monolito modular a eventos (module, controller, application, domain events, infrastructure Prisma, tests) y lo registra en app.module.ts.
argument-hint: <module-name kebab-case: auth|users|catalog|projects|subscriptions|payments|impact|notifications>
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(pnpm --filter @oneimpact/api *), Bash(bash scripts/dev/quality-check.sh *)
---

# /gen-module -- modulo NestJS orientado a eventos

Antes de escribir: carga `oneimpact-context` y lee
`.claude/rules/30-api-event-driven.md`. La definicion del modulo (endpoints,
eventos que emite/escucha, modelos) esta en el vault
`01-Tecnologia-Arquitectura/backend-nest.md` y `arquitectura-sistema.md`: leela
y usala como contrato.

## Paso 1 -- Contexto

1. `$ARGUMENTS` = nombre kebab-case. Si ya existe `src/modules/<name>/` con
   contenido, STOP y proponer extender en vez de regenerar.
2. Lee `src/modules/health/` y cualquier modulo ya implementado como referencia
   de estilo. Lee `src/infra/events/` (EventBus, event-names) y
   `src/infra/prisma/`.
3. De la tabla de eventos del vault: que emite y que escucha este modulo.
4. De `packages/shared`: que schemas zod ya existen para sus inputs. Si falta
   uno, **se crea en `packages/shared`**, no en el modulo.

## Paso 2 -- Generar

```
src/modules/<name>/
  <name>.module.ts
  controllers/<name>.controller.ts        rutas con @Public()/@Roles segun contrato, zod via nestjs-zod
  application/<name>.service.ts           use cases; emite eventos via EventBus
  application/<name>.listeners.ts         @OnEvent para lo que escucha (idempotente)  [si aplica]
  domain/<name>.events.ts                 tipos de payload de los eventos que emite
  domain/<name>.errors.ts                 DomainError tipados con code
  infrastructure/<name>.repository.ts     acceso Prisma
  __tests__/<name>.service.spec.ts        unit con repo mockeado: casos positivos, negativos, idempotencia
```

Reglas al generar:
- Nombres de eventos se agregan a `src/infra/events/event-names.ts` si no
  existen. Payloads planos con ids.
- El modulo **no importa** servicios de otros modulos (salvo `CatalogService`
  de solo lectura). Si el contrato del vault lo sugiere, es por evento.
- Controller fino: valida, llama un use case, devuelve JSON. `{ items, total }`
  para listas.
- Errores: `throw new <Name>Error(code)` mapeados por el filter global. Nunca
  `new Error('...')`.
- Si el modulo necesita un modelo Prisma nuevo: agregalo a `schema.prisma`,
  espeja enums en `packages/shared/src/enums.ts`, extiende `prisma/seed.ts`.
  **No corras `prisma migrate`**: reportalo como paso del usuario con el nombre
  de migracion sugerido.
- Casos negativos en el spec: 401 sin token, 403 rol incorrecto, y para
  `payments` las reglas `0000`/expirada; para listeners, el evento duplicado.
- Registra el modulo en `src/app.module.ts` (quita el comentario de pendiente).

## Paso 3 -- Verificar

```
bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit --filter src/modules/<name>
```
Si toco `schema.prisma`: recordar `prisma generate` + migracion al usuario.

## Paso 4 -- Reportar

Archivos, eventos emitidos/escuchados, endpoints con su guard, schemas de
`shared` creados, pasos pendientes del usuario (migracion, seed), commit
sugerido `feat(api): <name> module`. No commitees.
