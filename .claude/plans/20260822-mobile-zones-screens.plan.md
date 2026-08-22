# Plan -- Pantalla Zonas + detalle de zona (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/03-mobile-zones-screens.md` (ola 1, paralelo con 02 y 04)
> **Base**: spec 03; vault `02-Analisis-Visual/pantallas/zonas.md` (completo), `componentes.md` (ZoneRow, AdvanceCard, Chip, Dots), `design-tokens.md`, `tipografia-y-estilo.md`, `svg/zonas-hero-lineas.svg`; planes previos `20260822-mobile-foundation-and-home.plan.md` (componentes base que se reutilizan) y `20260822-shared-contract-and-seed.plan.md` (de donde salen los datos)
> **Areas**: mobile (+ `packages/ui-tokens`: un token nuevo, ver Decisiones)
> **Contrato shared tocado**: no -- solo se **consume** `SEED_ZONES` y `SEED_PROJECTS` de `@oneimpact/shared`. Consumidores de shared hoy (grep): `packages/api-client/src`, `apps/api/prisma/seed.ts`. Mobile seria el tercero.
> **Schema Prisma tocado**: no
> **Eventos**: ninguno
> **Zonas de riesgo**: (1) primera vez que mobile importa `@oneimpact/shared` -- **verificado en el analisis, no asumido**; (2) hex `#5a7045` del SVG que no existe como token; (3) dependencia de la rama `feat/shared-contract-and-seed` sin mergear
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026) -- bloque "Domingo 23: Suscripcion y Zonas (lista + avances + dots)"
> **Como ejecutar**: `/run-plan-worktree` (el que indica el spec, para ir en paralelo con 02 y 04) | `/run-plan-guided`

## Objetivo

Pantalla **Zonas** fiel al spec (hero crema con lineas topograficas, 5 ZoneRow,
carrusel forest de avances con dots, footer) y **detalle de zona**
`/zone/[slug]` -- pantalla que la web no tiene --, alimentadas por el dataset
unico de `@oneimpact/shared` que dejo el item 01. Los componentes `ZoneRow`,
`AdvanceCard` y `ProgressBar` quedan disponibles para el item 08.

## Contexto y hallazgos del analisis

### Verificaciones hechas durante el analisis (probes descartables, ya borrados)

1. **Mobile puede consumir `@oneimpact/shared`**: era el riesgo principal del
   plan, porque ninguna app lo importaba todavia (el item 01 lo dejo como
   CommonJS en `dist` con `exports`, y Metro tiene su propia resolucion).
   Comprobado en los tres niveles:
   - `tsc --noEmit` de mobile con un import de `SEED_ZONES`: exit 0.
   - Jest (`jest-expo`) resolviendo el mismo import en un test: verde.
   - **Metro**: `npx expo export --platform android` con una ruta de prueba
     `app/__probe.tsx` que importa shared: bundle generado (6.6 MB) y el copy
     del seed (`Restauracion de ecosistemas en Guainia`) aparece **dentro** del
     bundle. `unstable_enablePackageExports` esta activo por defecto en SDK 57
     (`node_modules/metro-config/src/defaults/index.js:69`), asi que el subpath
     y el `exports` de shared funcionan sin tocar `metro.config.js`.
     Conclusion: **ninguna fase necesita tocar config de Metro**.

2. **`#5a7045` (stroke de las lineas topograficas) no es un token**. No esta en
   `packages/ui-tokens/src/index.ts:2-23` ni en la tabla de
   `02-Analisis-Visual/design-tokens.md`. La regla 60 prohibe hex sueltos en
   componentes, asi que hay que darle nombre. Ver Decisiones.

### Estado del codigo

- `apps/mobile/app/(tabs)/zones.tsx:1` es el placeholder del scaffold.
  `app/zone/` solo tiene `.gitkeep`: la ruta `[slug]` no existe.
- Componentes ya disponibles y reutilizables (`src/components/ui/index.ts:1-25`):
  `Button` (variantes accent/white/dark/ink, `size="lg"`, `fullWidth`), `Chip`
  (con `variant="zones"`, que es el que pide el spec de esta pantalla),
  `SectionHeader` (props `align`, `tone="dark"`, `weight="bold"` -- Zonas usa
  700, no 900), `Dots`, `GlassCard`, `PlayButton`, `ImageCard`, helper `cx`.
  Faltan `ZoneRow`, `AdvanceCard` y `ProgressBar`.
- Layout listo: `Screen` (prop `statusBar`, `bg`), `Header` (prop
  `logo="black"`, que esta pantalla necesita por el fondo crema), `Footer`,
  `FullScreenMenu` (`src/components/layout/index.ts`).
- `src/theme/overlays.ts` centraliza los rgba de gradientes.
- `react-native-svg@15.15.4` ya es dependencia y ya se usa
  (`src/components/icons/InstagramIcon.tsx:1`): el SVG del hero se dibuja
  inline con `Svg`/`Path`, **sin** transformer ni cambio de config. El archivo
  del vault tiene 10 `path` bezier, todos con el mismo `stroke` y
  `stroke-width="1.2"`, y el `<svg>` lleva `opacity="0.12"`,
  `viewBox="0 0 900 400"` y `preserveAspectRatio="xMidYMid slice"`.
- `app.json:24,29`: `scheme: "oneimpact"` y `typedRoutes: true`. Al crear
  `app/zone/[slug].tsx` expo-router genera el tipo de la ruta.

### Datos: lo que el spec 03 pedia y lo que shared realmente exporta

El spec hablaba de `seedZones`/`seedAdvances`; los nombres reales (corregidos
en el spec el 2026-08-22, commit `52fd5d7`) son:

- `SEED_ZONES: SeedZone[]` -- 5 zonas `{ slug, name, description, imageKey, order }`,
  `order` 1..5 (`packages/shared/src/seed-data.ts:20`).
- `SEED_PROJECTS: SeedProject[]` -- 5 proyectos con `zoneSlug`, `title`,
  `summary`, `description`, `status`, `progress`, `coverKey`, `lat`, `lng`,
  `targetDate` y `updates: [{ id, title, body, progress, mediaKey, publishedAt }]`
  (`packages/shared/src/seed-data.ts:72`).
- **No hace falta el "mapa slug <-> zona" que menciona el spec**: cada proyecto
  ya trae su `zoneSlug` resuelto (Guainia y el de carbono -> `amazonia`,
  Yucatan -> `mexico`, corredores -> `africa`, Borneo -> `borneo`).
- Los "avances" del carrusel **son** el primer `ProjectUpdate` de cada proyecto:
  `AdvanceCard` se alimenta de `{ project.zoneSlug, update.title, update.body,
update.mediaKey, update.publishedAt }` y la fecha se renderiza como
  `. 2026` segun el spec.
- Imagenes: shared entrega **claves de asset** (`zones/amazonia.jpg`,
  `advances/guainia.jpg`), no URLs. Metro exige `require()` con literal
  estatico, asi que `src/data/zones.ts` mantiene el mapa clave -> `require()`.

### Verificado contra la base de datos (2026-08-22)

`patagonia` no tiene ningun proyecto: el vault define 5 avances y ninguno cae
ahi (amazonia se lleva dos). Decision ya tomada y escrita en el spec: la
pantalla de detalle muestra un **estado vacio**, no se inventa un proyecto.

### Deuda menor detectada (fuera del write-scope del spec, no se toca aca)

- `src/features/home/ZonesCarousel.tsx:12` hace
  `router.push(\`/zone/${slug}\` as Href)`. Cuando exista la ruta, el cast
sobra. `ZonesCarousel.tsx`no esta en el write-scope de este spec: se anota
para el item 07 o un`refactor(mobile)` aparte.
- `src/data/home.ts:88` define `homeZones` con sus propios `require()` y el
  nombre `Amazonia` sin tilde (asi lo escribe `inicio.md`), mientras
  `SEED_ZONES` usa `Amazonía` (asi lo escribe `zonas.md`). **Las dos son
  fieles a su spec**: no se unifica el copy. Lo que si conviene unificar mas
  adelante es el mapa de assets; el item 07 puede hacer que `home.ts` reuse el
  de `zones.ts`.

## Decisiones pendientes (bloqueantes)

**(ninguna bloqueante).** Dos decisiones tomadas por defecto, ambas
reversibles sin rehacer el plan:

1. **El color de las lineas topograficas se vuelve token.** `#5a7045` se agrega
   a `packages/ui-tokens/src/index.ts` como `topoLine` (y a `tailwindColors`
   como `topo-line`). Esto **extiende en un archivo el write-scope del spec
   03**, que solo listaba archivos de `apps/mobile`. Se hace igual porque la
   regla 60 ("colores solo por token, un hex suelto es un hallazgo") pesa mas
   que la lista de archivos del spec, y porque el token pertenece al sistema de
   diseno, no a la pantalla. Radio de impacto real, medido con grep: `colors`
   se importa en 8 archivos de mobile y `tailwindColors` solo en
   `apps/mobile/tailwind.config.js:1`; **el admin no consume el package** (tiene
   su propia copia de variables en `src/app/globals.css:5-14`), asi que agregar
   un color no lo afecta. Alternativa si se prefiere no tocar el package: dejar
   el color en `src/theme/overlays.ts` como constante de decoracion. Es peor:
   parte el sistema de diseno en dos lugares.
2. **`ProgressBar` se construye aunque esta pantalla no lo use.** El spec lo
   pide como componente reutilizable para el item 08 (barra "Avance verificado
   64 %"). Para que no entre codigo muerto sin cobertura, la fase que lo crea
   **incluye su test** (clamp de 0-100 y ancho proporcional). Si se prefiere no
   adelantarlo, se saca de la fase 3 y lo hace el item 08.

## Principios

Aditivo; verde por fase; el spec del vault manda en UI (clases, copy, orden de
secciones); Zonas usa peso **700** (`font-bold`), no el 900 de Home; colores
solo por token; secciones presentacionales sin hooks de red (los datos entran
por props o desde `src/data`); copy en espanol tal cual el vault; sin
supresiones; sin emojis.

## Mapa de fases

| Fase | Nombre                                         | Area      | Impacto                  | Shared  | Prisma | Commit sugerido                                         |
| ---- | ---------------------------------------------- | --------- | ------------------------ | ------- | ------ | ------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                      | --        | Ninguno                  | No      | No     | _(sin commit)_                                          |
| 1    | Token de la linea topografica                  | ui-tokens | Aditivo                  | No      | No     | `feat(ui-tokens): add the topographic line color`       |
| 2    | Capa de datos de zonas sobre el seed           | mobile    | Aditivo                  | Consume | No     | `feat(mobile): zones data layer over the shared seed`   |
| 3    | ZoneRow + AdvanceCard + ProgressBar            | mobile    | Aditivo                  | No      | No     | `feat(mobile): zone row, advance card and progress bar` |
| 4    | Pantalla Zonas                                 | mobile    | Sustituye el placeholder | No      | No     | `feat(mobile): zones screen`                            |
| 5    | Detalle de zona + estado vacio + no encontrada | mobile    | Aditivo                  | No      | No     | `feat(mobile): zone detail screen`                      |
| 6    | Cierre: bateria completa + ai-log              | --        | Ninguno                  | No      | No     | `docs: log ai session mobile-zones-screens`             |

---

## Fase 0 -- Pre-flight

**Objetivo**: confirmar que el estado del repo es el que el plan asume.
**Acciones**:

1. **Dependencia del item 01**: este plan importa `@oneimpact/shared`
   (`SEED_ZONES`, `SEED_PROJECTS`), que **solo existe en la rama
   `feat/shared-contract-and-seed`** (commits `9dd3061..104e58c`), aun sin
   mergear a `main` al momento de escribir esto. Verificar con
   `git log --oneline main -3 | grep -q "shared-contract"` o
   `test -f packages/shared/src/seed-data.ts`. Si no esta en `main`: **STOP**,
   y elegir -- (a) mergear 01 primero, o (b) crear la rama/worktree de este
   plan a partir de `feat/shared-contract-and-seed`.
2. `packages/shared/dist/` existe (si no, `pnpm --filter @oneimpact/shared build`;
   turbo lo encadena solo en `pnpm typecheck`).
3. `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit` verde.
4. Assets presentes: `src/assets/images/zones/{amazonia,mexico,africa,borneo,patagonia}.jpg`
   y `src/assets/images/advances/{guainia,yucatan,corredores,borneo-monitoreo,amazonia-carbono}.jpg`.

CHECKPOINT -- sin commit.

## Fase 1 -- Token de la linea topografica

**Objetivo**: que el stroke del SVG del hero sea un token, no un hex suelto.
**Area**: `packages/ui-tokens` (extiende el write-scope del spec; ver Decisiones)
**Archivos**: `packages/ui-tokens/src/index.ts:2-23` (`colors`) y el fragmento `tailwindColors` del mismo archivo
**Spec**: `02-Analisis-Visual/svg/zonas-hero-lineas.svg` (`stroke="#5a7045"`)
**Shared**: no. **Prisma**: no. **Eventos**: no.
**Acciones**:

1. Agregar `topoLine: '#5a7045'` a `colors` con un comentario de una linea que
   diga de donde sale (decoracion del hero de Zonas) y `'topo-line': colors.topoLine`
   a `tailwindColors`.
2. Anotar el token en el vault `02-Analisis-Visual/design-tokens.md` (tabla de
   colores de marca o una fila nueva "decoracion"), para que el doc no quede
   desactualizado respecto al codigo.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
  (el scope cubre `packages/*`)
- `pnpm --filter @oneimpact/mobile typecheck` (consumidor del package)

**Riesgos**: ninguno tecnico. Es un cambio de un package consumido por mobile;
el admin no lo importa (usa su propia copia en `globals.css`).

CHECKPOINT. **Commit sugerido**: `feat(ui-tokens): add the topographic line color`

## Fase 2 -- Capa de datos de zonas sobre el seed

**Objetivo**: una unica fuente de zonas y avances para la pantalla, derivada de
`@oneimpact/shared`, con el mapa clave -> `require()` de los assets.
**Area**: mobile
**Archivos**: `apps/mobile/src/data/zones.ts` (nuevo), `apps/mobile/__tests__/zones-data.test.ts` (nuevo)
**Spec**: `pantallas/zonas.md` secciones 2 y 3 (que datos consume cada seccion)
**Shared**: **consume** `SEED_ZONES` y `SEED_PROJECTS`. No modifica shared.
**Prisma**: no. **Eventos**: no.
**Acciones**:

1. `src/data/zones.ts`:
   - `ASSETS: Record<string, number>` con las 10 claves que usa el seed
     (`zones/*.jpg` x5, `advances/*.jpg` x5) mapeadas a `require()` literales.
     Helper `assetFor(key: string): number` que **lanza** si la clave no existe
     (una clave sin asset es un error de datos, no un fallback silencioso).
   - `ZoneView = { slug, name, description, image, order }` derivado de `SEED_ZONES`
     ordenado por `order`.
   - `AdvanceView = { id, zoneSlug, title, body, image, year }` derivado de
     aplanar `SEED_PROJECTS` -> su primer `update` (`year` desde `publishedAt`).
   - `zones: ZoneView[]`, `advances: AdvanceView[]`, `getZone(slug): ZoneView | undefined`,
     `advancesByZone(slug): AdvanceView[]`, `projectsByZone(slug)`.
   - Copy de la pantalla (H1, parrafo del hero, titulo y subtitulo de "Avances
     desde el territorio", copy del estado vacio) tambien aca, como en
     `src/data/home.ts`. Texto exacto del vault.
2. Test: `zones` tiene 5 items ordenados 1..5; cada `advance.zoneSlug` existe en
   `zones`; `advancesByZone('amazonia')` devuelve 2; **`advancesByZone('patagonia')`
   devuelve 0** (el caso que motiva el estado vacio); `assetFor` lanza con una
   clave inventada.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter zones-data`
- `bash scripts/dev/quality-check.sh --scope mobile --only bundle` -- **importante**:
  es el primer import de `@oneimpact/shared` que entra al bundle de la app de
  verdad. Ya se comprobo en el analisis que Metro lo resuelve, pero la fase lo
  deja verificado en el arbol real.

**Riesgos**: `require()` dinamico no funciona en Metro; por eso el mapa es
literal. Si el seed sumara una clave sin asset, `assetFor` lo hace ruidoso en
vez de renderizar vacio.

CHECKPOINT. **Commit sugerido**: `feat(mobile): zones data layer over the shared seed`

## Fase 3 -- ZoneRow + AdvanceCard + ProgressBar

**Objetivo**: los tres componentes que el spec pide como reutilizables (los usa
tambien el item 08).
**Area**: mobile
**Archivos**: `src/components/ui/{ZoneRow,AdvanceCard,ProgressBar}.tsx`, `src/components/ui/index.ts` (barrel), `__tests__/ZoneRow.test.tsx`, `__tests__/ProgressBar.test.tsx`
**Spec**: `componentes.md` -> ZoneRow, AdvanceCard; `design-tokens.md` (radios, sombras)
**Shared**: no. **Prisma**: no. **Eventos**: no.
**Acciones**:

1. `ZoneRow`: `h-52 w-full rounded-3xl overflow-hidden`, `expo-image` cover,
   `LinearGradient` `from-black/80 via-black/30 to-transparent` (usar
   `overlay.*`), contenido `absolute inset-0 p-5 flex-row items-end justify-between gap-4`:
   izquierda H2 `text-3xl font-bold text-white` + `text-sm text-white/90`
   (`numberOfLines={3}`), derecha `Chip variant="zones"`. `Pressable` con
   `accessibilityRole="button"`, `accessibilityLabel={name}`, `onPress(slug)`.
2. `AdvanceCard`: `w-[220px]`, imagen `h-48 rounded-2xl mb-3`, H3
   `text-accent font-bold text-sm`, fecha `text-white/50 text-xs` (`. 2026`),
   descripcion `text-white/80 text-xs leading-relaxed` (`numberOfLines={4}`).
   Presentacional puro (sin `onPress` en esta pantalla).
3. `ProgressBar`: track `bg-cream` / fill `bg-dark-green`, alto 8,
   `rounded-full`; prop `value` **clampeada a 0..100**;
   `accessibilityRole="progressbar"` con `accessibilityValue={{ now, min: 0, max: 100 }}`.
4. Exportarlos en el barrel `src/components/ui/index.ts` (componente + tipos,
   como los existentes).
5. Tests: `ZoneRow` dispara `onPress` con el slug y renderiza nombre y
   descripcion; `ProgressBar` clampea 150 -> 100 y -20 -> 0 y expone el valor
   accesible. Mockear inline `expo-image`, `expo-linear-gradient` y
   `lucide-react-native` como en `__tests__/Testimonials.test.tsx:5-25` (no hay
   setup file de jest y no se puede tocar `package.json`).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter ZoneRow`
  y `--filter ProgressBar`

**Riesgos**: `AdvanceCard` no lleva test propio por ser presentacional puro
(regla 20: "ninguno para secciones puramente presentacionales"); queda cubierto
indirectamente por el render de la pantalla en la fase 4.

CHECKPOINT. **Commit sugerido**: `feat(mobile): zone row, advance card and progress bar`

## Fase 4 -- Pantalla Zonas

**Objetivo**: las 4 secciones del spec, reemplazando el placeholder.
**Area**: mobile
**Archivos**: `app/(tabs)/zones.tsx:1` (reemplaza el placeholder), `src/features/zones/{ZonesHero,ZonesList,AdvancesCarousel}.tsx`, `src/features/zones/index.ts`, `src/components/icons/TopoLines.tsx`
**Spec**: `pantallas/zonas.md` secciones 1, 2, 3 y 4 (tabla de orden y fondos)
**Shared**: no (consume `src/data/zones.ts`). **Prisma**: no. **Eventos**: no.
**Acciones**:

1. `TopoLines.tsx`: los 10 `path` del SVG del vault dibujados con
   `react-native-svg` (`Svg` con `viewBox="0 0 900 400"`,
   `preserveAspectRatio="xMidYMid slice"`, `opacity={0.12}`), `stroke` =
   `colors.topoLine` (token de la fase 1), `strokeWidth={1.2}`, `fill="none"`.
   Absoluto, `pointerEvents="none"`, `accessible={false}`.
2. `ZonesHero`: `bg-cream pt-24 pb-14 px-5 overflow-hidden` (el `pt-24` deja
   sitio al header flotante), `TopoLines` de fondo, H1
   `text-4xl font-bold text-gray-900 leading-tight mb-4`, parrafo
   `text-base text-gray-600 leading-relaxed max-w-lg`. Copy exacto del vault.
3. `ZonesList`: `bg-cream px-5 pb-14`, columna `gap-4` con un `ZoneRow` por
   zona (las 5), `onPress` -> `router.push(\`/zone/${slug}\`)`.
4. `AdvancesCarousel`: `bg-forest py-14`, header `px-5` con
   `SectionHeader tone="dark" weight="bold"` (H2 `text-3xl`), `FlatList`
   horizontal de `AdvanceCard` con `contentContainerStyle` `paddingHorizontal: 20`
   y `gap: 16`, `snapToInterval = 220 + 16`, `decelerationRate="fast"`,
   `showsHorizontalScrollIndicator={false}`; `Dots` `mt-6` con el indice activo
   via `onViewableItemsChanged` (`viewabilityConfig` con
   `itemVisiblePercentThreshold: 60`, definido **fuera** del render o con
   `useRef` para no romper la regla de FlatList).
5. `app/(tabs)/zones.tsx`: pantalla fina -- `Screen statusBar="dark" bg="bg-cream"`
   - `Header logo="black" onMenuPress` + `FullScreenMenu` (estado `menuOpen`)
   - Hero + Lista + Avances + `Footer`.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit`
- `bash scripts/dev/quality-check.sh --scope mobile --only bundle` (SVG inline
  en el bundle)
- Pendiente manual (Expo Go): lineas topograficas visibles al 12 % y recortadas
  (`slice`) sin deformar; header negro legible sobre crema; snap del carrusel;
  dots siguiendo la tarjeta visible; peso 700 en titulos (no 900).

**Riesgos**: `onViewableItemsChanged` no admite cambiar de identidad entre
renders (React Native lanza si se le pasa una funcion nueva); usar `useRef`.
El `pt-24` del hero depende del alto real del header: si en dispositivo queda
corto, se ajusta con `useSafeAreaInsets`, no con un numero magico mayor.

CHECKPOINT. **Commit sugerido**: `feat(mobile): zones screen`

## Fase 5 -- Detalle de zona + estado vacio + no encontrada

**Objetivo**: `/zone/[slug]` con hero, descripcion, avances de la zona (o
estado vacio) y CTA; y el caso de slug invalido.
**Area**: mobile
**Archivos**: `app/zone/[slug].tsx` (nuevo; borra `app/zone/.gitkeep`), `src/features/zones/{ZoneDetailHero,ZoneAdvances,ZoneEmptyAdvances}.tsx`, `__tests__/zone-detail.test.tsx`
**Spec**: `pantallas/zonas.md` seccion "Detalle de zona `/zonas/[slug]`" + el bloque de estado vacio del spec del roadmap (`.claude/roadmap/specs/03-mobile-zones-screens.md`, decision del 2026-08-22)
**Shared**: no. **Prisma**: no. **Eventos**: no.
**Acciones**:

1. `ZoneDetailHero`: imagen de la zona a sangre `h-[55vh]`
   (`useWindowDimensions`, 0.55 del alto), `LinearGradient`, titulo
   `font-black text-4xl text-white` abajo, boton back circular glass
   (`bg-white/20` + `BlurView` + `ChevronLeft` de lucide) con
   `paddingTop: insets.top`, `accessibilityLabel="Volver"`, `router.back()`.
2. Bloque crema: `bg-cream px-5 py-14`, descripcion de la zona
   `text-base text-gray-700 leading-relaxed`.
3. `ZoneAdvances`: `bg-forest px-5 py-14`, H2 `text-3xl font-bold text-white`
   "Avances en esta zona" + lista vertical (o carrusel) de `AdvanceCard`
   filtrados con `advancesByZone(slug)`.
4. `ZoneEmptyAdvances`: mismo fondo forest; titulo
   `text-white font-bold text-xl` "Aun no hay avances publicados" + parrafo
   `text-white/70 text-sm` "Esta zona esta en preparacion. Suscribete para
   enterarte cuando arranquen los primeros proyectos." Copy exacto del spec.
5. CTA accent "Quiero aportar" -> `/subscription`, **presente en los dos casos**
   (con avances y sin ellos).
6. Slug invalido: pantalla "Zona no encontrada" sobre `bg-cream` con boton back
   (no un crash ni una pantalla en blanco).
7. Test RNTL `zone-detail.test.tsx` (mockeando `expo-router` con
   `useLocalSearchParams`): con `slug=amazonia` renderiza los 2 avances; con
   `slug=patagonia` renderiza el estado vacio **y** el CTA sigue visible; con
   `slug=noexiste` renderiza "Zona no encontrada". Este es el criterio de
   aceptacion que el spec agrego el 2026-08-22.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter zone-detail`
- Pendiente manual (Expo Go): navegacion tab Zonas -> "Ver mas" -> detalle ->
  back; **deep link** `npx uri-scheme open oneimpact://zone/amazonia --android`;
  safe area del boton back en el notch; el detalle de `patagonia` mostrando el
  estado vacio.

**Riesgos**: con `typedRoutes: true`, la ruta recien creada cambia los tipos
generados en `.expo/types`; si `tsc` se queja de `router.push`, correr
`npx expo customize tsconfig.json` no es la solucion -- basta con levantar
Metro una vez para regenerar los tipos, o tipar el push como en el resto del
repo.

CHECKPOINT. **Commit sugerido**: `feat(mobile): zone detail screen`

## Fase 6 -- Cierre

**Objetivo**: bateria completa y registro de la sesion.
**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` (Postgres arriba para el e2e
   de la API). Nota conocida y **preexistente**: `apps/api lint` esta rojo
   desde el scaffold (`02d45d4`, 4 errores de prettier + 1
   `no-unsafe-member-access` en `test/app.e2e-spec.ts:27`). Ninguna fase de este
   plan toca esos archivos: si es lo unico rojo, se reporta como preexistente y
   no bloquea.
2. Checklist seccion por seccion contra `pantallas/zonas.md` en el resumen,
   marcando `[OK]` / `SIN CONFIRMAR` (lo visual va como pendiente manual).
3. `/ai-log` -> `docs: log ai session mobile-zones-screens`.

**Verificacion**: `--scope all` con conteos; `git log --oneline <base>..HEAD`
con 5 commits de codigo + 1 de docs.

CHECKPOINT final. Si se ejecuto con `/run-plan-worktree`, cerrar con
`/merge-plan`; el push y el PR son del usuario.
