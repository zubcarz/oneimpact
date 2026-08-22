# Spec 03 -- mobile-zones-screens

**Track**: mobile · **Depende de**: 01 (tipos `Zone`, `seed-data`) · **Ola**: 1 (paralelo con 02 y 04)
**Rama**: `feat/mobile-zones-screens` · **Modo**: `/run-plan-worktree`
**Write-scope**: `apps/mobile/app/(tabs)/zones.tsx`, `apps/mobile/app/zone/**`, `apps/mobile/src/features/zones/**`, `apps/mobile/src/data/zones.ts`, `apps/mobile/src/components/ui/{ZoneRow,AdvanceCard,ProgressBar}.tsx`

## Objetivo

Pantalla **Zonas** fiel al spec y **detalle de zona** (pantalla que la web no
tiene, 403). Datos desde `@oneimpact/shared/seed-data` por ahora (07 los
cambia a hooks con la misma forma).

## Spec del vault
`02-Analisis-Visual/pantallas/zonas.md` (completo) · `svg/zonas-hero-lineas.svg` · `componentes.md` (ZoneRow, AdvanceCard, Dots).

## Alcance

### Zonas (`app/(tabs)/zones.tsx`)
1. Hero crema con SVG topografico (`react-native-svg` ya instalado; el path esta en el vault), H1 `font-bold text-4xl`, parrafo. `StatusBar dark`, Header con `logo="black"`.
2. Lista vertical de **5** `ZoneRow` (`h-52 rounded-3xl`, gradiente `black/80 -> black/30 -> transparent`, titulo `text-3xl font-bold`, descripcion `text-sm white/90`, Chip "Ver mas"). Mejora documentada: 5 zonas (la web muestra 3).
3. Seccion forest "Avances desde el territorio": `FlatList` horizontal `w-[220px]` con snap + `Dots`.
4. Footer.

### Detalle (`app/zone/[slug].tsx`)
- Hero imagen 55vh con gradiente, boton back glass (circulo `bg-white/20` + blur, `ChevronLeft`), titulo `font-black text-4xl` blanco.
- Bloque crema: descripcion larga.
- Bloque forest "Avances en esta zona": `AdvanceCard` filtrados por `zone` (mapa slug <-> zona del vault).
- **Zona sin proyectos**: `patagonia` no tiene ninguno (el vault define 5 avances y ninguno cae ahi; verificado contra la DB el 2026-08-22). Decision tomada: **no se inventa un proyecto**; el bloque "Avances en esta zona" se reemplaza por un estado vacio dentro del mismo fondo forest: titulo `text-white font-bold text-xl` "Aun no hay avances publicados" + parrafo `text-white/70 text-sm` "Esta zona esta en preparacion. Suscribete para enterarte cuando arranquen los primeros proyectos." + el mismo CTA accent "Quiero aportar". Nunca una seccion vacia ni un spinner infinito.
- CTA accent "Quiero aportar" -> `/subscription`. Slug invalido -> pantalla "Zona no encontrada" con back.

### Componentes nuevos (reutilizables por 08)
- `ZoneRow`, `AdvanceCard`, `ProgressBar` (track `bg-cream`, fill `bg-dark-green`, 8px).

### Datos
- `src/data/zones.ts`: importa `SEED_ZONES` y `SEED_PROJECTS` de `@oneimpact/shared` (nombres reales tras ejecutar el item 01; no existe un `seedAdvances`: los "avances" son el primer `ProjectUpdate` de cada proyecto, y el proyecto trae `zoneSlug`). Expone `getZone(slug)`, `projectsByZone(slug)` y `advancesByZone(slug)` (mapea cada proyecto y su update a lo que consume `AdvanceCard`).
- Las imagenes llegan como **claves de asset** (`zones/amazonia.jpg`, `advances/guainia.jpg`), no como URLs: `src/data/zones.ts` mantiene el mapa clave -> `require()` de `src/assets/images/**`. Una clave sin asset es un error de datos, no un fallback silencioso.

## Fuera de alcance
Consumo de API real (07). Proyectos (08).

## Criterios de aceptacion
- Checklist seccion por seccion del spec en `[OK]`.
- Navegacion: tab Zonas -> "Ver mas" -> detalle -> back; deep link `oneimpact://zone/amazonia`.
- Test RNTL: `Dots` refleja el indice activo; `ZoneRow` dispara `onPress` con el slug; el detalle de `patagonia` renderiza el estado vacio de avances y sigue mostrando el CTA.
- `expo export` verde (SVG en bundle).

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter zones
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual (Expo Go): snap del carrusel de avances, SVG visible al 12 %, safe area del back.

## Commits sugeridos
`feat(mobile): zones screen` · `feat(mobile): zone detail screen`
