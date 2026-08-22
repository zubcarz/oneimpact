---
description: MODO 2 -- ejecuta un plan de .claude/plans/ de punta a punta en la RAMA ACTUAL, sin gates por fase, commiteando cada fase con las convenciones del repo. Un unico OK al arrancar.
argument-hint: <ruta o slug del plan en .claude/plans/>
disable-model-invocation: true
---

# /run-plan-autonomous -- ejecucion autonoma en la rama actual

Tomas un plan de `.claude/plans/` y lo ejecutas **de punta a punta en la rama
actual**, sin gates por fase y **commiteando al cerrar cada fase**.

| | rama | gates | commits |
| --- | --- | --- | --- |
| `/run-plan-guided` | actual | entrada y salida | usuario |
| **`/run-plan-autonomous`** | **actual** | **ninguno** | **el comando** |
| `/run-plan-worktree` | worktree | ninguno | el comando, luego `/merge-plan` |

Lo que lo hace seguro: cada fase cierra con un commit (punto de retorno), nunca
hay push/PR/merge/rebase, `git add` siempre con archivos concretos, y la
verificacion es la compuerta.

## Paso 1 -- Validar (solo lectura)

1. Agentes `implementer`, `verifier`, `debugger` disponibles; si no, pedi
   reiniciar.
2. Resolve y lee el plan completo.
3. Decisiones pendientes sin resolver -> STOP.
4. `git branch --show-current`: vacio -> STOP. **`main` -> STOP**: en este modo
   no se commitea sobre `main`; pedi `git checkout -b feat/<area>-<slug>`.
5. `git status --short`: cambios preexistentes quedan fuera de los commits (add
   con archivos concretos). Si tocan los mismos archivos que la fase 1, STOP.

## Paso 2 -- El unico gate

Presenta en un bloque: rama y ultimo commit, tabla Mapa de fases con commits
sugeridos, cambios preexistentes si los hay, y la frase: *"Voy a ejecutar las N
fases seguidas y commitear cada una en `<rama>`. No pusheo, no abro PR, no toco
main. Solo freno ante una decision tuya. Confirmas?"*

## Paso 3 -- Loop sin gates

Para cada fase: anuncia en una linea; delega al `implementer` (una invocacion
por tarea); TDD-light donde aplique; migraciones Prisma y `pnpm add` los corres
**vos**; `verifier` con lo que la fase declara; ROJO -> `debugger` (3 intentos);
commit de fase (Paso 4). Verificaciones manuales (Expo Go, navegador) se anotan
como pendientes.

**Heartbeat**: si una verificacion supera 5 minutos sin salida (expo export,
playwright), comproba que siga viva; si no, matala, relanza acotada y anotalo.

## Paso 4 -- El commit de fase

Lo haces vos, nunca un agente. Formato (el hook `validate-commit-msg.sh` valida):

```
git add <archivos concretos de la fase>
git commit -m "type(scope): descripcion en imperativo" -m "Por que / que cambia." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

- type: feat fix refactor chore docs test perf ci. scope: mobile api admin
  shared ui-tokens api-client ci deps docs repo.
- subject minuscula, sin punto, <=72.
- Verifica con `git log -1 --oneline`. Si el hook rechaza, corregi el mensaje
  con el contenido real; **nunca `--no-verify`**.

## Paso 5 -- Cuando parar

`debugger` agotado; decision de producto/diseno; contrato real distinto al
asumido; ruta prohibida. Reporta fases commiteadas (hash + mensaje), lo que
quedo sin commitear, diagnostico y opciones. No revertas.

## Paso 6 -- Cierre

`verifier` con `bash scripts/dev/quality-check.sh --scope all`. Verde -> corre
`/ai-log` y commitea `docs: log ai session <slug>`. Resumen: rama, `git log
--oneline <inicio>..HEAD`, verificacion con conteos, pendientes manuales, y
*"la rama esta lista; el push y el PR son tuyos"*.

## Guardarrailes

Git permitido: solo `add` y `commit` (+ lecturas). Nunca `--no-verify`. Nunca
editar `.claude/`, `CLAUDE.md`, `scripts/`, `.github/`, lockfile. Nunca avanzar
en rojo. Sin supresiones. Sin emojis. Nada de `gh pr create`.
