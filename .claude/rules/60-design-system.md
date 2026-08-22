# Sistema de diseno One Impact (resumen operativo)

Fuente completa: vault `02-Analisis-Visual/` (design-tokens.md,
tipografia-y-estilo.md, componentes.md). Esto es lo minimo que hay que tener en
la cabeza al escribir UI.

## Tokens (packages/ui-tokens)

| Token | Hex | Uso |
|---|---|---|
| accent | #c8d400 | CTAs, chips "Ver mas", 35K, menu full-screen |
| accent-dark | #a8b200 | pressed |
| accent-light | #dbe64c | fondo seccion zonas (Home) |
| forest | #0f1a0a | overlay stats, fondo avances, sidebar admin |
| dark-green | #243b1a | toggle activo, check de plan, iconos beneficios |
| ink | #1E1E1E | texto/boton sobre lima |
| slate | #2d3a42 | footer |
| cream | #f0ece4 | fondo Zonas y Suscripcion |
| cream-warm | #FFF6EA | fondo testimonios |
| cream-card | #FFF1DA | marco tarjeta testimonio |
| highlight | #FFE97A | anillo avatar activo |
| gray-900..200 | Tailwind | texto y neutros |

## Forma

- Todo boton es **pildora** (`rounded-full`). Cards `rounded-2xl` (16) o
  `rounded-3xl` (24). Nada cuadrado.
- Padding de pagina: 16 (Home) / 20 (Zonas, Suscripcion). Secciones `py-16`/`py-14`.
- Fotos a sangre con gradiente negro desde abajo; texto blanco encima.
- Glass: `bg-white/20` + blur + `border-white/50`.
- Ritmo de fondos en Home, en este orden: oscuro -> blanco -> lima -> crema
  calido -> gris claro -> forest -> slate.

## Tipografia (Geist)

- Home: titulos `font-black` (900). Zonas/Suscripcion: `font-bold` (700).
- H1 hero 36/900 blanco; H2 seccion 30; card zona 24/900; stat 72/900 accent;
  cuerpo 14-16; boton 14/700; kicker 12/700 uppercase tracking-widest.

## Variantes de Button

`accent` (lima, texto gray-900) · `white` · `dark` (gray-900, texto blanco) ·
`ink` (#1E1E1E con borde) · modificador `fullWidth`. Texto siempre `font-bold
text-sm` salvo CTAs grandes (`text-base font-semibold py-4`).

## Iconos

`lucide` (stroke 2): Menu, X, ArrowRight, Play, Check, MapPin, Instagram.
Iconos de beneficios: los 6 SVG custom del vault (`02-Analisis-Visual/svg/`).

## Pantallas nuevas (no existen en la web)

Projects, project detail, about, register, payment, welcome, dashboard, profile,
admin mobile, login: su spec esta en `pantallas-nuevas.md`. Se disenan **dentro**
de este sistema (misma paleta, pildoras, fotos con gradiente). Nada de UI
generica de "app de banco".
