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

## Notas de ejecucion (2026-08-22)

Ejecutado en `feat/mobile-subscription-screen`. Desviaciones respecto de este spec:

1. **Los 6 iconos se transcriben, no se leen.** El spec dejaba la decision abierta
   y proponia `SvgXml` sobre el string del vault. Se transcribieron a componentes
   `react-native-svg` en `apps/mobile/src/components/icons/benefits/`, siguiendo el
   precedente de `src/components/icons/TopoLines.tsx`. Motivo: los `.svg` del vault
   traen `#243b1a` hardcodeado, y meterlo como string dejaria un hex de marca dentro
   de un componente, que es un hallazgo bloqueante del repo. Transcritos, el fondo usa
   `colors.darkGreen` y los trazos `colors.white`.
   **Consecuencia**: NO existe `apps/mobile/src/assets/svg/benefit-*.svg`, a diferencia
   de lo que dice el write-scope de arriba.
2. **Los tests no van colocados.** Van a `apps/mobile/__tests__/`, donde estan los
   demas. La config es `jest-expo` sin `jest.setup`.
3. **El haptic difiere del precedente.** Se implemento `impactAsync(ImpactFeedbackStyle.Light)`
   como pide este spec; el unico uso previo en el repo
   (`src/features/home/Testimonials.tsx:30`) usa `selectionAsync`. No se unifico:
   Testimonials esta fuera del alcance de este item.
4. **El precio se muestra como `$8/mes`**, no `$8` a secas. Lo pide el vault
   (`pantallas/suscripcion.md`, seccion 2: "`$` + precio + `/mes`") y es para lo que
   existe la etiqueta `perMonth` del copy.
5. **Sin animacion del precio** al alternar Mensual/Anual. El vault la sugiere
   (`LayoutAnimation`/Reanimated), este spec no la lista en el alcance y quedo fuera.
   Reanimated ya esta instalado: agregarla es aditivo.
