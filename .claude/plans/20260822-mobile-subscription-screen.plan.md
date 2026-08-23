# Plan -- Mobile: pantalla Suscripcion (por fases, checkpoint por fase)

> **Estado**: ejecutado en `feat/mobile-subscription-screen` (`bdc84ae..11443dc`)
> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/04-mobile-subscription-screen.md` (ola 1)
> **Base**: spec 04; vault `02-Analisis-Visual/pantallas/suscripcion.md` (completo), `contenido-textos.json` clave `suscripcion`, `svg/beneficio-*.svg` (6), `design-tokens.md`; planes previos `20260822-mobile-foundation-and-home.plan.md` (Button, Header, Footer, Screen) y `20260822-mobile-zones-screens.plan.md` (patron de data layer, iconos SVG y tests)
> **Areas**: mobile
> **Contrato shared tocado**: **no** -- solo se **consume** `PLANS`, `monthlyPriceFor`, `Plan`, `PlanId` y `Billing` de `@oneimpact/shared` (`packages/shared/src/plans.ts:13-21`, `enums.ts:4-8`). No se agrega ni se modifica ningun schema.
> **Schema Prisma tocado**: **no** -- sin migracion, sin seed, sin MSW. La pantalla es estatica: los precios son del contrato, no de la API.
> **Eventos**: ninguno.
> **Zonas de riesgo**: ninguna de las criticas. **No hay input de tarjeta en esta pantalla**: el PAN aparece recien en el item 09, asi que el invariante del pago simulado no se toca aqui. Riesgo real: fidelidad al spec visual y el bundle (6 iconos SVG nuevos).
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026), ola 1
> **Como ejecutar**: `/run-plan-worktree mobile-subscription-screen` (rama `feat/mobile-subscription-screen`, modo que indica el spec) | `/run-plan-guided`

## Objetivo

Reemplazar el placeholder de `app/(tabs)/subscription.tsx` por la pantalla
Suscripcion completa y fiel al spec: collage fotografico, hero sobre crema,
toggle Mensual/Anual, selector de 3 planes con precio reactivo, CTA y los 6
beneficios con sus iconos originales. Es la puerta al flujo de registro (item 09) y la unica pantalla de la ola 1 que tiene **logica de estado real**, asi que
tambien fija el patron de test RNTL de componentes con estado que van a copiar
`CardForm` (09) y los filtros de proyectos (08).

## Contexto y hallazgos del analisis

### Estado del codigo (mas avanzado de lo que dice el ROADMAP)

- **La tabla Estado de `.claude/roadmap/ROADMAP.md:124-141` esta
  desactualizada**: marca 01, 02 y 03 como `pendiente`, pero `main` ya tiene los
  tres mergeados (`d01d14b` merge de `feat/mobile-zones-screens`, `fc142c9`
  merge de `feat/api-catalog-and-projects`). Este plan arranca de un `main` que
  ya trae contrato compartido, API de catalogo y las pantallas de Zonas. La
  Fase 5 corrige la tabla.
- `apps/mobile/app/(tabs)/subscription.tsx:1-10` es todavia el **placeholder del
  scaffold** (`02d45d4`): un `View` centrado con dos `Text`. Se reemplaza entero.
- `apps/mobile/app/(tabs)/_layout.tsx:16` ya declara la tab
  (`<Tabs.Screen name="subscription" options={{ title: 'Aportar' }} />`). **No
  hay que tocar el layout de tabs.**
- Componentes base que se reutilizan tal cual, ninguno necesita cambios:
  `Button` (`src/components/ui/Button.tsx`), `Header`, `Footer`,
  `FullScreenMenu`, `Screen` (`src/components/layout/`).
- `Button` ya cubre el CTA del spec sin tocarlo: `variant="dark"`
  (`Button.tsx:27`, `bg-gray-900` + texto blanco) con `size="lg"`
  (`Button.tsx:52-54`, que resuelve `py-4` + `text-base` + `font-semibold`) y
  `fullWidth`. Es exactamente lo que pide el vault.
- `apps/mobile/app/(tabs)/zones.tsx:1-18` es el molde de composicion de
  pantalla: `Screen` > `Header` + `FullScreenMenu` + secciones + `Footer`, con
  el estado del menu en la ruta. Se copia esa forma.

### Los 5 assets del collage ya estan en el repo

`src/assets/images/subscription/` contiene `collage-1.jpg`, `collage-2.jpg`,
`collage-3.jpg`, `hero-main.jpg` y `hero-secondary.jpg`. Son exactamente los que
nombra el spec, asi que **no hay que copiar nada del vault**. Se referencian con
`require()` literal, como exige Metro (patron ya establecido en
`src/data/zones.ts:13-24`, con el comentario que explica por que no se puede
construir la tabla con template strings).

### Hallazgo 1 (resuelve la decision abierta del spec): los SVG se transcriben, no se leen

El spec 04 deja abierto "SvgXml o transformer -- decidir en el plan" y propone
como default `SvgXml` leyendo el string. **El repo ya tiene precedente y es
otro**: `src/components/icons/TopoLines.tsx:1-43` transcribe el SVG del vault
(`svg/zonas-hero-lineas.svg`) a primitivas de `react-native-svg` y **toma el
color de `@oneimpact/ui-tokens`** (`TopoLines.tsx:40`, `colors.topoLine`), no
del string original.

Eso importa aca porque los 6 SVG del vault llevan el color **hardcodeado**:

```
$ cat beneficio-*.svg | grep -o '#[0-9a-f]\{6\}\|"white"' | sort | uniq -c
     21 "white"
      6 #243b1a
```

`#243b1a` es `colors.darkGreen` (`packages/ui-tokens/src/index.ts:7`). Meter ese
string crudo en el bundle via `SvgXml` seria un hex de marca dentro de un
componente, que es exactamente el hallazgo que prohibe
`.claude/rules/20-mobile-conventions.md` ("Colores solo por token... Un hex
suelto en un componente es un hallazgo"). Transcribirlos lo evita y sigue el
precedente.

Son ademas triviales de transcribir: entre 329 y 557 bytes cada uno, y en total
usan solo `rect`, `circle`, `line`, `path` y un `polygon`. Ver Decisiones
pendientes 1; implica **no crear** `src/assets/svg/benefit-*.svg`, desviandose
del write-scope del spec.

### Hallazgo 2: el CTA no tiene a donde navegar todavia

`app/(auth)/` solo tiene un `.gitkeep`: la ruta `register` la crea el item 09.
El spec 04 dice mostrar un `Alert` "Proximamente" mientras tanto; el vault
(`suscripcion.md`, seccion "Pantalla `registro` (propuesta RN)") describe en
cambio una pantalla de confirmacion con tarjeta blanca y boton "Confirmar". Son
dos cosas distintas y la segunda es alcance del item 09. Ver Decisiones
pendientes 2.

### Hallazgo 3: el haptic del spec no coincide con el precedente

El spec 04 y el vault piden `impactLight` al cambiar plan/billing. El unico uso
de haptics hoy es `src/features/home/Testimonials.tsx:6,30`, que usa
`Haptics.selectionAsync()`. Son APIs distintas de `expo-haptics` (ya instalado,
`apps/mobile/package.json`). Se implementa **lo que pide el spec**
(`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`) y se anota la
diferencia; no se cambia `Testimonials.tsx`, que esta fuera de alcance.

### Hallazgo 4: los tests no van colocados

`apps/mobile` no tiene tests junto al componente: los 8 existentes viven en
`apps/mobile/__tests__/` (`Button.test.tsx`, `ZoneRow.test.tsx`,
`zone-detail.test.tsx`, `zones-data.test.ts`, ...). El preset es `jest-expo`
(`package.json:58-60`) sin `jest.setup`. `__tests__/ZoneRow.test.tsx:1-17` es el
molde: mocks de modulo para `lucide-react-native`, `expo-image` y
`expo-linear-gradient`, y asserts por rol accesible. Los tests nuevos van ahi,
no en `src/`.

### Copy: el vault y el JSON coinciden, se usa el JSON como fuente

`contenido-textos.json` clave `suscripcion[1]` trae hero, billing, los 3 planes,
`cta`, `disclaimer`, `benefitsTitle` y los 6 `benefits` con `id`, `title` y
`description`, identicos a `pantallas/suscripcion.md`. Los precios del JSON
(5/4/48, 10/8/96, 15/12/144) coinciden con `PLANS` de
`packages/shared/src/plans.ts:13-17`. **El copy se transcribe a
`src/data/subscription.ts`; los precios NO se copian: salen de `PLANS`**, para
que exista una sola fuente de precio.

### Radio de impacto

Ninguno fuera de `apps/mobile`. Se consume `@oneimpact/shared` (ya probado: lo
hace `src/data/zones.ts:8`) y `@oneimpact/ui-tokens`. El unico archivo
compartido con otros planes mobile es el barrel
`src/components/ui/index.ts:1-34`, al que se le agregan tres exports: si otro
plan mobile corre en paralelo, ahi hay un conflicto de merge trivial.

### Verificaciones disponibles

`scripts/dev/quality-check.sh` acepta `--filter` y lo pasa al runner
(`quality-check.sh:42`). Para mobile los pasos son `typecheck`, `lint`, `unit` y
`bundle` (`expo export --platform android`). **`packages/shared/dist` esta
gitignored** (`.gitignore:14`) y el `main` del paquete apunta ahi
(`packages/shared/package.json:5`), asi que en un worktree recien creado hay que
correr `pnpm --filter @oneimpact/shared build` antes de que mobile compile.

## Decisiones pendientes (bloqueantes)

1. **Como se renderizan los 6 iconos de beneficio.** Default propuesto:
   **transcribirlos** a componentes `react-native-svg` en
   `src/components/icons/benefits/`, con `colors.darkGreen` y `colors.white` de
   `@oneimpact/ui-tokens` en vez de los literales del archivo, siguiendo
   `TopoLines.tsx`. Implica **no** crear `src/assets/svg/benefit-*.svg`, es
   decir una desviacion del write-scope del spec 04 (que se anota en el spec en
   la Fase 5). Alternativa descartada por defecto: `SvgXml` con el string crudo
   -- mete `#243b1a` literal en el componente, rompe la regla de tokens y suma
   un parser en runtime para 6 iconos estaticos.

2. **Que hace el CTA "Comenzar mi travesia".** Default propuesto: `Alert` con
   copy "Proximamente" (lo que dice el spec 04), dejando el destino real
   `/(auth)/register?plan=<id>&billing=<billing>` documentado en el codigo para
   el item 09. Alternativa: implementar ya la pantalla de confirmacion que
   propone el vault -- se descarta por defecto porque es alcance del item 09 y
   este plan no debe adelantarlo.

3. **Animacion del precio al alternar billing.** El vault la pide
   ("Animar precio con `LayoutAnimation`/Reanimated"); el spec 04 no la lista en
   el alcance. Default propuesto: **sin animacion en esta ola**, con el cambio
   de precio instantaneo, y se anota como pendiente visual. `react-native-reanimated`
   ya esta instalado, asi que agregarla despues es aditivo y no reabre el plan.
   Alternativa: `LayoutAnimation` simple en la Fase 2.

Ninguna otra. Lo demas queda por defecto y es cambiable sin rehacer el plan:

- `BillingToggle`, `PlanSelector` y `BenefitItem` van a `src/components/ui/`,
  como pide el write-scope del spec y como ya viven `ZoneRow` y `AdvanceCard`.
- El estado (`billing`, `selectedPlan`) vive en la **ruta**
  (`app/(tabs)/subscription.tsx`) y baja por props: las secciones de
  `src/features/` son presentacionales, segun `20-mobile-conventions.md`.

## Principios

Aditivo antes que destructivo; verde por fase; **el spec del vault manda en UI**
(clases, copy, orden de secciones, pesos tipograficos); los precios salen una
sola vez de `packages/shared`; colores solo por token; secciones
presentacionales que reciben props; sin supresiones nuevas ni tests debilitados;
copy visible en espanol, identificadores y commits en ingles.

## Mapa de fases

| Fase | Nombre                                     | Area   | Impacto               | Shared  | Prisma | Commit sugerido                                        |
| ---- | ------------------------------------------ | ------ | --------------------- | ------- | ------ | ------------------------------------------------------ |
| 0    | Pre-flight (solo lectura)                  | --     | Ninguno               | No      | No     | _(sin commit)_                                         |
| 1    | Copy y datos de la pantalla                | mobile | Aditivo               | Consume | No     | `feat(mobile): subscription copy and data`             |
| 2    | `BillingToggle` y `PlanSelector` con tests | mobile | Aditivo               | Consume | No     | `feat(mobile): billing toggle and plan selector`       |
| 3    | Collage, hero y CTA: pantalla armada       | mobile | Reemplaza placeholder | No      | No     | `feat(mobile): subscription screen with plan selector` |
| 4    | Iconos y lista de beneficios               | mobile | Aditivo               | No      | No     | `feat(mobile): subscription benefits list`             |
| 5    | Cierre: bateria completa y AI log          | --     | Ninguno               | No      | No     | `docs: log ai session mobile-subscription-screen`      |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar el punto de partida y que el entorno puede verificar lo
que el plan promete.

**Area**: --
**Archivos**: ninguno (solo lectura)
**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. Confirmar las 3 decisiones pendientes.
2. Confirmar que `main` trae los items 01, 02 y 03 (`git log --oneline -5`
   deberia mostrar los merges `d01d14b` y `fc142c9`). Este plan no depende de la
   API, pero si del contrato de `packages/shared`.
3. `pnpm --filter @oneimpact/shared build` (el `dist` esta gitignored y mobile
   no compila sin el).
4. Baseline: `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`.
   Anotar el resultado; si viene rojo, se arregla antes de empezar, en su propio
   commit, sin mezclarlo con lo nuevo.
5. Comprobar que estan los 5 assets del collage:
   `ls apps/mobile/src/assets/images/subscription/` debe listar `collage-1.jpg`,
   `collage-2.jpg`, `collage-3.jpg`, `hero-main.jpg`, `hero-secondary.jpg`.
6. Releer `02-Analisis-Visual/pantallas/suscripcion.md` entero: es el contrato
   visual de las fases 2, 3 y 4.

**Verificacion**: el baseline dice `RESULT: GREEN` y los 5 assets existen.

**Riesgos**: si falta un asset, el `require()` literal falla en tiempo de bundle,
no de typecheck: se descubriria recien en la Fase 3.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Copy y datos de la pantalla

**Objetivo**: que todo el texto y los assets de la pantalla vivan en un solo
archivo de datos, para que las secciones de las fases siguientes sean puramente
presentacionales.

**Area**: mobile
**Archivos**:

- nuevo `apps/mobile/src/data/subscription.ts`
- nuevo `apps/mobile/__tests__/subscription-data.test.ts`

**Spec**: `pantallas/suscripcion.md` secciones 1, 2 y 3 (copy);
`contenido-textos.json` clave `suscripcion[1]`.

**Shared**: **consume** `PLANS`, `monthlyPriceFor`, `Plan`, `PlanId`, `Billing`
de `@oneimpact/shared`. No modifica shared.
**Prisma**: No · **Eventos**: No

**Acciones**:

1. `subscription.ts` exporta:
   - `subscriptionScreen`: `heroTitle` ("Lo que haces hoy queda en el mundo"),
     `heroSubtitle` ("Elige como quieres sostenerlo."), `ctaLabel`
     ("Comenzar mi travesia"), `disclaimer`, `benefitsTitle`
     ("Lo que incluye tu suscripcion"), y las etiquetas de billing
     (`monthly: 'Mensual'`, `annual: 'Anual'`, `perMonth: 'mes'`,
     `annualNote: 'facturado anualmente'`). **Copy exacto del vault, con
     acentos.**
   - `COLLAGE`: las 5 imagenes con `require()` literal desde
     `@/assets/images/subscription/*`, en el orden del spec (fila 1: collage-1,
     collage-2, collage-3; fila 2: hero-main, hero-secondary).
   - `BENEFITS`: los 6 beneficios con `id` (`ipass`, `proyectos`, `travesia`,
     `academy`, `wallet`, `emergencias`), `title` y `description` del JSON, en
     ese orden.
2. **No copiar precios ni nombres de plan**: se reexportan / consumen `PLANS` y
   `monthlyPriceFor` de shared. Si hace falta un helper de formato, que sea
   `formatMonthlyPrice(plan, billing)` devolviendo el string `"$8"`, apoyado en
   `monthlyPriceFor` (`packages/shared/src/plans.ts:19-21`), nunca reimplementando
   la tabla de precios.
3. Test `subscription-data.test.ts`: que `BENEFITS` tenga 6 items con ids unicos
   y en el orden del spec; que el copy del hero y del CTA sea exactamente el del
   vault; y que `formatMonthlyPrice` devuelva `$5/$10/$15` en mensual y
   `$4/$8/$12` en anual **leyendo de `PLANS`** (este es el assert que ata el
   criterio de aceptacion del spec al contrato compartido).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter subscription-data`

**Riesgos**: el copy lleva acentos y enes; un `Estandar` sin tilde o un
"travesia" sin acento es un fallo de fidelidad que el typecheck no ve. El test
de copy exacto lo cubre.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(mobile): subscription copy and data`

---

## Fase 2 -- `BillingToggle` y `PlanSelector` con sus tests

**Objetivo**: los dos componentes con estado de la pantalla, con el test RNTL
que es criterio de aceptacion explicito del spec. Es la fase con logica: se
escribe primero el test (TDD-light).

**Area**: mobile
**Archivos**:

- nuevo `apps/mobile/src/components/ui/BillingToggle.tsx`
- nuevo `apps/mobile/src/components/ui/PlanSelector.tsx`
- `apps/mobile/src/components/ui/index.ts:1-34` (agregar los exports)
- nuevos `apps/mobile/__tests__/BillingToggle.test.tsx`, `apps/mobile/__tests__/PlanSelector.test.tsx`

**Spec**: `pantallas/suscripcion.md` seccion 2 (BillingToggle y PlanSelector).

**Shared**: consume `PLANS`, `monthlyPriceFor`, `PlanId`, `Billing`. No modifica.
**Prisma**: No · **Eventos**: No

**Acciones**:

1. **Primero los tests**, que deben fallar porque el componente no existe:
   - `BillingToggle`: renderiza "Mensual" y "Anual"; al presionar "Anual" llama
     `onChange('annual')`; el activo expone `accessibilityState.selected`.
   - `PlanSelector`: renderiza los 3 planes; con `billing="monthly"` muestra
     `$5`, `$10`, `$15`; con `billing="annual"` muestra `$4`, `$8`, `$12` **y**
     la nota "facturado anualmente"; al presionar "Premium" llama
     `onChange('premium')`. Este es el criterio de aceptacion del spec 04.
   - Mockear `expo-haptics` a nivel de modulo (patron de
     `__tests__/ZoneRow.test.tsx:4-17`), para que el test no dependa del
     dispositivo.
2. `BillingToggle`: contenedor `bg-white rounded-full p-1`, dos opciones;
   la activa `bg-dark-green` con texto blanco. `accessibilityRole="button"` y
   `accessibilityState={{ selected }}` en cada opcion, area >= 44pt.
3. `PlanSelector`: contenedor `bg-white/70 rounded-3xl p-2`, 3 columnas;
   el seleccionado `bg-white shadow-md` con check `bg-dark-green` de 20px.
   Precio con `monthlyPriceFor(plan, billing)`; nota `text-[9px]` solo en anual.
   Default de seleccion `estandar` lo fija la ruta (Fase 3), no el componente:
   el componente es controlado (`value` + `onChange`).
4. Haptic `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` al cambiar
   plan o billing, con `.catch(() => undefined)` como en
   `src/features/home/Testimonials.tsx:30` (no debe romper si el dispositivo no
   lo soporta). Ver Hallazgo 3.
5. Exportar ambos desde el barrel `src/components/ui/index.ts`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter PlanSelector`
- `bash scripts/dev/quality-check.sh --scope mobile --only unit --filter BillingToggle`
- Pendiente manual (Expo Go): el haptic al tocar plan/billing y la sombra del
  plan seleccionado -- no se declaran hechos desde el test.

**Riesgos**: (a) `shadow-md` en NativeWind no siempre rinde igual en Android que
en iOS; si no se ve, se resuelve con `elevation` via `style`, no con un hex.
(b) el test que aserta `$8` debe buscar el precio, no el texto completo del
plan: usar `getByText` sobre el string del precio para que no se acople al
layout.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): billing toggle and plan selector`

---

## Fase 3 -- Collage, hero y CTA: la pantalla armada

**Objetivo**: reemplazar el placeholder por la pantalla real, con collage,
hero, toggle, selector y CTA funcionando de punta a punta. Sin beneficios
todavia (Fase 4).

**Area**: mobile
**Archivos**:

- nuevo `apps/mobile/src/features/subscription/SubscriptionCollage.tsx`
- nuevo `apps/mobile/src/features/subscription/SubscriptionPlans.tsx`
- nuevo `apps/mobile/src/features/subscription/index.ts`
- `apps/mobile/app/(tabs)/subscription.tsx:1-10` (se reemplaza entero)

**Spec**: `pantallas/suscripcion.md` seccion 1 (Collage) y seccion 2 (Hero +
selector de plan).

**Shared**: consume (via `src/data/subscription.ts`). No modifica.
**Prisma**: No · **Eventos**: No

**Acciones**:

1. `SubscriptionCollage`: dos `View` en fila.
   - Fila 1: 3 imagenes `flex-1` con `aspect-square`.
   - Fila 2: `hero-main` con `flex-[3]` y `contentPosition="top"` (equivalente
     RN del `object-top` del spec) + `hero-secondary` con `flex-[2]`, altura
     `h-56` como fija el vault.
   - **Sin gaps y sin radios**, es explicito en el spec.
   - `expo-image` con `contentFit="cover"`, nunca `Image` de RN.
   - Decorativo: `accessible={false}`, sin `accessibilityLabel`.
2. `SubscriptionPlans` (presentacional, recibe props): H1
   `text-3xl font-bold text-gray-900 leading-tight mb-2`, `p`
   `text-base text-gray-500 mb-8`, `BillingToggle` (`mb-6`), `PlanSelector`
   (`mb-5`), CTA y disclaimer `text-xs text-gray-400 text-center mt-3`.
   Padding de seccion `px-5 pt-10 pb-8`.
   **Peso tipografico `font-bold` (700), no `font-black`**: Suscripcion y Zonas
   usan 700; el 900 es de Home (`.claude/rules/60-design-system.md`).
3. CTA con `Button variant="dark" size="lg" fullWidth`. Al presionar: `Alert`
   "Proximamente" (Decision 2), con un comentario en el codigo que deje escrito
   el destino real `/(auth)/register?plan=<id>&billing=<billing>` para el item 09.
4. La ruta `app/(tabs)/subscription.tsx` compone, con la forma de
   `app/(tabs)/zones.tsx:1-18`: `Screen statusBar="light"` +
   `Header logo="white"` + `FullScreenMenu` + `SubscriptionCollage` +
   `SubscriptionPlans` + `Footer`. **El estado (`billing`, `selectedPlan` con
   default `estandar`) vive aca** y baja por props.
5. `statusBar="light"` porque el collage oscuro esta arriba (lo dice el titulo
   del spec del vault), y `Header logo="white"` porque flota sobre las fotos.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope mobile --only bundle`
  (`expo export --platform android`: es la fase que agrega los `require()` de
  imagenes, y un asset que falta solo se ve aca)
- Pendiente manual (Expo Go), checklist del spec: collage **sin bandas ni
  gaps**, `hero-main` anclado arriba, header blanco legible sobre la foto,
  StatusBar clara, y que alternar Mensual/Anual cambie los 3 precios
  ($5/$10/$15 <-> $4/$8/$12) mostrando la nota.

**Riesgos**: (a) el `Screen` envuelve en `ScrollView`
(`src/components/layout/Screen.tsx:29-38`) y el `Header` es absoluto
(`Header.tsx:31-34`): el collage debe quedar debajo del header sin
`paddingTop`, porque el header **flota encima** a proposito. (b) `flex-[3]` /
`flex-[2]` con `h-56`: si la fila 2 no respeta la proporcion 3:2, revisar que
las imagenes no traigan su propio `aspect`.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(mobile): subscription screen with plan selector`

---

## Fase 4 -- Iconos y lista de beneficios

**Objetivo**: cerrar la pantalla con los 6 beneficios y sus iconos originales
del vault.

**Area**: mobile
**Archivos**:

- nuevos `apps/mobile/src/components/icons/benefits/{IPassIcon,ProjectsIcon,JourneyIcon,AcademyIcon,WalletIcon,EmergencyIcon}.tsx`
- nuevo `apps/mobile/src/components/icons/benefits/index.ts`
- nuevo `apps/mobile/src/components/ui/BenefitItem.tsx`
- `apps/mobile/src/components/ui/index.ts` (agregar el export)
- nuevo `apps/mobile/src/features/subscription/SubscriptionBenefits.tsx`
- `apps/mobile/src/features/subscription/index.ts`, `apps/mobile/app/(tabs)/subscription.tsx` (insertar la seccion antes del `Footer`)
- nuevo `apps/mobile/__tests__/BenefitItem.test.tsx`

**Spec**: `pantallas/suscripcion.md` seccion 3 (Beneficios), con los 6 SVG de
`02-Analisis-Visual/svg/beneficio-*.svg`.

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. Transcribir los 6 SVG a componentes `react-native-svg` (Decision 1),
   siguiendo `src/components/icons/TopoLines.tsx:1-43`:
   - `viewBox="0 0 40 40"`, tamano por prop con default 40.
   - El `rect` de fondo con `rx=8` usa `colors.darkGreen`; los trazos y rellenos
     blancos usan `colors.white`. **Ningun hex literal en el componente.**
   - Copiar las primitivas tal cual del vault (`rect`, `circle`, `line`, `path`,
     `polygon`), sin reinterpretar el dibujo. Citar el archivo de origen en un
     comentario, como hace `TopoLines.tsx:6-9`.
   - `accessible={false}`: el texto del beneficio ya nombra el item, el icono es
     decorativo y no debe duplicar el anuncio del lector de pantalla.
2. `BenefitItem`: fila con el icono de 40px y el bloque de texto (`title` en
   `font-bold text-gray-900`, `description` en gris). Recibe el icono como prop
   (`icon: ReactNode`) para no acoplar el componente de UI al catalogo de
   beneficios.
3. `SubscriptionBenefits`: `px-5 pt-2 pb-16`, H2
   `text-2xl font-bold text-gray-900 mb-6` con `benefitsTitle`, y la lista
   `gap-5` mapeando `BENEFITS` de `src/data/subscription.ts` contra el mapa
   id -> icono.
4. Insertar la seccion en la ruta, entre `SubscriptionPlans` y `Footer`.
5. Test `BenefitItem.test.tsx`: renderiza titulo y descripcion, y el icono
   decorativo no aporta texto accesible. Los 6 iconos no llevan test propio: son
   componentes sin logica (misma regla que dejo a `TopoLines` sin test).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope mobile --only bundle`
- Pendiente manual (Expo Go), checklist del spec: los 6 iconos se ven como en el
  vault (cuadrado verde oscuro `rx-8`, trazo blanco 1.5), en el orden del spec,
  y el texto no se corta en pantallas angostas.

**Riesgos**: transcribir a mano 6 dibujos es donde se cuela un error silencioso:
un `cx`/`cy` cambiado no rompe ningun test y solo se ve a ojo. Por eso la
verificacion visual de esta fase es obligatoria y se compara **contra el SVG del
vault abierto al lado**, no de memoria.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(mobile): subscription benefits list`

---

## Fase 5 -- Cierre: bateria completa, correcciones de spec y AI log

**Objetivo**: arbol entero en verde y evidencia del proceso escrita.

**Area**: --
**Archivos**: `docs/ai-workflow.md`, `.claude/roadmap/ROADMAP.md` (tabla Estado),
`.claude/roadmap/specs/04-mobile-subscription-screen.md` (correcciones),
`.claude/plans/README.md` (indice), `.claude/plans/20260822-mobile-subscription-screen.plan.md`
(header `> **Estado**: ejecutado en ...`).

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` (con Postgres arriba, porque
   el scope incluye los e2e de la API). Es la unica corrida completa del plan.
2. Anotar en el spec 04 las desviaciones aceptadas: los iconos se transcriben y
   **no** se crean `src/assets/svg/benefit-*.svg` (Decision 1), el haptic
   difiere del precedente de `Testimonials.tsx` (Hallazgo 3), y los tests van en
   `__tests__/`, no colocados (Hallazgo 4).
3. **Corregir la tabla Estado de `ROADMAP.md:124-141`**, que hoy miente: marcar
   01, 02 y 03 como hechos y en `main` (ver Contexto), y 04 como hecho en su
   rama.
4. Agregar el plan al indice de `.claude/plans/README.md` y el header de Estado
   a este archivo.
5. `/ai-log` con la sesion.
6. Si se ejecuto en worktree: cerrar con `/merge-plan mobile-subscription-screen`
   (no lo hace esta fase).

**Verificacion**:

- `RESULT: GREEN` en `--scope all`, con `apps/mobile bundle (expo export)` en
  `[OK]`.
- Checklist visual del spec de la pantalla en `[OK]`, o anotado como pendiente
  con lo que falte. **No se declara hecho lo que no se miro en dispositivo.**

**Riesgos**: `--scope all` incluye la API y el admin. Un fallo ahi no es de este
plan: se reporta, no se arregla dentro de esta rama.

CHECKPOINT -- Detente aca.
**Commit sugerido**: `docs: log ai session mobile-subscription-screen`
