# AI workflow

How Claude Code was used in this project: prompts, what was reviewed, what was adjusted by hand.

## Log
- 2026-08-22 — Analysis of the reference site (HTML/CSS/RSC payload extraction), design tokens and screen specs written to a knowledge vault; system architecture proposal (monorepo, event-driven NestJS, admin, infra). Monorepo scaffold generated with official CLIs (create-expo-app, @nestjs/cli, create-next-app) and wired by the agent; manual review fixed: Jest version conflict (jest-expo needs 29), TS 6 `baseUrl` deprecation, Prisma pinned to 6.

## 2026-08-22 -- Tooling de Claude Code para el monorepo [claude-tooling]

**Pedido**: tomar como referencia la estructura `.claude/` y `.wip/` de dos
proyectos previos (anzi core-api, Minca-AI-tool-GS) y crear la version propia de
One Impact: reglas, comandos, agentes y orquestacion multiagente.
**Herramientas**: Claude Code (sesion interactiva), lectura de los repos de
referencia, Write/Bash.
**Entrego**: `CLAUDE.md` raiz y por app; `.claude/rules/` (7 reglas);
`.claude/agents/` (implementer, verifier, debugger, review + 3 sub-agentes de
review); `.claude/commands/` (12: ciclo gen-plan/run-plan-*/merge-plan,
generadores gen-screen/gen-module/gen-admin-page, verify, review-pr, ai-log,
suggest-commit); skills `oneimpact-context` y `quality-guardrails`; hooks
(commit-msg, protect-paths, format-on-edit) y `settings.json`;
`scripts/dev/quality-check.sh` como gate unico (usado por el agente verifier y
por CI); primer plan `.claude/plans/20260822-mobile-foundation-and-home.plan.md`.
**Revision**: se probaron los hooks con mensajes validos/invalidos y el
quality-check con `--scope all`.
**Ajustes manuales**: (1) el gate destapo que `apps/api` fallaba sin tests
(`jest` sin `--passWithNoTests`) y que vitest en `apps/admin` tomaba los specs
de Playwright: se agrego `vitest.config.ts` con `include/exclude`. (2) Tras
mover el repo de carpeta, pnpm tuvo que reinstalar para regenerar los symlinks
de workspace. (3) Decision propia: `.claude/` se versiona (evidencia del proceso
para la prueba), a diferencia de los repos de referencia donde era personal e
ignorado; `.wip/` queda ignorado.
**Pendiente**: ejecutar el primer plan con `/run-plan-guided`; exportar los
logos SVG a PNG (decision documentada en la fase 3 del plan).
