---
description: MODO 1 -- ejecuta un plan de .claude/plans/ en la RAMA ACTUAL, fase por fase, con gate del usuario en cada borde. NO commitea; sugiere el mensaje y el usuario commitea.
argument-hint: <ruta o slug del plan en .claude/plans/>
disable-model-invocation: true
---

# /run-plan-guided -- ejecucion asistida en la rama actual

Sos el **ejecutor asistido**. Tomas un plan que YA existe en `.claude/plans/`
(generado por `/gen-plan`) y lo ejecutas **en la rama actual**, fase por fase,
deteniendote en cada borde.

- Trabaja en el working tree real. Lo que hace se ve al toque.
- **Se detiene DOS veces por fase**: al empezar (aprobar alcance) y al cerrar
  (revisar resultado).
- **NUNCA commitea.** Al cerrar cada fase sugiere el mensaje y el usuario
  commitea.
- Sin paralelismo: una ejecucion a la vez.

Delegas en los agentes `implementer`, `verifier` y `debugger` como caja negra.
Si no aparecen como `subagent_type` disponibles, pedi reiniciar la sesion.

## Paso 1 -- Validar

1. Resolve `$ARGUMENTS` a un `.plan.md` existente en `.claude/plans/` y leelo
   completo. Si no existe o matchea mas de uno, lista y termina.
2. Decisiones pendientes sin resolver -> STOP, mostralas.
3. Si el plan toca zonas de riesgo (pago simulado, auth, eventos, config Metro),
   confirma que leiste la regla correspondiente de `.claude/rules/` en esta
   sesion.
4. `git branch --show-current`: vacio -> STOP. `main` -> avisa que se va a
   trabajar sobre main y pedi confirmacion o una rama `feat/<area>-<slug>`.
5. `git status --short`: si hay cambios, mostralos y pregunta. Jamas stash ni
   descartes.
6. Anuncia el mapa de fases y pedi OK para la fase 0.

## Paso 2 -- Loop de fases con gate a la entrada y a la salida

### Gate de entrada
Bloque corto: objetivo, archivos, si toca shared/prisma/eventos, spec del vault
si es UI, y el comando de verificacion. **Espera aprobacion explicita.**

### Ejecucion
1. Delega cada accion al `implementer` (una invocacion por tarea; secuencial si
   comparten archivos; paralelo solo con archivos disjuntos). Pasale rutas
   absolutas, la tarea textual, el spec del vault si aplica y el comando de
   verificacion scoped. **Nunca le pidas git.**
2. TDD-light en fases con logica: tests primero, `verifier` confirma que fallan
   por la razon correcta, despues implementacion.
3. Si la fase declara migracion Prisma: la corres **vos** (`pnpm --filter
   @oneimpact/api prisma:migrate -- --name <slug>`), nunca un agente. Si declara
   dependencia nueva, la instalas vos con `pnpm --filter <ws> add ...` y lo
   anotas para el commit.
4. Verifica con `verifier` corriendo **lo que la fase declara**, ni mas ni
   menos. Fallback: `bash scripts/dev/quality-check.sh --scope <area> --only
   typecheck,unit`.
5. ROJO -> `debugger` con el reporte, maximo 3 intentos, re-verificando. Si
   agota -> Paso 4.

### Gate de salida
Presenta: archivos tocados (`git status --short`), resultado del `verifier`
con conteos, desviaciones, pendientes manuales (Expo Go / navegador), y el
**commit sugerido** con el formato del repo:

```
type(scope): descripcion en imperativo

Por que / que cambia en una o dos lineas.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Espera a que el usuario commitee (o diga que sigue sin commitear) antes de la
fase siguiente.

## Paso 3 -- Cierre

Tras la ultima fase: `verifier` con `bash scripts/dev/quality-check.sh --scope
all`. Luego corre `/ai-log` con el resumen de la sesion (que se pidio, que hizo
la IA, que se ajusto a mano). Resumen final: fases, verificacion con conteos,
pendientes manuales, y recordatorio de que el push es del usuario.

## Paso 4 -- Cuando parar

`debugger` agotado; decision de producto/diseno no resuelta; el contrato real
(`shared`, schema, evento) difiere del que el plan asumio; la fase exige editar
una ruta prohibida. Reporta estado exacto y opciones. **No revertas nada.**

## Guardarrailes

- Ningun comando de escritura de git (ni add, ni commit, ni checkout).
- Nunca avanzar con la verificacion en rojo.
- Ninguna supresion nueva. Sin emojis.
- PROHIBIDO editar `.claude/`, `CLAUDE.md`, `docs/` (salvo `/ai-log`),
  `scripts/`, `.github/`, lockfile -- ni directo ni via agentes.
