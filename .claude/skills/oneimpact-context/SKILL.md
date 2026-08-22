---
name: oneimpact-context
description: >-
  Entry point de contexto para trabajar en el monorepo One Impact. Carga las reglas de
  .claude/rules/ (base, monorepo, mobile, api a eventos, admin, testing, design system) y
  apunta al vault de Obsidian con los specs de pantallas y la arquitectura. Usar al INICIO
  de cualquier sesion de codigo, planificacion o revision. Triggers: "empezar", "antes de
  codear", "contexto del proyecto", "reglas del repo", "que spec sigo", "gen-plan",
  "gen-screen", "gen-module", "review".
---

# One Impact -- contexto de trabajo

Lee, en este orden, y tenelos presentes durante toda la sesion:

1. `.claude/rules/00-base-rules.md` -- que se puede tocar, git, idioma, AI log.
2. `.claude/rules/10-monorepo-conventions.md` -- layout, direccion de
   dependencias, pins de tooling.
3. Segun el area de la tarea (podes cargar mas de una):
   - mobile: `20-mobile-conventions.md` + `60-design-system.md`
   - api: `30-api-event-driven.md`
   - admin: `40-admin-conventions.md` + `60-design-system.md`
4. `.claude/rules/50-testing-and-verification.md` -- que gate corre en cada fase.

## Fuente de verdad externa: el vault

`C:\machine\Notes\oneimpact\`

| Necesitas | Archivo |
|---|---|
| Alcance y fases (entrega lun 24 ago 2026 18:00 = Fase 1) | `00-Proyecto/alcance.md`, `01-Tecnologia-Arquitectura/plan-de-trabajo.md` |
| Arquitectura del sistema, contrato REST, modelo de datos, infra, CI | `01-Tecnologia-Arquitectura/arquitectura-sistema.md` |
| Backend a eventos: modulos, tabla de eventos, outbox, pago simulado | `01-Tecnologia-Arquitectura/backend-nest.md` |
| App movil: rutas, auth, MSW, capas | `01-Tecnologia-Arquitectura/arquitectura-mobile.md` |
| Admin web | `01-Tecnologia-Arquitectura/admin-web.md` |
| Testing por capa | `01-Tecnologia-Arquitectura/testing.md` |
| Tokens, tipografia, componentes | `02-Analisis-Visual/design-tokens.md`, `tipografia-y-estilo.md`, `componentes.md` |
| Spec por pantalla (copy, clases, assets, orden) | `02-Analisis-Visual/pantallas/{inicio,zonas,suscripcion,pantallas-nuevas}.md` |
| Copy crudo de la web | `02-Analisis-Visual/contenido-textos.json` |
| SVGs (hero zonas, 6 iconos beneficios) | `02-Analisis-Visual/svg/` |
| Assets originales | `03-Recursos/` (ya copiados a `apps/mobile/src/assets`) |

Regla: el vault **describe**; el repo **implementa**. Si encontras una
discrepancia entre el vault y el codigo, el codigo gana y se anota en el vault
(o se pregunta). Los secretos nunca van a ninguno de los dos.

## Estado actual del repo (actualizar al cerrar sesiones grandes)

- 2026-08-22: scaffold verificado; tooling Claude; item 00 (fundacion mobile +
  Inicio completo) hecho en `03bf7dd..48c6788`. API solo con `health`; admin
  placeholder. Siguiente: roadmap ola 0 (spec 01).

## Roadmap

`.claude/roadmap/ROADMAP.md` define los 15 items, sus dependencias, que lanes
corren en paralelo y en que ola. Cada item tiene su spec en
`.claude/roadmap/specs/NN-<slug>.md`: es la **entrada** de `/gen-plan`. Antes de
planificar algo, comprobar que item del roadmap es y si su ola ya esta habilitada.

## Flujo esperado

`/gen-plan` -> `/run-plan-guided` (o autonomous/worktree) -> `/verify` ->
`/review-pr` -> `/ai-log`. Para piezas sueltas: `/gen-screen`, `/gen-module`,
`/gen-admin-page`.
