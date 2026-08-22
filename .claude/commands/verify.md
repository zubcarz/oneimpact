---
description: Corre la bateria de verificacion del repo (scripts/dev/quality-check.sh) via el agente verifier y devuelve el reporte estructurado. Sin argumentos corre --scope all.
argument-hint: [--scope mobile|api|admin|shared|all] [--only typecheck,lint,unit,e2e,bundle] [--filter <ruta>]
allowed-tools: Bash(bash scripts/dev/quality-check.sh *), Bash(docker compose ps*), Agent
---

# /verify

1. Si `$ARGUMENTS` esta vacio: `--scope all`.
2. Si el scope incluye `api` y se pide `e2e`, comproba `docker compose ps`; si
   Postgres no corre, avisa que ese paso saldra SKIP y sugiere `pnpm db:up`.
3. Delega al agente `verifier` con el comando exacto:
   `bash scripts/dev/quality-check.sh $ARGUMENTS`
4. Imprimi el reporte del verifier tal cual (RESULTADO, pasos, fallos con
   archivo:linea, observaciones). No arregles nada: para eso esta `debugger`
   dentro de un plan, o el usuario.
