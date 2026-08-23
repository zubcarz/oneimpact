# Convenciones del monorepo

## Layout

```
apps/mobile    Expo SDK 57 + expo-router + NativeWind 4      -> 20-mobile-conventions.md
apps/api       NestJS 11 + Prisma 6, monolito modular a eventos -> 30-api-event-driven.md
apps/admin     Next.js 16 + Tailwind 4 + Playwright            -> 40-admin-conventions.md
packages/shared      zod schemas, enums, planes. CONTRATO unico API <-> clientes
packages/ui-tokens   design tokens (colores, radios, spacing)
packages/api-client  fetch tipado compartido por mobile y admin
packages/config      tsconfig base
docs/                ADRs, ai-workflow.md, local-development.md, demo.gif
.claude/             reglas, agentes, comandos, skills, planes, hallazgos (versionado)
```

## Reglas de dependencia (direccion unica)

```
apps/*  -->  packages/*          (permitido)
packages/shared  -->  zod        (nada mas)
packages/api-client --> shared   (nada mas)
packages/ui-tokens  --> nada
apps/X  -->  apps/Y              PROHIBIDO
packages/* --> apps/*            PROHIBIDO
```

Si una app necesita algo de otra app, eso va a un package o al contrato REST.

## Contrato API = `packages/shared`

- Todo input que la API valida y todo form que mobile/admin valida usa **el mismo
  schema zod** de `packages/shared/src/schemas/`. Nunca duplicar validaciones.
- Enums de dominio (`Role`, `PlanId`, `Billing`, `ProjectStatus`,
  `SubscriptionStatus`) viven en `packages/shared/src/enums.ts` y se espejan en
  Prisma. Si se agrega un valor, se agrega en ambos en el **mismo commit**.
- Cambiar un shape de `shared` obliga a `grep` de sus usos en las 3 apps. Un
  consumidor roto fuera del diff es un error del plan, no un "despues lo veo".

## Tooling

- `pnpm` 9 con `node-linker=hoisted` (Metro lo necesita). No usar npm/yarn.
- Turborepo: `pnpm typecheck|lint|test|build` corren en todos los workspaces;
  `pnpm --filter @oneimpact/<app> <script>` para uno solo.
- Jest 29 en `api` y `mobile` (jest-expo lo exige); Vitest en `admin` y packages.
  No subir Jest a 30 en ninguna app: rompe `jest-expo`.
- Prisma fijado en **v6**. No migrar a v7 sin ADR.
- Versiones de Expo se alinean con `npx expo install --fix`, no a mano.

## Limites de tamano y forma

- Archivos ~300 lineas objetivo, 600 limite duro. Funciones ~40, limite 80.
  Anidamiento ~3, limite 5.
- Un archivo, una responsabilidad. Componentes `PascalCase.tsx` con export
  nombrado; hooks `useX.ts`; datos `camelCase.ts`.
- Imports absolutos con alias `@/` dentro de cada app.
- Sin `any`. Sin `// @ts-ignore` ni `eslint-disable` nuevos: si una regla
  bloquea, se arregla el codigo o se reporta.

## Entorno local

`docs/local-development.md` manda. Postgres en Docker (`pnpm db:up`), API :5000,
admin :5001, Metro :8081. Para Expo Go fisico, `EXPO_PUBLIC_API_URL` con IP LAN.
