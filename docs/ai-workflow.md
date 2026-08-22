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
**Pendiente**: ninguna verificacion de datos pendiente. Las relaciones
Project->Zone y ProjectUpdate->Project se comprobaron el 2026-08-22 contra la
base (5 proyectos con zona valida segun el mapeo del vault, 5 updates con id
estable y autor, tablas transaccionales aun vacias). Nota de dominio: la zona
`patagonia` queda sin proyectos porque el vault solo define 5 avances y ninguno
cae ahi; la pantalla de Zonas debe soportar el caso "zona sin proyectos" en vez
de inventar un proyecto. `apps/api lint` sigue rojo desde el
scaffold (`02d45d4`, 5 errores); se confirmo con `git diff main...HEAD` que
ninguno de esos archivos lo toca esta rama, asi que no bloquea: pide un
`chore(api)` aparte. Los items 02, 03, 05 y 07 del roadmap ya pueden arrancar
sobre este contrato.

## 2026-08-22 -- Pantalla Zonas y detalle de zona [mobile-zones-screens]

**Pedido**: generar y ejecutar el plan del item 03 del roadmap
(`.claude/roadmap/specs/03-mobile-zones-screens.md`): pantalla Zonas fiel al
spec del vault y el detalle `/zone/[slug]`, alimentados por el dataset unico
del item 01. Plan: `.claude/plans/20260822-mobile-zones-screens.plan.md`.
**Herramientas**: `/gen-plan` sobre el spec y `/run-plan-worktree` (worktree
`.claude/worktrees/mobile-zones-screens`, rama `feat/mobile-zones-screens`),
en paralelo con el item 02 en su propio worktree; agentes `implementer` (4
invocaciones) y `verifier` (por fase y `--scope all`); `/ai-log`. El `debugger`
no hizo falta.
**Entrego**: `f458a55` (token `topoLine` en ui-tokens + el plan), `2345851`
(`src/data/zones.ts` derivando zonas y avances del seed de shared, con mapa de
assets y 7 tests), `508e4d6` (ZoneRow, AdvanceCard, ProgressBar + tests),
`a00604b` (pantalla Zonas: hero con las 10 lineas topograficas en
react-native-svg, lista de 5 zonas, carrusel forest con dots, footer),
`5e593a8` (detalle de zona con hero 55vh, estado vacio, pantalla "Zona no
encontrada" y 3 tests RNTL).
**Revision**: gate por fase con `quality-check.sh` acotado; `--only bundle`
(expo export) en las fases que cambiaban lo que entra al bundle; lectura del
diff con grep de hex sueltos y supresiones; al cierre `--scope all`. Verde:
typecheck en los 7 workspaces, lint de mobile, 28 tests de mobile en 8 suites,
17 de shared, 5 de api-client, bundle y playwright del admin.
**Ajustes manuales**: (1) El riesgo real del item se resolvio en el analisis,
no durante la ejecucion: **mobile nunca habia importado `@oneimpact/shared`** y
el item 01 lo dejo como CommonJS en `dist` con `exports`. Se comprobo antes de
escribir el plan con tres probes descartables (tsc, jest y un `expo export` con
una ruta temporal que confirmo que el copy del seed entra al bundle), asi que
ninguna fase necesito tocar `metro.config.js`. (2) `#5a7045`, el trazo de las
lineas topograficas, no existia como token: se agrego `topoLine` a
`packages/ui-tokens` y se anoto en el vault `design-tokens.md`. Esto extiende
en un archivo el write-scope del spec; se hizo porque la regla de "colores solo
por token" pesa mas que la lista de archivos. (3) **El plan se equivoco** al
pedir `useRef` para `onViewableItemsChanged`: choca con la regla de lint
`react-hooks/refs` del repo. El implementer lo detecto y lo resolvio con
`useCallback` y una constante de modulo, que da la misma identidad estable. Se
acepto su correccion. (4) El spec 03 pedia un "mapa slug <-> zona" que no hace
falta: cada proyecto del seed ya trae su `zoneSlug`. (5) Antes de ejecutar se
corrigio el propio spec 03 (`52fd5d7`) con la decision del estado vacio de
`patagonia` y con los nombres reales que exporta shared, que no coincidian.
**Pendiente**: verificacion visual en Expo Go (lineas topograficas al 12 % con
recorte `slice`, header negro sobre crema, snap del carrusel y dots, blur del
boton back, safe area en el notch, deep link `oneimpact://zone/amazonia`).
Dos limitaciones del modo worktree que conviene arreglar en el comando: `git
worktree add` no copia los `.env` (gitignorados), asi que el e2e de la API falla
con `Environment variable not found: DATABASE_URL`; y `docker compose ps`
ejecutado desde el worktree usa el nombre del directorio como proyecto, no ve
`oneimpact-db-1` y el gate salta el e2e de la API. Ninguna de las dos afecta a
esta rama, que es solo mobile, y no se forzo el e2e porque habia un plan de API
corriendo en paralelo sobre la misma base. `apps/api lint` sigue rojo desde el
scaffold (`02d45d4`), confirmado preexistente con `git diff main...HEAD`.
