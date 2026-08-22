---
description: Genera un plan de implementacion por fases en .claude/plans/ para One Impact -- solo analiza y escribe el plan, no toca codigo
argument-hint: <descripcion de la feature, o nombre de pantalla/modulo del vault>
allowed-tools: Read, Grep, Glob, Write, Bash(git *), Bash(bash scripts/dev/quality-check.sh --list*), Bash(pnpm --filter * exec prisma migrate status*)
---

# /gen-plan -- plan por fases

Produce un plan por fases y guardalo en `.claude/plans/`. Generar el plan es
**analisis y documento, nada mas**: no se escribe codigo de produccion, no se
commitea. La ejecucion es un paso aparte (`/run-plan-*`).

Este es **One Impact**: monorepo pnpm con `apps/mobile` (Expo 57, expo-router,
NativeWind), `apps/api` (NestJS 11, Prisma 6, monolito modular a eventos),
`apps/admin` (Next 16) y `packages/shared|ui-tokens|api-client|config`. El
riesgo principal no es el tamano sino **los contratos**: `packages/shared` es
consumido por las 3 apps, los modulos de la API solo se hablan por eventos, y la
UI tiene un spec exacto en el vault.

## Modos de entrada

- **A) Pantalla o seccion mobile** -- `$ARGUMENTS` nombra algo que existe en el
  vault (`02-Analisis-Visual/pantallas/*.md`). El spec es la Base del plan.
- **B) Modulo o endpoint de la API** -- Base: `01-Tecnologia-Arquitectura/
  backend-nest.md` y `arquitectura-sistema.md` (contrato REST, eventos, modelo).
- **C) Feature transversal** (ej. "registro con pago simulado") -- cruza mobile +
  api (+ admin). Base: ambos.
- **D) Feature libre** -- texto.

Si `$ARGUMENTS` esta vacio, pedi que planear y para. Si ya existe un plan sobre
el mismo tema en `.claude/plans/`, **leelo y construi encima**, citandolo.

## Paso 1 -- Analisis (OBLIGATORIO)

### 1.a Fuentes de verdad (antes de leer codigo)

1. Carga la skill `oneimpact-context` (reglas del repo) y `quality-guardrails`.
2. Lee el spec del vault que aplique. Para UI: el archivo de la pantalla +
   `componentes.md` + `design-tokens.md`. Para API: la tabla de eventos y el
   contrato REST. **Lo que dice el spec es lo que se planifica**; si el spec
   tiene un hueco, va a Decisiones pendientes.
3. Lee el estado del plan de trabajo del vault
   (`01-Tecnologia-Arquitectura/plan-de-trabajo.md`) para ubicar la feature en
   la fase correcta (Fase 1 = entrega lunes 24 ago 2026).

### 1.b Codigo

- Archivos completos, no solo la funcion. `grep` por simbolos, no por lineas de
  import.
- **Radio de impacto**:
  - `packages/shared` -> las 3 apps. Verificalo con grep, no lo asumas.
  - `apps/api/prisma/schema.prisma` -> migracion + seed + enums espejo + MSW de
    mobile (el seed es compartido).
  - `apps/api/src/modules/<m>` -> que eventos emite/escucha; quien mas escucha.
  - `apps/mobile/src/components/ui` -> todas las pantallas que lo usan.
- **Zonas de riesgo** (leelas completas si el cambio las toca):
  - Pago simulado: `packages/shared/src/schemas/payment.ts`, modulo `payments`.
    El PAN jamas al servidor.
  - Auth/roles: guards, `AuthProvider`, middleware del admin. Caso negativo
    obligatorio.
  - Eventos/listeners: idempotencia, "llega dos veces".
  - Metro/NativeWind config: cualquier cambio ahi se verifica con `expo export`.
- **Que se va a poder verificar**: `bash scripts/dev/quality-check.sh --list`.
  Regla de escala: el gate de fase es rapido y acotado; la bateria completa
  (`--scope all`) corre UNA vez al cierre.
- **Decisiones abiertas** y **riesgos**.

## Paso 2 -- Escribir el plan

- Ubicacion: `.claude/plans/`. Nombre: `YYYYMMDD-<slug-kebab>.plan.md`.
- Idioma: espanol. Sin emojis. Referencias como `archivo:linea`.

Estructura:

```markdown
# Plan -- <titulo> (por fases, checkpoint por fase)

> **Fecha**: YYYY-MM-DD
> **Origen**: <Modo A/B/C/D -- resumen>
> **Base**: <spec del vault, ADRs, planes previos>
> **Areas**: <mobile | api | admin | shared>
> **Contrato shared tocado**: <no | que schema/enum y sus consumidores (grep)>
> **Schema Prisma tocado**: <no | que modelo; migracion + seed + MSW>
> **Eventos**: <ninguno | emite X / escucha Y>
> **Zonas de riesgo**: <pago simulado, auth, eventos, config Metro -- o ninguna>
> **Fase del roadmap**: <Fase 1 entrega | Fase 2 | Fase 3>
> **Como ejecutar**: /run-plan-guided (default) | /run-plan-autonomous | /run-plan-worktree

## Objetivo
## Contexto y hallazgos del analisis
## Decisiones pendientes (bloqueantes)
## Principios
<aditivo antes que destructivo; verde por fase; spec del vault manda en UI;
schemas una sola vez en shared; eventos, no imports cruzados; sin PAN en
servidor; sin supresiones nuevas; copy es, codigo en>

## Mapa de fases

| Fase | Nombre | Area | Impacto | Shared | Prisma | Commit sugerido |
| ---- | ------ | ---- | ------- | ------ | ------ | --------------- |
| 0 | Pre-flight (solo lectura) | -- | Ninguno | No | No | _(sin commit)_ |
| 1 | <...> | mobile | Aditivo | No | No | `feat(mobile): ...` |

---

## Fase N -- <nombre>

**Objetivo**:
**Area**: mobile | api | admin | shared
**Archivos**: <lista con archivo:linea>
**Spec**: <seccion exacta del vault que implementa, si es UI>
**Shared**: <No | que cambia y consumidores>
**Prisma**: <No | migracion `<slug>`, cambios de seed, MSW>
**Eventos**: <No | emite/escucha>
**Acciones**:
1. <paso concreto, una tarea = una invocacion del implementer>

**Verificacion** (acotada a la fase):
- `bash scripts/dev/quality-check.sh --scope <area> --only typecheck,unit --filter <ruta>`
- <e2e api si toca endpoints: `--only e2e` con Postgres arriba>
- <bundle si toca config de mobile: `--only bundle`>
- <casos negativos: 401/403, pago rechazado, evento duplicado>
- <Pendiente manual: que mirar en Expo Go / navegador>

**Riesgos**:

CHECKPOINT -- Detente aca. No inicies la Fase N+1 sin aprobacion.
**Commit sugerido**: `type(scope): mensaje en imperativo`
```

Reglas de forma:

- Fase 0 siempre pre-flight sin commit.
- Cada fase deja el arbol en verde para su alcance y es aditiva.
- Fase que toque `schema.prisma` declara migracion, seed y MSW. Fase que toque
  `packages/shared` lista consumidores y los actualiza en la misma fase o en la
  siguiente, nunca los deja rotos fuera del plan.
- Fases de UI citan la seccion del spec que implementan y cierran con la lista
  de verificacion visual manual.
- Fases que toquen auth, roles, pagos o eventos cierran con casos negativos.
- La ultima fase corre `bash scripts/dev/quality-check.sh --scope all` y agrega
  la entrada en `docs/ai-workflow.md` via `/ai-log`.

## Paso 3 -- La ejecucion es aparte

Al terminar imprimi: ruta del plan, tabla Mapa de fases, Decisiones pendientes,
y los modos de ejecucion con `/run-plan-guided` como default.

**RESTRICCIONES**: solo analizas y escribis el plan. No modificas codigo ni
commiteas.
