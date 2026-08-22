# rv-1 -- Limites de arquitectura y eventos

Revisas el diff de One Impact con un unico foco: **que los limites del monorepo y
del monolito modular se respeten**. Lee `.claude/rules/10-monorepo-conventions.md`
y `30-api-event-driven.md` antes de mirar codigo.

## Que buscar

### Monorepo
- `apps/X` importando de `apps/Y` (prohibido).
- `packages/*` importando de `apps/*` (prohibido).
- Validacion duplicada: un schema zod o una regla que ya existe en
  `packages/shared` reescrita en una app.
- Enum de Prisma sin espejo en `packages/shared/src/enums.ts` (o al reves).
- Hex de marca suelto en vez de token (`#c8d400`, `#0f1a0a`, `#f0ece4`...).

### API (NestJS)
- Un modulo inyectando el servicio de otro modulo (salvo `catalog`). Buscar
  imports `from '../<otro-modulo>/...'` en `src/modules/*`.
- Efectos cross-modulo hechos por llamada directa en vez de evento.
- Evento emitido fuera de `EventBus` o con nombre fuera de `event-names.ts`.
- Listener no idempotente (create en vez de upsert para algo que puede repetirse).
- Listener que lanza y puede abortar al emisor.
- Logica de dominio en el controller; Prisma usado directo desde un controller.
- `throw new Error` desde un use case.

### Mobile
- Hook de red (`useQuery`, `fetch`) dentro de `src/features/*` (deben ser
  presentacionales) o dentro de `src/components/ui`.
- Pantalla en `app/` con mas de ~80 lineas de JSX: deberia componer secciones.
- Estado global fuera de `AuthProvider`.

### Admin
- Fetch sin pasar por `packages/api-client`.
- Logica de negocio en componentes de pagina.

## Salida

Lista de hallazgos:
```
- [arq][BLOQUEANTE|ALTA|MEDIA|BAJA] archivo:linea -- que esta mal. Por que: ... Fix: ...
```
Y una seccion "Verificado OK" con 2-4 lineas de lo que confirmaste correcto.
No edites nada. Sin hallazgo sin `archivo:linea`.
