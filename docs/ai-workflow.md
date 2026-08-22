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

## 2026-08-22 -- Fundacion mobile y pantalla Inicio [mobile-foundation-and-home]

**Pedido**: ejecutar de punta a punta el plan
`.claude/plans/20260822-mobile-foundation-and-home.plan.md` (6 fases: Geist y
providers, componentes UI base, Header/menu/Footer, y las 7 secciones de Inicio)
con `/run-plan-autonomous` en la rama `feat/mobile-home`.
**Herramientas**: `/run-plan-autonomous`, skill `oneimpact-context`, agentes
`implementer` (una invocacion por fase), `verifier` (por fase y `--scope all`
al cierre), `/ai-log`. El `debugger` no hizo falta. Specs leidos del vault
(`pantallas/inicio.md`, `componentes.md`, `design-tokens.md`,
`tipografia-y-estilo.md`, `contenido-textos.json`).
**Entrego**: commits `03bf7dd` (fuentes + providers + `Screen`), `797d263`
(Button, Chip, SectionHeader, PlayButton, GlassCard, Dots, ImageCard, overlays
rgba centralizados, test de Button), `8cf0b28` (Header, FullScreenMenu, Footer,
`data/nav.ts`, logos PNG, test de Footer), `78b101c` (`data/home.ts`, hero con
expo-video, seccion video), `efd0b99` (carrusel de zonas, testimonios con
avatares y haptics, test de Testimonials), `48c6788` (aliados, stats con
contador animado, ensamblado de `app/(tabs)/index.tsx`, test de StatsBanner),
`e3f70a3` (config de ESLint para mobile).
**Revision**: por fase `quality-check --scope mobile` (typecheck, unit y, en las
fases con deps nativas nuevas, `expo export`); lectura del diff de cada fase
por el orquestador con grep de hex sueltos y supresiones; al cierre
`--scope all`: shared/ui-tokens/api-client/mobile/admin verdes (mobile: 4
suites, 12 tests; bundle OK; api e2e y playwright OK).
**Ajustes manuales**: (1) el hook de commit parsea con regex greedy el ultimo
`-m`, asi que el trailer `Co-Authored-By` se validaba como subject; se resolvio
citando el subject con comillas simples (el hook no se toco). (2) El
implementer dejo `jest-env.d.ts` dentro de `__tests__/` y jest lo tomaba como
suite vacia: se movio a la raiz de la app. (3) Un hex suelto (`'#ffffff'`) en
el icono custom de Instagram se cambio por `colors.white`. (4) En la fase 4 el
implementer borro `docs/ai-workflow.md` del working tree sin motivo; se
restauro con `git checkout` antes de verificar. (5) `apps/mobile` no tenia
config de ESLint y `expo lint` intentaba instalar paquetes en caliente (un
intento del implementer ensucio el lockfile y se revirtio); se agrego
`eslint.config.js` + deps con `pnpm add` y se corrigieron los dos hallazgos
(`useRef().current` en render en `Dots`, tipo `Array<T>` en `cx`). (6) Los
logos se rasterizaron a PNG @1x/@2x/@3x con `sharp` (opcion B del plan) para
no tocar `metro.config.js`. (7) Desviaciones aceptadas del implementer:
Instagram como glifo `react-native-svg` (lucide no trae iconos de marca),
contador de stats con `setInterval` en vez de Reanimated (determinista bajo
fake timers), `Dots` con `Animated` de RN core.
**Pendiente**: verificacion manual en Expo Go (Android fisico): Geist visible y
sin faux-bold en Android, autoplay/poster del hero, video inline, snap del
carrusel, blur de glass cards, menu full-screen y safe area, contador 35K.
Fuera de esta rama: `apps/api lint` esta rojo desde el scaffold (`02d45d4`: 4
errores de prettier en `env.ts`, `prisma.service.ts`, `health.controller.ts` y
un `no-unsafe-member-access` en `test/app.e2e-spec.ts`); conviene un
`chore(api)` aparte. `next dev` reescribe `apps/admin/CLAUDE.md` con un bloque
auto-generado al correr Playwright; quedo sin commitear para decidirlo a mano.

## 2026-08-22 -- Contrato de dominio, modelo Prisma y seed unico [shared-contract-and-seed]

**Pedido**: generar y ejecutar el plan del item 01 del roadmap
(`.claude/roadmap/specs/01-shared-contract-and-seed.md`): tipos y schemas en
`packages/shared`, modelo Prisma completo, seed unico con los datos reales de
la web y `packages/api-client` tipado. Plan resultante:
`.claude/plans/20260822-shared-contract-and-seed.plan.md`.
**Herramientas**: `/gen-plan` sobre el spec del roadmap y
`/run-plan-autonomous` en la rama `feat/shared-contract-and-seed`; skills
`oneimpact-context` y `quality-guardrails`; agentes `implementer` (5
invocaciones, una por tarea) y `verifier` (por fase y `--scope all` al cierre);
`/ai-log`. El `debugger` no hizo falta.
**Entrego**: `9dd3061` (shared compila a `dist` CJS + el plan), `95661d1`
(enums `PaymentStatus`/`JourneySource`/`NotificationType` y `ENUM_VALUES`,
tipos de catalogo/auth/suscripcion, schemas zod de proyectos, `API_PATHS`,
`seed-data.ts` con 5 zonas y 5 proyectos, 17 tests Vitest), `c552612` (schema
Prisma completo con 11 modelos y claves naturales de idempotencia, migracion
`20260822193637_domain_model`, seed desde `@oneimpact/shared/seed-data`, e2e
que corre el seed dos veces), `43c9155` (api-client con todo el contrato REST
partido por recurso, 5 tests con fetch stubeado).
**Revision**: gate por fase con `quality-check.sh` acotado al scope; lectura
del diff de cada fase por el orquestador, con grep explicito de supresiones y
del invariante del PAN; `pnpm run db:setup` desde base vacia
(`docker compose down -v`) para comprobar el criterio de aceptacion del spec:
5 zonas, 5 proyectos, 5 updates, 3 planes, 2 usuarios; seed corrido tres veces
sin duplicar. Cierre `--scope all`: shared/ui-tokens/api-client/mobile/admin
verdes (17 + 5 + 12 tests, bundle expo OK, playwright OK), api typecheck y e2e
verdes (9 tests).
**Ajustes manuales**: (1) El hallazgo mayor del analisis: **la API no podia
importar `@oneimpact/shared`**. Se comprobo con dos probes descartables: `tsc`
de la API (module nodenext) fallaba con `TS2835` y `ts-node` del seed con
`ERR_REQUIRE_ESM`, porque shared exportaba `.ts` crudo como ESM. Nadie lo habia
notado porque ninguna app lo importaba todavia. Se resolvio compilando shared a
`dist` CommonJS con `tsc` (fase 1 agregada al plan, no estaba en el spec).
(2) `prisma migrate dev` se nego a aplicar la migracion: `updatedAt` requerido
sin default sobre una tabla `User` con 2 filas; se le puso `@default(now())` en
vez de resetear la DB. (3) Decisiones de contrato que el vault no definia y se
tomaron a mano, anotadas en el propio vault: enums en minuscula (gana el
codigo), `Project.slug` y `ProjectUpdate.id` estables como claves naturales del
seed, imagenes como claves de asset relativas en vez de URLs inventadas, y
valores propuestos de `progress`/`lat`/`lng`/`targetDate` marcados
`// proposed` en `seed-data.ts`. (4) El implementer noto, correctamente, que en
Postgres los `NULL` no colisionan en un `@@unique`, asi que la idempotencia de
`Notification` exige que el listener use un `refId` estable; queda anotado para
el item 06.
**Pendiente**: verificacion manual en `prisma studio` de las relaciones
Project->Zone y ProjectUpdate->Project. `apps/api lint` sigue rojo desde el
scaffold (`02d45d4`, 5 errores); se confirmo con `git diff main...HEAD` que
ninguno de esos archivos lo toca esta rama, asi que no bloquea: pide un
`chore(api)` aparte. Los items 02, 03, 05 y 07 del roadmap ya pueden arrancar
sobre este contrato.
