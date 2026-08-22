# Spec 04 -- mobile-subscription-screen

**Track**: mobile · **Depende de**: nada nuevo (`PLANS` y `monthlyPriceFor` ya estan en shared) · **Ola**: 1 (paralelo con 02 y 03)
**Rama**: `feat/mobile-subscription-screen` · **Modo**: `/run-plan-worktree`
**Write-scope**: `apps/mobile/app/(tabs)/subscription.tsx`, `apps/mobile/src/features/subscription/**`, `apps/mobile/src/data/subscription.ts`, `apps/mobile/src/components/ui/{BillingToggle,PlanSelector,BenefitItem}.tsx`, `apps/mobile/src/assets/svg/benefit-*.svg`

## Objetivo

Pantalla **Suscripcion** fiel al spec: collage, toggle Mensual/Anual, selector
de 3 planes con precio reactivo, CTA y lista de 6 beneficios con sus iconos
originales. Es la puerta al flujo de registro (09): el CTA navega a
`/(auth)/register?plan=<id>&billing=<b>` (ruta que 09 crea; mientras, muestra
un `Alert` "Proximamente").

## Spec del vault
`02-Analisis-Visual/pantallas/suscripcion.md` · `svg/beneficio-*.svg` (6) · `contenido-textos.json` (suscripcion).

## Alcance
1. Collage: fila 3 cuadrados + fila `hero-main` (flex 3, `object-top`) / `hero-secondary` (flex 2), sin gaps ni radios. `StatusBar light`, Header logo blanco.
2. Seccion crema: H1 `text-3xl font-bold`, p gray-500.
3. `BillingToggle` (`bg-white rounded-full p-1`, activo `bg-dark-green text-white`), estado `billing`.
4. `PlanSelector`: contenedor `bg-white/70 rounded-3xl p-2`, 3 columnas; seleccionado `bg-white shadow-md` + check `bg-dark-green` 20px; precio con `monthlyPriceFor`; nota `text-[9px]` "facturado anualmente" en anual. Default `estandar`. Haptic `impactLight`.
5. CTA dark fullWidth `py-4 text-base font-semibold` "Comenzar mi travesia" + disclaimer.
6. "Lo que incluye tu suscripcion": 6 `BenefitItem` (icono 40px desde los SVG del vault copiados a `src/assets/svg`, `SvgXml` o transformer -- decidir en el plan; default `react-native-svg` con `SvgXml` leyendo el string).
7. Footer.

## Fuera de alcance
Registro, pago, API.

## Criterios de aceptacion
- Cambiar a Anual muestra $4/$8/$12 y la nota; volver a Mensual $5/$10/$15.
- Test RNTL `PlanSelector`: selecciona plan y refleja precio segun billing; `BillingToggle` alterna.
- Checklist del spec en `[OK]`.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter subscription
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual: collage sin bandas, haptic, sombra del plan seleccionado.

## Commits sugeridos
`feat(mobile): subscription screen with plan selector` · `feat(mobile): subscription benefits list`
