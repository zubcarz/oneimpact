---
description: Implementa una pantalla o seccion de apps/mobile a partir de su spec en el vault (02-Analisis-Visual/pantallas). Genera ruta fina en app/, secciones presentacionales en src/features y datos en src/data, con NativeWind y tokens.
argument-hint: <pantalla: inicio|zonas|suscripcion|projects|project-detail|about|register|payment|welcome|dashboard|profile|login> [seccion]
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(pnpm --filter @oneimpact/mobile *), Bash(bash scripts/dev/quality-check.sh *), Bash(npx expo export *)
---

# /gen-screen -- pantalla mobile desde el spec

Genera codigo **fiel al spec del vault**, no una interpretacion. Antes de
escribir: carga `oneimpact-context`, lee `.claude/rules/20-mobile-conventions.md`
y `60-design-system.md`.

## Paso 1 -- Leer el spec

- `$ARGUMENTS[0]` = pantalla. Mapea al spec:
  - `inicio` -> `C:\machine\Notes\oneimpact\02-Analisis-Visual\pantallas\inicio.md`
  - `zonas` -> `zonas.md` · `suscripcion` -> `suscripcion.md`
  - `projects|project-detail|about|register|payment|welcome|dashboard|profile|login`
    -> la seccion correspondiente de `pantallas-nuevas.md`
- Lee tambien `componentes.md` (inventario web -> RN) y, si la pantalla usa copy
  de la web, `contenido-textos.json`.
- `$ARGUMENTS[1]` opcional = una sola seccion (ej. `inicio hero`). Si se da,
  genera solo esa seccion y su integracion en la pantalla.

Si el spec tiene un hueco para algo que necesitas (un texto, un asset), **pregunta
una vez**; no inventes copy.

## Paso 2 -- Inventario de lo existente

`Glob` en `src/components/ui`, `src/components/layout`, `src/features/<feature>`,
`src/data`. Reutiliza lo que exista (Button, Chip, SectionHeader, GlassCard,
Dots, PlayButton, Header, Footer). Si falta un componente base que el spec usa,
crealo en `src/components/ui` con la API minima que la pantalla necesita, y
dejalo listo para reutilizar.

## Paso 3 -- Generar

Mapa de rutas (expo-router):
`inicio -> app/(tabs)/index.tsx` · `zonas -> app/(tabs)/zones.tsx` ·
`suscripcion -> app/(tabs)/subscription.tsx` · `projects -> app/projects/index.tsx` ·
`project-detail -> app/projects/[id].tsx` · `about -> app/about.tsx` ·
`register|payment|welcome|login -> app/(auth)/<name>.tsx` ·
`dashboard|profile -> app/(app)/<name>.tsx`.

Por cada seccion del spec:
1. `src/features/<feature>/<SectionName>.tsx` -- presentacional, recibe props,
   clases NativeWind copiadas del spec, tokens, `expo-image`, `LinearGradient`
   con los stops del spec, `accessibilityRole`. Sin hooks de red.
2. Copy estatico en `src/data/<feature>.ts` (tipado). Copy dinamico: hook en
   `src/api/hooks/use<Resource>.ts` (TanStack Query sobre `@oneimpact/api-client`)
   + handler MSW en `src/api/msw/handlers.ts` usando el seed.
3. La pantalla en `app/` compone las secciones en el **orden del spec**, envuelta
   en `Screen` (ScrollView + safe area) con la `StatusBar` que el spec indica.
4. Estado local solo donde el spec lo pide (plan seleccionado, testimonio
   activo, indice de carrusel). Haptics en selecciones.
5. Test RNTL **solo** para componentes con logica (ej. `PlanSelector`).

## Paso 4 -- Verificar

```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit
npx expo export --platform android --output-dir "$TMPDIR/oneimpact-export"
```

## Paso 5 -- Reportar

- Archivos creados/modificados.
- Checklist de fidelidad: por cada seccion del spec, `[OK]` implementada o
  `[PENDIENTE]` con motivo.
- Verificacion manual pendiente en Expo Go (lista concreta: video autoplay,
  snap del carrusel, blur, etc.).
- Commit sugerido: `feat(mobile): <pantalla> screen` (no commitees).
