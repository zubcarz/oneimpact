# Testing y verificacion

Estrategia completa: vault `01-Tecnologia-Arquitectura/testing.md`.

## Que prueba cada capa

| Capa | Herramienta | Que |
|---|---|---|
| packages/shared | Vitest | schemas zod, Luhn, brand, precios |
| apps/api unit | Jest 29 | use cases, listeners idempotentes, guards |
| apps/api e2e | Jest + supertest + Postgres local | flujos completos + casos negativos (401/403, pago rechazado, evento duplicado) |
| apps/mobile | Jest 29 + RNTL | componentes con estado (PlanSelector, CardForm, BillingToggle), hooks de auth |
| apps/admin unit | Vitest + RTL | forms, tablas |
| apps/admin e2e | Playwright | login, projects, metrics |
| mobile e2e | Maestro (fase 3) | registro -> pago -> dashboard |

## El verificador del repo: `scripts/dev/quality-check.sh`

```
bash scripts/dev/quality-check.sh --scope mobile|api|admin|shared|all [--only typecheck,lint,unit,e2e,bundle]
```
Es lo que corre el agente `verifier` y lo que espeja CI. Salida con marcadores
`[OK]`/`[FAIL]` por paso y codigo de salida != 0 si algo fallo.

Pasos por scope:
- `typecheck`: `tsc --noEmit` del workspace
- `lint`: eslint del workspace
- `unit`: jest/vitest del workspace (con filtro si se pasa `--filter <ruta>`)
- `e2e` (api): supertest, necesita `pnpm db:up`
- `e2e` (admin): Playwright
- `bundle` (mobile): `expo export --platform android` a un dir temporal

## Reglas

- Gate de fase = **solo lo que la fase declara**. La bateria completa
  (`--scope all`) corre una vez al cierre del plan.
- **Prohibido poner en verde debilitando el test**: borrar asserts, `skip`,
  mockear de mas, ampliar excepciones esperadas.
- **Ninguna supresion nueva** (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`
  sin issue).
- Verificacion visual en Expo Go / navegador es manual: se anota como pendiente
  en el resumen, no se declara hecha.
- TDD-light en fases con logica: primero el test que falla por la razon correcta,
  despues la implementacion.
