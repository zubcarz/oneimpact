---
description: Cierra un plan ejecutado en worktree -- verifica la rama, la integra a main con merge --no-ff (o deja el PR listo), y limpia el worktree. Pide OK antes de mergear.
argument-hint: <slug del plan / rama feat/...>
disable-model-invocation: true
---

# /merge-plan -- integrar una rama de plan

## Paso 1 -- Localizar

1. Resolve `$ARGUMENTS` a una rama `feat/<area>-<slug>` y su worktree en
   `.claude/worktrees/<slug>` (`git worktree list`).
2. `git log --oneline main..<rama>`: lista los commits. Si esta vacia, STOP.
3. `git status --short` en el worktree: si hay cambios sin commitear, STOP y
   mostralos.

## Paso 2 -- Verificar en la rama

`verifier` desde el worktree: `bash scripts/dev/quality-check.sh --scope all`.
Luego el agente `review` sobre `main..<rama>`. ROJO o hallazgos BLOQUEANTE ->
STOP con el reporte; el usuario decide si vuelve a `/run-plan-*` o arregla a
mano.

## Paso 3 -- Integrar (con OK)

Presenta: commits, resultado de verificacion, hallazgos ALTA/MEDIA del review,
y pregunta **una** vez: *"Integro `<rama>` a `main` con `merge --no-ff`?"*

Con OK, desde el repo principal:
```
git checkout main
git merge --no-ff <rama> -m "merge: <rama>" -m "Plan: .claude/plans/<archivo>.plan.md"
```
Si hay conflicto: STOP, no resuelvas por tu cuenta; muestra los archivos.

Alternativa si el usuario prefiere PR: `git push -u origin <rama>` lo hace el
usuario; vos dejas el cuerpo del PR redactado (objetivo, fases, verificacion,
pendientes manuales, resumen del review).

## Paso 4 -- Limpiar

Solo tras merge exitoso y con OK: `git worktree remove .claude/worktrees/<slug>`
y `git branch -d <rama>`. Nunca `-D`.

## Guardarrailes

Escrituras git permitidas: `checkout main`, `merge --no-ff`, `worktree remove`,
`branch -d`. Nada de push, rebase, reset, `-D`, `--no-verify`.
