# .claude -- tooling de Claude Code para One Impact (versionado)

Esta carpeta es parte del entregable: muestra como se integra la IA en el flujo.

```
rules/      00-base 10-monorepo 20-mobile 30-api-events 40-admin 50-testing 60-design
agents/     implementer (1 tarea) - verifier (solo reporta) - debugger (3 intentos)
            review (orquestador) + review/rv-1-architecture rv-2-security-payments rv-3-ux-fidelity
commands/   gen-plan - run-plan-guided - run-plan-autonomous - run-plan-worktree - merge-plan
            gen-screen - gen-module - gen-admin-page - verify - review-pr - ai-log - suggest-commit
skills/     oneimpact-context (carga reglas + mapa del vault) - quality-guardrails (checklist)
hooks/      validate-commit-msg (conventional commits con scope) - protect-paths - format-on-edit
roadmap/    ROADMAP.md (items, grafo, olas paralelas) + specs/NN-*.md (entrada de /gen-plan)
plans/      planes por fases (gen-plan) - versionados como evidencia
analysis/   findings de /review-pr --save
settings.json  hooks + permisos (allow pnpm/expo/prisma/quality-check; deny force-push, reset --hard, --no-verify)
```

Ciclo: spec del roadmap -> `/gen-plan .claude/roadmap/specs/NN-x.md` -> `/run-plan-worktree` (lanes paralelas) o `/run-plan-guided` -> `/merge-plan` -> `/ai-log`.
