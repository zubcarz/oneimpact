# Planes de implementacion

Los items y su orden estan en `../roadmap/ROADMAP.md`; cada plan nace de un spec de `../roadmap/specs/`.

Ciclo: `/gen-plan` -> `/run-plan-guided | autonomous | worktree` -> `/verify` ->
`/review-pr` -> `/merge-plan` (si worktree) -> `/ai-log`.

- Nombre: `YYYYMMDD-<slug>.plan.md`. Espanol, sin emojis, `archivo:linea`.
- Un plan = una feature revisable. Fases aditivas, verde por fase, commit por
  fase.
- Los planes se **versionan**: son evidencia del proceso para la prueba tecnica
  y documentacion viva despues. Cuando un plan se ejecuta por completo, agregar
  al header `> **Estado**: ejecutado en <rama> (<hash inicial>..<hash final>)`.
- Los planes abandonados se mueven a `archive/` con una linea de por que.

## Indice

| Plan | Area | Estado |
|---|---|---|
| `20260822-mobile-foundation-and-home.plan.md` | mobile | ejecutado en main (`03bf7dd..48c6788`) |
| `20260822-api-catalog-and-projects.plan.md` | api + shared | ejecutado en `feat/api-catalog-and-projects` (`378cd25..7e849be`) |
| `20260822-mobile-subscription-screen.plan.md` | mobile | ejecutado en `feat/mobile-subscription-screen` (`bdc84ae..11443dc`) |
| `20260823-admin-auth-and-projects.plan.md` | admin | ejecutado en `feat/admin-auth-and-projects` (`6d83c96..ce681d5`), pendiente de merge a main |
