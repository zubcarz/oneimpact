---
description: Revision multiagente de la rama actual (o un rango) con el orquestador review -- arquitectura/eventos, seguridad/pago simulado, fidelidad UX contra el vault. Solo reporta.
argument-hint: [rango git, default main...HEAD] [--save]
allowed-tools: Bash(git diff*), Bash(git log*), Bash(git branch --show-current*), Agent, Write
---

# /review-pr

1. Rango: `$ARGUMENTS` o `main...HEAD`. Si el diff esta vacio, decilo y termina.
2. Invoca al agente `review` pasandole el rango. El decide que lentes
   (`rv-1`, `rv-2`, `rv-3`) aplican segun los archivos tocados y los lanza en
   paralelo.
3. Imprimi el reporte consolidado. Si `--save`, guardalo en
   `.claude/analysis/findings/YYYYMMDD-<rama>.review.md`.
4. Cierre: si hay BLOQUEANTE, decilo en la primera linea. Sugeri el siguiente
   paso (arreglar a mano, `/gen-plan` de remediacion, o mergear).

No edites codigo.
