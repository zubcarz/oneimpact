# Spec 08 -- mobile-projects-and-about

**Track**: mobile · **Depende de**: 07 · **Ola**: 3 (paralelo con 06 y 11)
**Rama**: `feat/mobile-projects-and-about` · **Modo**: `/run-plan-worktree`
**Write-scope**: `apps/mobile/app/projects/**`, `apps/mobile/app/about.tsx`, `apps/mobile/src/features/projects/**`, `apps/mobile/src/features/about/**`, `apps/mobile/src/data/about.ts`, `apps/mobile/src/components/ui/{ProjectCard,UpdateTimeline,FollowButton,FilterChips}.tsx`

## Objetivo

Completar las dos rutas que la web devuelve 403: **Proyectos** (listado +
detalle con avances y boton Seguir) y **Quienes somos**. Con esto la app
publica queda al 100 %.

## Spec del vault
`pantallas/pantallas-nuevas.md` secciones Proyectos, Detalle de proyecto, Quienes somos. `60-design-system.md`.

## Alcance

### Proyectos (`app/projects/index.tsx`)
- Hero crema con SVG topografico (reutilizar el de Zonas), H1 "Proyectos en marcha" + parrafo del spec.
- `FilterChips` por zona (scroll horizontal; activa `bg-gray-900 text-white`) + filtro de estado opcional.
- Lista de `ProjectCard` (`rounded-3xl bg-white p-3 shadow-sm`, imagen `h-40`, chip de zona `bg-accent`, titulo `font-bold text-lg`, resumen, `ProgressBar` + `%`, badge de estado). `useProjects({zone,status})`, loading skeleton, empty "Aun no hay proyectos aqui".
- Entrada en `FullScreenMenu` y Footer (ya existen los links; verificar que apunten a `/projects`).

### Detalle (`app/projects/[id].tsx`)
- Hero 55vh + back glass + chip zona + titulo `font-black text-3xl`.
- Bloque blanco: `ProgressBar` grande, "Avance verificado NN %", coordenadas con `MapPin` (`Linking.openURL` a maps), fecha objetivo.
- Seccion forest "Avances": `UpdateTimeline` (linea `bg-accent/40`, puntos lima, fecha/titulo/texto/imagen opcional).
- `FollowButton` sticky (`useFollowProject`): sin sesion -> `router.push('/(auth)/login?returnTo=...')` (09 crea login; mientras, Alert "Inicia sesion para seguir"). Haptic.

### Quienes somos (`app/about.tsx`)
- Hero oscuro `stats-bg.jpg` + overlay forest/80, H1 `font-black` "Infraestructura abierta para el impacto colectivo".
- 3 bloques (Que hacemos / Como verificamos / Quien esta detras) con icono 40px estilo beneficios; copy propio en `src/data/about.ts` (tono del sitio, 2-3 lineas cada uno).
- Seccion lima con `AlliesSection` reutilizada + CTA "Quiero hacer parte".

## Fuera de alcance
Login real (09). Dashboard (10).

## Criterios de aceptacion
- Filtrar por zona cambia el listado (MSW y API).
- Detalle muestra updates del seed ordenados desc; follow como guest redirige/alerta; como authed (token de MSW) alterna estado.
- Tests: `FilterChips` (selecciona), `FollowButton` (estado following), `UpdateTimeline` (renderiza N items).

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter "projects|about"
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual: sticky del FollowButton sobre el scroll, apertura de mapas.

## Commits sugeridos
`feat(mobile): projects list with zone filters` · `feat(mobile): project detail with updates and follow` · `feat(mobile): about screen`
