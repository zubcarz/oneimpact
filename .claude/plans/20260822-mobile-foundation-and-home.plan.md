# Plan -- Fundacion mobile + pantalla Inicio (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo A -- pantalla `inicio` del vault + componentes base que toda la app reutiliza
> **Base**: `02-Analisis-Visual/pantallas/inicio.md`, `componentes.md`, `design-tokens.md`, `tipografia-y-estilo.md`, `01-Tecnologia-Arquitectura/arquitectura-mobile.md`
> **Areas**: mobile (+ `packages/ui-tokens` solo lectura)
> **Contrato shared tocado**: no
> **Schema Prisma tocado**: no
> **Eventos**: ninguno
> **Zonas de riesgo**: config de fuentes (Geist) en `_layout.tsx`; `expo-video` en el hero (verificar con `expo export`)
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026) -- bloque "Sabado: UI base + Header + menu + Footer + Inicio"
> **Como ejecutar**: `/run-plan-guided` (default) | `/run-plan-autonomous` en rama `feat/mobile-home`

## Objetivo

Dejar la app con su sistema de diseno operativo (tokens, Geist, componentes
base, header, menu full-screen, footer) y la pantalla **Inicio** completa y fiel
al spec (7 secciones), con el carrusel de zonas y los testimonios interactivos.
Es la pantalla que mas se ve en el GIF de entrega.

## Contexto y hallazgos del analisis

- `apps/mobile/app/(tabs)/index.tsx:1` es un placeholder. `app/_layout.tsx:1`
  no carga fuentes ni `QueryClientProvider`.
- `apps/mobile/tailwind.config.js:1` ya inyecta `tailwindColors` de
  `@oneimpact/ui-tokens` (accent, forest, dark-green, ink, slate, cream,
  highlight). Faltan `fontFamily` para los pesos de Geist.
- Assets ya en `apps/mobile/src/assets/images/**` y `videos/one-impact-intro.mp4`
  (39 MB; el video pesa la mayor parte). `hero-bg.jpg` sirve de poster.
- Dependencias instaladas: expo-image, expo-video, expo-linear-gradient,
  expo-blur, expo-haptics, reanimated 4 + worklets, lucide-react-native,
  @expo-google-fonts/geist. No hace falta `pnpm add`.
- El spec de Inicio define 7 secciones con fondos en orden: hero (video) ->
  blanco -> lima `#dbe64c` -> crema `#FFF6EA` -> `#f5f5f5` -> foto+forest/80 ->
  slate. Copy exacto en `contenido-textos.json` (index[1..4]).
- Testimonios: 3 items con `id`, `name`, `role`, `quote`; estado `activeIndex`.
- Nav items (para Header/menu): Inicio `/`, Zonas One Impact `/zones`, Como
  aportar `/subscription`, Quienes somos `/about`; CTA "Unete a One Impact".

## Decisiones pendientes (bloqueantes)

(ninguna) -- Decisiones tomadas: el boton Play de testimonios es decorativo
(la web no tiene audio); el contador 35K se anima al montar (mejora movil
documentada en el spec).

## Principios

Aditivo; verde por fase; el spec manda; tokens, nunca hex; secciones
presentacionales sin hooks de red; copy en espanol; sin supresiones.

## Mapa de fases

| Fase | Nombre | Area | Impacto | Shared | Prisma | Commit sugerido |
| ---- | ------ | ---- | ------- | ------ | ------ | --------------- |
| 0 | Pre-flight (solo lectura) | -- | Ninguno | No | No | _(sin commit)_ |
| 1 | Fuentes Geist + providers + Screen | mobile | Aditivo | No | No | `feat(mobile): load geist fonts and root providers` |
| 2 | Componentes UI base | mobile | Aditivo | No | No | `feat(mobile): base ui components` |
| 3 | Header + FullScreenMenu + Footer | mobile | Aditivo | No | No | `feat(mobile): header, full-screen menu and footer` |
| 4 | Inicio: datos + hero + video section | mobile | Aditivo | No | No | `feat(mobile): home hero and video sections` |
| 5 | Inicio: zonas carrusel + testimonios | mobile | Aditivo | No | No | `feat(mobile): home zones carousel and testimonials` |
| 6 | Inicio: aliados + stats + ensamblado + cierre | mobile | Aditivo | No | No | `feat(mobile): complete home screen` |

---

## Fase 0 -- Pre-flight

**Objetivo**: confirmar que el estado del repo es el que el plan asume.
**Acciones**:
1. `git status --short` limpio (o cambios conocidos).
2. `bash scripts/dev/quality-check.sh --scope mobile --only typecheck` en verde.
3. Verificar que existen `src/assets/images/hero-bg.jpg`, `zones/*.jpg`,
   `testimonials/*.jpg`, `allies/*.png`, `stats-bg.jpg`, `video-thumbnail.jpg`,
   `videos/one-impact-intro.mp4`, `logo_blanco.svg`, `logo_negro.svg`.

CHECKPOINT -- sin commit.

## Fase 1 -- Fuentes Geist + providers + Screen

**Objetivo**: que toda pantalla tenga Geist, safe areas, QueryClient y StatusBar.
**Area**: mobile
**Archivos**: `app/_layout.tsx`, `tailwind.config.js` (fontFamily), `src/theme/typography.ts`, `src/components/layout/Screen.tsx`
**Spec**: `tipografia-y-estilo.md` (pesos 400/500/600/700/900), `design-tokens.md` (tailwind.config propuesto)
**Acciones**:
1. `useFonts` con Geist_400Regular/500Medium/600SemiBold/700Bold/900Black;
   `SplashScreen.preventAutoHideAsync` hasta `fontsLoaded`.
2. `QueryClientProvider` + `SafeAreaProvider` + `GestureHandlerRootView` en el
   root layout.
3. `tailwind.config.js`: `fontFamily: { sans, medium, semibold, bold, black }`
   mapeando a los nombres de fuente; `src/theme/typography.ts` exporta los
   nombres.
4. `Screen` = `ScrollView` con `contentContainerStyle` y prop `statusBar:
   'light'|'dark'`, `bg` token.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck`
- `npx expo export --platform android --output-dir "$TMPDIR/oi"` (fuentes
  incluidas en el bundle)
- Pendiente manual: fuente visible en Expo Go.

CHECKPOINT. **Commit sugerido**: `feat(mobile): load geist fonts and root providers`

## Fase 2 -- Componentes UI base

**Objetivo**: Button (variants accent/white/dark/ink, fullWidth), Chip ("Ver mas"
con ArrowRight), SectionHeader (title/subtitle, variantes dark/center),
PlayButton (glass 64px), GlassCard, Dots, ImageCard (3:4 con gradiente).
**Area**: mobile
**Archivos**: `src/components/ui/{Button,Chip,SectionHeader,PlayButton,GlassCard,Dots,ImageCard}.tsx`, `src/components/ui/index.ts`, `__tests__/Button.test.tsx`
**Spec**: `componentes.md` seccion UI (clases exactas por variante)
**Acciones**:
1. Cada componente con NativeWind, `Pressable` con feedback de pressed
   (`opacity-90` / scale via Reanimated), `accessibilityRole="button"`.
2. Test RNTL de `Button`: renderiza label y dispara `onPress`; variante
   `accent` aplica clase esperada.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter Button`

CHECKPOINT. **Commit sugerido**: `feat(mobile): base ui components`

## Fase 3 -- Header + FullScreenMenu + Footer

**Objetivo**: navegacion visual fiel: header transparente absoluto con logo y
hamburguesa; menu lima full-screen con 4 links + CTA; footer slate.
**Area**: mobile
**Archivos**: `src/components/layout/{Header,FullScreenMenu,Footer}.tsx`, `src/data/nav.ts`, `src/assets/images/logo_*.svg` (via `react-native-svg` transformer en `metro.config.js` -- ver Riesgos)
**Spec**: `componentes.md` seccion Layout; `pantallas/inicio.md` seccion 7
**Acciones**:
1. `nav.ts` con items y CTA (copy exacto).
2. Header: `position absolute`, `paddingTop: insets.top`, prop `logo:
   'white'|'black'`.
3. FullScreenMenu: `Modal transparent` + Reanimated `FadeIn/FadeOut` 200ms,
   fondo `bg-accent`, links `text-2xl font-bold` con `ArrowRight`, CTA dark
   fullWidth.
4. Footer: logo, texto `white/50`, iconos Instagram/X, columnas MENU y
   CONTACTO, linea de copyright.

**Riesgos**: SVG del logo. Opcion A: `react-native-svg-transformer` en
`metro.config.js` (tocar config = verificar con `expo export`). Opcion B (mas
simple, elegida por default): exportar `logo_blanco.svg`/`logo_negro.svg` a PNG
@2x/@3x y usarlos con `expo-image`. El implementer aplica B; si el usuario
prefiere A, se hace en fase aparte.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit`
- Pendiente manual: abrir/cerrar menu en Expo Go, safe area en notch.

CHECKPOINT. **Commit sugerido**: `feat(mobile): header, full-screen menu and footer`

## Fase 4 -- Inicio: datos + hero + seccion video

**Objetivo**: secciones 1 y 2 del spec.
**Area**: mobile
**Archivos**: `src/data/home.ts`, `src/features/home/{HeroSection,VideoSection}.tsx`, `app/(tabs)/index.tsx` (ensamblado parcial)
**Spec**: `pantallas/inicio.md` #1 Hero, #2 Conoce que es One Impact
**Acciones**:
1. `home.ts` con hero, video, zones (3), testimonials (3), allies (3), stats --
   copy de `contenido-textos.json`.
2. HeroSection: alto `Dimensions.height`, `VideoView` (expo-video) muted loop
   cover con poster `hero-bg.jpg`, `LinearGradient` 3 stops (`black/60`,
   `black/20`, `black/70`), contenido `justify-end pb-16 px-4`, H1
   `font-black text-4xl text-white`, Button white "Explorar Zonas de Impacto"
   -> `/zones`.
3. VideoSection: fondo blanco, SectionHeader, miniatura 16:9 `rounded-2xl` con
   overlay `black/30` + PlayButton; al tocar reproduce inline; Button accent
   "Quiero hacer parte" -> `/subscription`.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck`
- `npx expo export --platform android` (expo-video en bundle)
- Pendiente manual: autoplay del video y poster en Expo Go.

CHECKPOINT. **Commit sugerido**: `feat(mobile): home hero and video sections`

## Fase 5 -- Inicio: carrusel de zonas + testimonios

**Objetivo**: secciones 3 y 4.
**Area**: mobile
**Archivos**: `src/features/home/{ZonesCarousel,Testimonials,TestimonialAvatars}.tsx`, `__tests__/Testimonials.test.tsx`
**Spec**: `pantallas/inicio.md` #3 y #4
**Acciones**:
1. ZonesCarousel: fondo `bg-accent-light`, H2 `text-ink font-black text-3xl`,
   `FlatList` horizontal `snapToInterval = 0.75 * width + 16`, ImageCard por
   zona con Chip "Ver mas" -> `/zone/[slug]`, Button ink "Explora todas las
   zonas" -> `/zones`.
2. Testimonials: fondo `bg-cream-warm`, blobs decorativos, marco
   `bg-cream-card rounded-3xl p-3` con sombra, foto 3:4 del activo +
   gradiente + PlayButton + GlassCard (nombre/rol), cita, fila de avatares
   (activo con anillo `highlight`), Button dark fullWidth "Conecta con la
   comunidad" -> `/zones`. Haptic `selectionAsync` al cambiar.
3. Test RNTL: al tocar el segundo avatar cambia nombre y cita.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter Testimonials`
- Pendiente manual: snap del carrusel, blur de la glass card.

CHECKPOINT. **Commit sugerido**: `feat(mobile): home zones carousel and testimonials`

## Fase 6 -- Inicio: aliados + stats + ensamblado + cierre

**Objetivo**: secciones 5, 6 y 7; pantalla completa; bateria final.
**Area**: mobile
**Archivos**: `src/features/home/{AlliesSection,StatsBanner}.tsx`, `app/(tabs)/index.tsx`
**Spec**: `pantallas/inicio.md` #5, #6, #7
**Acciones**:
1. AlliesSection: fondo `bg-neutral-100`, header centrado, 3 circulos blancos
   96px con logos `contentFit="contain"`.
2. StatsBanner: `stats-bg.jpg` cover + overlay `forest/80`, "Unete a mas de",
   `35K` `text-accent font-black text-7xl` con contador animado (Reanimated,
   0 -> 35000 en 1.2 s al montar), "agentes de cambio", Button accent "Quiero
   unirme" -> `/subscription`.
3. `index.tsx`: `Screen statusBar="light"` + Header(logo white) + 7 secciones en
   el orden del spec + Footer; estado del menu.
4. Cierre: `bash scripts/dev/quality-check.sh --scope all` y `/ai-log`.

**Verificacion**:
- `bash scripts/dev/quality-check.sh --scope all`
- Pendiente manual en Expo Go (Android fisico): scroll completo, ritmo de
  fondos, video, carrusel, testimonios, menu, contador.

CHECKPOINT. **Commit sugerido**: `feat(mobile): complete home screen`
