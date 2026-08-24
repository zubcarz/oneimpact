# ADR-002: Primitivos propios de UI en apps/admin en vez de shadcn/ui

Fecha: 2026-08-23 · Estado: aceptada

## Contexto
La regla `.claude/rules/40-admin-conventions.md` pide componentes de `shadcn/ui`
"generados con el CLI, no copiados a mano". El spec 11 del roadmap pide, para el
mismo panel, "paleta del sistema (no shadcn por defecto)": el admin tiene que
verse como One Impact, no como un panel generico.

El admin ya tiene los tokens del producto en `apps/admin/src/app/globals.css`,
dentro de un bloque `@theme` de Tailwind 4 espejo de `packages/ui-tokens`
(accent, forest, cream, ink, slate, highlight y la fuente Geist). El item 11
necesita boton, input, label, error de campo, tabla, badge, select nativo,
textarea y barra de progreso. No necesita ningun overlay.

## Decision
Escribir primitivos propios en `apps/admin/src/components/ui/`, con las clases
Tailwind de los tokens ya declarados, y **cero dependencias nuevas**. La fase 1
entrega `Button`, `Input`, `Label` y `FieldError`; la fase 2 agrega `Table`,
`Badge`, `ProgressBar`, `Select` y `EmptyState`.

Es una **desviacion consciente** de `.claude/rules/40-admin-conventions.md`, no
un descuido: queda registrada aqui y su punto de revision es el item 13 del
roadmap.

## Alternativas consideradas
`npx shadcn@latest init` + `add button input label table select badge textarea`.
Se descarto por cuatro motivos concretos:

- `shadcn init` escribe su propia capa de variables de tema (paleta `oklch`) en
  `globals.css`, que convive mal con el bloque `@theme` que ya tiene los tokens
  del producto.
- Igual habria que re-skinear cada componente (pildoras `rounded-full`, forest,
  crema) para cumplir el invariante del spec: se termina en el mismo lugar con
  mas trabajo y mas superficie.
- Exige red durante la ejecucion del plan, y la compatibilidad del CLI con
  Tailwind 4 + Next 16 no esta verificada en esta maquina.
- En el alcance del item 11 no hay dialog, popover ni combobox, que es donde
  Radix aporta accesibilidad dificil de replicar a mano.

## Consecuencias
- La accesibilidad se sostiene a mano: foco visible, `aria-invalid` /
  `aria-describedby` y `role="alert"` en los errores. Ya esta hecho en los
  primitivos de la fase 1.
- El panel arranca sin dependencias de UI y sin conflicto de paleta.
- **Punto de revision (item 13):** si aparece un dialog, un popover o un
  combobox, se reevalua esta decision y probablemente entre Radix (o shadcn)
  para esos componentes concretos, sin migrar los primitivos ya escritos.
