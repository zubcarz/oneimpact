---
description: MODO 3 -- ejecuta un plan de .claude/plans/ en un WORKTREE aislado sobre una rama nueva, sin gates, commiteando por fase. El repo principal no se toca. Cierra con /merge-plan.
argument-hint: <ruta o slug del plan en .claude/plans/>
disable-model-invocation: true
---

# /run-plan-worktree -- ejecucion aislada

Igual que `/run-plan-autonomous` pero en un **worktree** propio, de modo que el
working tree principal (y Metro, y el API en dev) siguen intactos mientras se
ejecuta. Permite correr dos planes con areas disjuntas en paralelo (ej. uno de
`apps/api` y otro de `apps/mobile`).

## Paso 1 -- Preparar

1. Validaciones del modo autonomo (plan, decisiones, agentes).
2. Rama base: la actual (normalmente `main`). Rama de trabajo:
   `feat/<area>-<slug>` derivada del nombre del plan.
3. Worktree: `git worktree add .claude/worktrees/<slug> -b feat/<area>-<slug>`
   (`.claude/worktrees/` esta en `.gitignore`).
4. Bootstrap **dentro del worktree**: `pnpm install --frozen-lockfile` (hoisted,
   ~1-2 min) y `pnpm --filter @oneimpact/api exec prisma generate`. Sin esto el
   `verifier` devolvera ERROR.
5. El plan vive en el repo principal (`.claude/plans/` esta versionado, asi que
   tambien existe en el worktree; pasa igualmente la ruta absoluta del principal).
6. Unico gate: mostra rama, worktree, mapa de fases y pedi OK.

## Paso 2 -- Ejecutar

Loop de fases identico al modo autonomo, con **raiz de trabajo = ruta absoluta
del worktree** en cada invocacion de `implementer`, `verifier` y `debugger`.
Todos los comandos (`pnpm`, `quality-check.sh`, `git add/commit`) se corren
desde el worktree.

Particularidades:
- Postgres es compartido (mismo Docker). Si el plan toca `schema.prisma`, la
  migracion se aplica a la DB local unica: avisalo en el gate y no corras dos
  planes con migraciones a la vez.
- `expo export` en el worktree es valido; `expo start` no (Metro del principal
  ya usa 8081).
- Playwright en el worktree necesita puerto libre: usa `PLAYWRIGHT_BASE_URL` y
  levanta el admin en 3002 si el principal ocupa 3001.

## Paso 3 -- Cierre

`verifier` con `--scope all` desde el worktree. `/ai-log` y commit `docs:`.
Resumen con `git log --oneline main..feat/<...>`, y la instruccion:
*"Revisa la rama y cierra con `/merge-plan <slug>`."*

**No borres el worktree ni mergees.** Eso es `/merge-plan`.

## Guardarrailes

Los del modo autonomo, mas: nunca tocar el repo principal durante la ejecucion;
`git worktree add` es la unica escritura fuera de `add/commit`.
