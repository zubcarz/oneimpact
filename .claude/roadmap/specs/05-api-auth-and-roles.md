# Spec 05 -- api-auth-and-roles

**Track**: api · **Depende de**: 01, 02 (infra comun) · **Ola**: 2 (paralelo con 07)
**Rama**: `feat/api-auth-and-roles` · **Modo**: `/run-plan-worktree`

## Objetivo

Autenticacion JWT propia y control de roles. A partir de aqui **todo endpoint
es privado por defecto** y se abre con `@Public()`; admin con `@Roles('ADMIN')`.

## Referencia del vault
`backend-nest.md` (Seguridad), `arquitectura-sistema.md` (Autenticacion y roles).
Regla `.claude/rules/30-api-event-driven.md` (Auth y roles).

## Alcance

### Modulo `auth`
- `POST /v1/auth/register` (`registerSchema` de shared) -> crea User (argon2), emite `user.registered`, devuelve `{ user, tokens }`. 409 `EMAIL_TAKEN`.
- `POST /v1/auth/login` (`loginSchema`) -> `{ user, tokens }`. 401 `INVALID_CREDENTIALS` (mismo mensaje si el email no existe).
- `POST /v1/auth/refresh` (`{ refreshToken }`) -> tokens nuevos; rota y revoca el anterior. 401 si invalido/reusado.
- `POST /v1/auth/logout` -> revoca refresh.
- Tokens: access 15 min (`JWT_ACCESS_SECRET`), refresh 30 d (`JWT_REFRESH_SECRET`), refresh hasheado en tabla `RefreshToken` (agregar al schema; migracion `refresh_tokens`).
- `JwtStrategy` (passport-jwt) + `JwtAuthGuard` **global** + `@Public()`.
- `RolesGuard` global + `@Roles(...)` + `@CurrentUser()`.
- Throttler: 10/min en `/auth/*`.

### Modulo `users`
- `GET /v1/me` -> `UserProfile`. `PATCH /v1/me` (`name` solamente; `role` rechazado por schema).
- `GET /v1/admin/users` (ADMIN) `{items,total}`; `PATCH /v1/admin/users/:id/role` (ADMIN).
- Listener `subscription.activated` -> marca `onboardingCompleted` (campo nuevo en User; misma migracion).

### Retro-compatibilidad
- `catalog` y `projects` (lectura) marcados `@Public()`.
- `/health` publico.

## Fuera de alcance
Suscripciones, pagos (06). Cookies del admin (11, el admin guarda el token en cookie httpOnly desde su route handler).

## Invariantes
- Ningun log con password, token o hash.
- `role` nunca editable por el propio usuario.
- Respuesta de login identica para "no existe" y "password mal".

## Criterios de aceptacion (e2e)
- register -> 201; repetido -> 409. login ok -> 200 con tokens; mal -> 401.
- `GET /me` sin token 401; con token 200; con token expirado 401.
- refresh rota: el refresh viejo reutilizado -> 401.
- `PATCH /me {role:'ADMIN'}` -> 400. `GET /admin/users` como USER -> 403; como ADMIN -> 200.
- Unit: `AuthService` (hash, tokens), `RolesGuard`.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit
bash scripts/dev/quality-check.sh --scope api --only e2e
```

## Commits sugeridos
`feat(api): jwt auth with refresh rotation` · `feat(api): roles guard and users module`
