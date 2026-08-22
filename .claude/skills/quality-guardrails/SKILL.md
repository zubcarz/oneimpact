---
name: quality-guardrails
description: >-
  Checklist de calidad de One Impact para tener en mente ANTES de escribir codigo y DURANTE
  una revision: limites del monorepo, invariantes del pago simulado, eventos idempotentes,
  fidelidad al spec, accesibilidad movil, y lo que NO se hace (supresiones, tests
  debilitados, hex sueltos). Triggers: "antes de codear", "code review", "revisar este diff",
  "estoy siguiendo los estandares", "que tengo que cuidar", "quality".
---

# Quality guardrails -- One Impact

No es un scanner: es la lista que hay que tener en la cabeza. El gate real es
`scripts/dev/quality-check.sh` + los hooks.

## Invariantes que no se negocian

1. **El PAN nunca llega al servidor.** Ningun DTO, schema, log, fixture o query
   cache contiene el numero completo de tarjeta. Solo
   `{brand,last4,holder,expMonth,expYear}`.
2. **Modulos de la API se hablan por eventos.** Un `import` de
   `../otro-modulo/...service` es un error de diseno, no un atajo.
3. **Schemas una sola vez**, en `packages/shared`. Misma validacion en API,
   mobile y admin.
4. **Colores por token.** Un hex de marca en un componente es un hallazgo.
5. **Tokens de sesion** en secure-store (mobile) / cookie httpOnly (admin).
   Nunca AsyncStorage/localStorage.
6. **Enums espejo**: Prisma <-> `packages/shared`, mismo commit.

## Lo que NO se hace

- Agregar `eslint-disable`, `@ts-ignore`, `as any`, `any`.
- Poner un test en verde borrando asserts, con `skip`/`only`, o mockeando de mas.
- Subir Jest a 30 (rompe jest-expo) o Prisma a 7 (sin ADR).
- Editar `prisma/migrations/*.sql` a mano.
- `git add -A`, `--no-verify`, push forzado.
- Emojis en codigo, logs, commits o docs del repo.
- Copy en ingles para el usuario final; identificadores en espanol.

## Antes de dar por terminada una tarea

- [ ] Typecheck y tests del scope en verde (`quality-check.sh --scope <x>`).
- [ ] Si es UI: comparada seccion por seccion con el spec del vault
      (orden, fondos, pesos 900/700, copy exacto, assets).
- [ ] Si es API: casos negativos (401/403, pago rechazado, evento duplicado).
- [ ] Si toco `shared` o `schema.prisma`: consumidores revisados con grep,
      seed y MSW actualizados.
- [ ] Accesibilidad movil: `accessibilityRole`, areas >=44pt, safe areas.
- [ ] Verificacion manual (Expo Go / navegador) anotada como pendiente, no
      declarada hecha.
- [ ] Entrada en `docs/ai-workflow.md` si la sesion fue relevante (`/ai-log`).

## Lecciones registradas (agregar aqui las nuevas)

- 2026-08-22: `jest-expo` 57 exige Jest 29; la API se fijo en 29 para evitar
  `clearMocksOnScope is not a function` por hoisting.
- 2026-08-22: `prisma/seed.ts` entraba al build de Nest y desplazaba `dist/`;
  `tsconfig.build.json` excluye `prisma`.
- 2026-08-22: TypeScript 6 deprecó `baseUrl`; usar `paths` solo.
- 2026-08-22: heredocs de bash con backticks fallan en este entorno; usar el
  tool Write para archivos markdown.
