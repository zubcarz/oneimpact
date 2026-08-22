# Spec 07 -- mobile-data-layer-and-auth

**Track**: mobile · **Depende de**: 01; contrato de 02 y 05 (no su codigo) · **Ola**: 2 (paralelo con 05)
**Rama**: `feat/mobile-data-layer-and-auth` · **Modo**: `/run-plan-worktree`
**Write-scope**: `apps/mobile/src/api/**`, `apps/mobile/src/auth/**`, `apps/mobile/app/_layout.tsx`, `apps/mobile/src/data/zones.ts` (migrar a hooks), `apps/mobile/src/features/zones/**` (solo cambiar la fuente de datos), `apps/mobile/app/(tabs)/zones.tsx`, `apps/mobile/app/zone/[slug].tsx`

## Objetivo

Capa de datos y sesion de la app: hooks TanStack Query sobre
`@oneimpact/api-client`, **MSW** con el seed compartido para desarrollar sin
API, `AuthProvider` con `expo-secure-store`, y el switch de grupos de rutas
publico/logueado. Zonas pasa a consumir hooks (misma forma de datos, cero
cambio visual).

## Referencia
Vault `arquitectura-mobile.md` (Sesion y roles, Flujo de datos). Regla `20-mobile-conventions.md`.

## Alcance

### `src/api`
- `client.ts`: `createApiClient({ baseUrl: EXPO_PUBLIC_API_URL, getToken })`; interceptor 401 -> `auth.refresh` una vez -> reintento; si falla, `signOut`.
- `queryClient.ts` + `QueryProvider` (ya montado en 00; ajustar `staleTime`, `retry`).
- `hooks/`: `usePlans`, `useZones`, `useZone(slug)`, `useProjects(filters)`, `useProject(id)`, `useMe`, `useDashboard`, `useNotifications`, mutaciones `useRegister`, `useLogin`, `useCreateSubscription`, `useFollowProject`. Keys centralizadas en `hooks/keys.ts`.
- `msw/`: `handlers.ts` cubriendo **todo** el contrato con `seedData` de shared (+ estado en memoria para register/login/subscribe/follow, tarjeta `0000` -> 402); `server.ts` (`msw/native`); se activa en `_layout.tsx` cuando `EXPO_PUBLIC_API_URL` esta vacio o `EXPO_PUBLIC_USE_MSW=1`. Polyfills necesarios (`react-native-url-polyfill`, `fast-text-encoding`) -> **dependencias nuevas, las instala el usuario**.

### `src/auth`
- `AuthProvider`: `user`, `status: 'loading'|'guest'|'authed'`, `signIn`, `signUp`, `signOut`; tokens en `expo-secure-store`; al montar, si hay token -> `GET /me` (revalida rol).
- `useAuth`, `useRequireAuth(returnTo)`, `useRequireRole('ADMIN')`.
- `app/_layout.tsx`: `AuthProvider` + redireccion inicial (`(tabs)` si guest, `(app)` si authed); `app/(app)/_layout.tsx` con guard (crea el grupo con un `dashboard.tsx` placeholder para que 10 lo reemplace).

### Migracion de Zonas
- `zones.tsx` y `zone/[slug].tsx` usan `useZones`/`useZone` con estados loading (skeleton crema) / error (tarjeta con reintento). Secciones siguen presentacionales.

## Fuera de alcance
Pantallas nuevas (08, 09, 10). UI de login (09).

## Invariantes
- Ningun `fetch` fuera de `api-client`. Ningun token fuera de secure-store.
- MSW y API real devuelven **la misma forma** (tipos de shared): un test compara un handler contra el tipo.

## Criterios de aceptacion
- Con `EXPO_PUBLIC_API_URL` vacio la app navega Zonas y detalle con datos del seed.
- Con la API local (02) arriba y la IP LAN, los mismos datos salen de Postgres.
- Tests: `useAuth` (signIn guarda token, signOut lo borra, 401 dispara refresh), handler MSW de `/v1/zones` devuelve 5.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter "api|auth"
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual: arranque con y sin API; redireccion tras `signIn` simulado.

## Commits sugeridos
`feat(mobile): api client, query hooks and msw handlers` · `feat(mobile): auth provider with secure store and route groups` · `refactor(mobile): zones screens consume query hooks`
