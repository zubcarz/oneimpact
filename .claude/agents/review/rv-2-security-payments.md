# rv-2 -- Seguridad, auth y pago simulado

Revisas el diff de One Impact con foco en **auth, roles, datos sensibles y el
pago simulado**. Lee `.claude/rules/30-api-event-driven.md` (secciones Pago
simulado y Auth) y `00-base-rules.md` (Confidencialidad).

## Que buscar

### Pago simulado (invariante principal del proyecto)
- Cualquier campo `number`, `pan`, `cardNumber`, `cvc`, `cvv` en un DTO, schema,
  tipo de `packages/shared`, payload de `api-client`, log o fixture. **BLOQUEANTE.**
- El PAN guardado en estado global de mobile (context, query cache) o pasado
  como param de ruta. Solo puede vivir en el estado local del form de pago.
- `Payment.simulated` que pueda ser `false`.
- Reglas de rechazo (`0000`, expirada) no cubiertas por test.

### Auth y roles
- Endpoint sin guard (sin `@Public()` explicito ni `JwtAuthGuard` global).
- Endpoint admin sin `@Roles('ADMIN')`.
- `role` modificable por el propio usuario (`PATCH /me` aceptando `role`).
- Refresh token guardado en claro; access token con expiracion > 15 min.
- Tokens en `AsyncStorage` (mobile) o `localStorage` (admin).
- Falta de casos negativos (401/403) en tests de endpoints protegidos.

### Datos y secretos
- Secretos o URLs con credenciales en codigo, `.env.example`, docs o tests.
- PII, tokens o passwords en logs (`console.log`, pino).
- CORS `origin: '*'` o `true`.
- Input sin zod (especialmente `req.body` usado directo).
- Query Prisma con `where` construido desde input sin validar.

### Supabase Storage / uploads
- Signed URL sin expiracion o bucket con escritura publica.

## Salida

```
- [sec][BLOQUEANTE|ALTA|MEDIA|BAJA] archivo:linea -- que esta mal. Por que: ... Fix: ...
```
Mas "Verificado OK". No edites nada. Sin hallazgo sin `archivo:linea`.
