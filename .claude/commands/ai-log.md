---
description: Agrega una entrada a docs/ai-workflow.md con lo que se pidio a la IA, que entrego, que se reviso y que se ajusto a mano. Entregable de la prueba tecnica.
argument-hint: [slug o resumen corto de la sesion]
allowed-tools: Read, Edit, Bash(git log*), Bash(git diff --stat*), Bash(git status*)
---

# /ai-log -- registrar la sesion en docs/ai-workflow.md

La prueba tecnica pide ver **como se integra la IA en el proceso**: que se le
pide, como se revisa lo que entrega, que se ajusta a mano. Este comando deja esa
evidencia en `docs/ai-workflow.md`, en espanol, sin emojis, honesta.

## Proceso

1. Reconstrui la sesion: `git log --oneline -10`, `git diff --stat` si hay
   cambios sin commitear, y el contexto de la conversacion (plan ejecutado,
   comandos usados, agentes invocados).
2. Agrega **al final** de `docs/ai-workflow.md` una entrada con este formato:

```markdown
## YYYY-MM-DD -- <titulo corto> [<slug>]

**Pedido**: que se le pidio a Claude Code (una o dos lineas; si fue un plan,
ruta en `.claude/plans/`).
**Herramientas**: comandos (`/gen-plan`, `/run-plan-guided`, `/gen-screen`...),
agentes (`implementer`, `verifier`, `debugger`, `review`), skills.
**Entrego**: que genero la IA (archivos, commits `<hash>`).
**Revision**: que se reviso y como (tests, quality-check, lectura del diff,
prueba en Expo Go).
**Ajustes manuales**: que se corrigio a mano y por que (esto es lo mas valioso:
errores de la IA, decisiones que tomo el humano).
**Pendiente**: verificaciones manuales o deuda que quedo anotada.
```

3. Si la sesion fue corta y sin cambios relevantes, una entrada de 3 lineas
   alcanza. Si no hubo ajustes manuales, decilo explicitamente ("ninguno"), no
   lo omitas.
4. No commitees; sugeri `docs: log ai session <slug>`.

## Reglas

- Nunca inventes ajustes manuales que no ocurrieron ni ocultes errores de la IA.
- Cita hashes de commit reales.
- Es un log, no marketing: frases cortas y concretas.
