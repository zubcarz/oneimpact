# Convenciones de `apps/mobile` (Expo + expo-router + NativeWind)

## Fuente de diseno

Cada pantalla tiene un spec en el vault:
`C:\machine\Notes\oneimpact\02-Analisis-Visual\pantallas\*.md` (inicio, zonas,
suscripcion, pantallas-nuevas). Los tokens en `design-tokens.md`, los componentes
en `componentes.md`. **Se implementa el spec, no una interpretacion libre.**
Cuando el spec diga `text-white/80 font-black text-4xl`, eso es lo que va.

## Estructura

```
app/                 solo rutas (expo-router). Una pantalla = un archivo fino que
                     compone secciones de src/features y usa hooks de src/api
  (tabs)/            publico: index (Inicio), zones, subscription
  (auth)/            register, payment, welcome, login
  (app)/             protegido: dashboard, profile, admin
  zone/[slug]  projects/index  projects/[id]  about
src/components/ui    Button, Chip, SectionHeader, GlassCard, Dots, PlayButton, ProgressBar
src/components/layout Header, FullScreenMenu, Footer, Screen
src/features/<f>     secciones presentacionales de cada feature (reciben props)
src/data             copy estatico de marketing (hero, testimonios, beneficios)
src/api              hooks TanStack Query sobre packages/api-client + msw/handlers
src/auth             AuthProvider, useAuth, useRequireRole, secure-store
src/theme            tokens re-exportados, tipografia (Geist)
```

## Reglas duras

- **NativeWind primero.** Clases Tailwind; `StyleSheet` solo para lo que
  NativeWind no cubre (sombras complejas, `transform` animados). Orden de
  clases: layout -> spacing -> color -> tipografia -> efectos.
- **Colores solo por token** (`bg-accent`, `bg-forest`, `text-gray-900`). Un hex
  suelto en un componente es un hallazgo. Los tokens estan en
  `tailwind.config.js` via `@oneimpact/ui-tokens`.
- **Tipografia Geist** cargada en `app/_layout.tsx` con `useFonts`; nada se
  renderiza antes de `fontsLoaded`. Home usa peso 900 (`font-black`) en
  titulos; Zonas y Suscripcion usan 700 (`font-bold`). Respetar la diferencia.
- **Imagenes con `expo-image`** (`contentFit="cover"`), nunca `Image` de RN.
  Assets locales con `require()` desde `src/assets/images`.
- **Video con `expo-video`**, muted + loop en el hero, poster `hero-bg.jpg`.
- **Gradientes con `expo-linear-gradient`** replicando los stops del spec
  (`from-black/80 via-transparent`).
- **Carruseles**: `FlatList` horizontal con `snapToInterval` y `decelerationRate="fast"`;
  dots con `onViewableItemsChanged`. Sin librerias de carrusel.
- **Safe areas** con `react-native-safe-area-context`; header absoluto con
  `paddingTop: insets.top`. StatusBar `light` sobre hero oscuro, `dark` sobre
  crema.
- **Areas tactiles >=44pt**, `accessibilityRole` y `accessibilityLabel` en todo
  lo tocable. Haptics (`expo-haptics`) en selecciones de plan/testimonio.
- **Datos remotos con TanStack Query** en `src/api/hooks`. Las secciones son
  presentacionales: reciben props, no llaman hooks de red.
- **MSW** (`msw/native`) con el seed de la API cuando `EXPO_PUBLIC_API_URL` esta
  vacio: la demo nunca depende de red.
- **Sesion** en `expo-secure-store`, nunca AsyncStorage. El rol viene del JWT y
  se revalida con `GET /me` al abrir.
- **Pago simulado**: Luhn y deteccion de brand en cliente
  (`packages/shared`); al servidor solo `{brand,last4,holder,expMonth,expYear}`.
  El PAN no se guarda en estado global ni se loguea.

## Tests

Jest 29 + `@testing-library/react-native`. Se testea comportamiento con estado
(`PlanSelector`, `BillingToggle`, `CardForm`, `useAuth`), no snapshots de
pantallas completas. Un test por componente con logica; ninguno para secciones
puramente presentacionales.

## Verificacion rapida

```
pnpm --filter @oneimpact/mobile typecheck
pnpm --filter @oneimpact/mobile test -- <ruta>
npx expo export --platform android --output-dir <tmp>   # valida que Metro bundlea
```
La verificacion en dispositivo (Expo Go) es **manual y se anota como pendiente**.
