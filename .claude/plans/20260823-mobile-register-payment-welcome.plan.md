# Plan -- Mobile: registro, pago simulado y bienvenida (por fases, checkpoint por fase)

> **Fecha**: 2026-08-23
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/09-mobile-register-payment-welcome.md` (item 09, ola 4).
> **Base**: vault `02-Analisis-Visual/pantallas/pantallas-nuevas.md:23-56` (Registro, Pago simulado, Bienvenida, Login), `01-Tecnologia-Arquitectura/arquitectura-sistema.md` (Flujo clave), `01-Tecnologia-Arquitectura/plan-de-trabajo.md:22`. Planes previos: `.claude/plans/20260822-mobile-data-layer-and-auth.plan.md` (item 07, **ejecutado solo hasta la Fase 2** -- ver Contexto #1), `.claude/plans/20260822-api-payments-subscriptions-events.plan.md` (item 06, mergeado en `d0fab7b`).
> **Areas**: mobile
> **Contrato shared tocado**: **No**. Se consumen `registerSchema`, `loginSchema` (`packages/shared/src/schemas/auth.ts:4-15`), `createSubscriptionSchema`, `simulatedCardSchema`, `isValidLuhn`, `detectCardBrand` (`packages/shared/src/schemas/payment.ts:14-58`) y `PLANS`/`monthlyPriceFor` (`packages/shared/src/plans.ts:8-23`). Ningun schema se duplica ni se modifica.
> **Schema Prisma tocado**: No
> **Eventos**: No emite ni escucha. El flujo dispara `user.registered`, `payment.succeeded` y `subscription.activated` **del lado API**, ya implementados en el item 06.
> **Zonas de riesgo**: **pago simulado** (invariante del PAN) y **auth** (persistencia de sesion, casos 401/403). Sin cambios en config de Metro/NativeWind.
> **Fase del roadmap**: Fase 1 (entrega lunes 24 ago 2026, 18:00). Ola 4, en paralelo con el item 14.
> **Como ejecutar**: `/run-plan-guided` (default; el spec lo pide explicitamente por ser flujo sensible)

## Objetivo

Entregar el bloque que convierte un visitante en suscriptor:
**Suscripcion -> Registro -> Pago simulado -> Bienvenida -> Dashboard**, mas la
pantalla de **Login**. Es el segundo tramo del GIF de entrega y el unico lugar
del producto donde se demuestra el invariante "el PAN completo nunca llega al
servidor ni a un log".

## Contexto y hallazgos del analisis

1. **El item 07 se mergeo incompleto.** El merge `2e45527` solo trae las Fases 1
   y 2 del plan `20260822-mobile-data-layer-and-auth.plan.md` (commits
   `8d7c0d1` y `74521aa`). **No existen** en el arbol:
   - Fase 3: MSW (`apps/mobile/src/api/msw/**`). Confirmado: `grep -rl msw
apps/mobile` no devuelve nada y `msw` no esta en `pnpm-lock.yaml`.
   - Fase 4: `AuthProvider`, `useAuth`, `useRequireAuth`, `useRequireRole`, el
     grupo `(app)` y `app/(app)/dashboard.tsx`. `apps/mobile/src/auth/` solo
     contiene `token-store.ts`; `app/(app)/` solo tiene un `.gitkeep`.
   - Fase 5: Zonas consumiendo hooks.
     El propio codigo lo declara: `apps/mobile/src/api/hooks/useAuthMutations.ts:6-9`
     dice "Persisting the tokens ... is the AuthProvider's job (Phase 4)", y
     `apps/mobile/src/api/hooks/useMe.ts:6-9` lo repite. La tabla de estado del
     roadmap (`.claude/roadmap/ROADMAP.md`) marca 07 como `pendiente`, lo cual es
     **mas fiel** que el merge. Esto es la Decision pendiente **D1**.
2. **Sin `AuthProvider` no hay item 09.** El spec exige que el submit de
   Registro "guarde tokens" y que el de Pago viaje con `Authorization`
   (`POST /v1/subscriptions` no es `@Public()`). Hoy `useRegister` y `useLogin`
   solo hacen la llamada de red y resuelven con `{ user, tokens }`
   (`apps/mobile/src/api/hooks/useAuthMutations.ts:10-19`); nadie los persiste.
   Ademas el CTA de Bienvenida apunta a `/(app)/dashboard`, ruta que no existe.
3. **El contrato de la API ya esta servido y es estable** (item 06 en `main`):
   - Registro duplicado -> `409` con `code: 'EMAIL_TAKEN'` y mensaje
     "Ese email ya esta registrado" (`apps/api/src/modules/auth/application/auth.service.ts:55`).
   - Pago rechazado -> `402` con `code: 'PAYMENT_DECLINED'` y
     `details.reason` en `CARD_DECLINED | CARD_EXPIRED`
     (`apps/api/src/modules/subscriptions/application/subscriptions.service.ts:151-158`).
   - Suscripcion ya activa -> `409` `SUBSCRIPTION_EXISTS`
     (`.../subscriptions.service.ts:48-51`). **El spec no contempla este caso**;
     ver Riesgos de la Fase 4.
   - El body de error es `{ statusCode, code, message, details? }`
     (`apps/api/src/common/filters/domain-error.filter.ts:20-25`) y llega al
     cliente dentro de `ApiError.body` (`packages/api-client/src/http.ts:31-34`).
     **La UI ramifica por `code`, nunca por el texto del `message`.**
4. **El invariante del PAN ya esta blindado en el contrato**:
   `simulatedCardSchema` es `.strict()` con el comentario que lo explica
   (`packages/shared/src/schemas/payment.ts:8-22`), igual que
   `createSubscriptionSchema` (`:25-31`). Un payload con `number` o `cvc` no se
   descarta en silencio: **falla la validacion**. El trabajo de esta fase es que
   el PAN y el CVC no salgan del estado local del form.
5. **Faltan dos dependencias**: `react-hook-form` y `@hookform/resolvers` no
   estan en `apps/mobile/package.json`. Si estan en `apps/admin/package.json:22-23`
   (`^7.66.0` y `^5.2.2`) y en el lockfile; se usan **las mismas versiones**
   para no abrir una segunda rama de resolucion. `zod` es `^4.4.3` en todo el
   monorepo, compatible con `@hookform/resolvers` v5. Decision **D3**.
6. **El CTA de Suscripcion esta stubbeado a proposito** con un `Alert` y un
   `TODO(item 09)` que nombra la ruta exacta a la que hay que ir
   (`apps/mobile/app/(tabs)/subscription.tsx:16-20`). El estado `billing` y
   `selectedPlan` ya vive en esa pantalla (`:13-14`): solo hay que pasarlo por
   query params.
7. **Discrepancia spec vs codigo en el punto de integracion del header.** El
   spec 09 dice "Header muestra 'Mi dashboard' en vez de 'Unete' cuando hay
   sesion", pero `Header` no tiene ningun CTA: es logo + boton de menu
   (`apps/mobile/src/components/layout/Header.tsx:30-45`). El CTA "Unete a One
   Impact" vive en `FullScreenMenu` (`apps/mobile/src/components/layout/FullScreenMenu.tsx:82-89`)
   alimentado por `joinCta` (`apps/mobile/src/data/nav.ts:23-26`). **Gana el
   codigo**: el cambio se hace en `FullScreenMenu`, que esta **fuera del
   write-scope declarado por el spec** -- desviacion declarada aqui, no en
   silencio.
8. **No hay `Input`, `Stepper` ni `CardPreview`** en el inventario del vault
   (`02-Analisis-Visual/componentes.md`, headings `### Button` .. `### AllyBadge`):
   los tres componentes nuevos que pide el spec 09 solo estan especificados en
   `pantallas-nuevas.md:26-31`. Esa es su unica fuente; no hay una seccion de
   "componentes de formulario" que contradiga.
9. **Assets de marca de tarjeta**: no existe ningun SVG de Visa/Mastercard/Amex
   en `02-Analisis-Visual/svg/` ni en `apps/mobile/src/assets`. Ver **D4**.
10. **Tokens disponibles**: `dark-green`, `forest`, `cream`, `accent` estan en
    `tailwindColors` (`packages/ui-tokens/src/index.ts:32-41`). `red-500` viene
    de la paleta por defecto de Tailwind, que sigue viva porque los tokens
    entran por `theme.extend.colors` (`apps/mobile/tailwind.config.js:14-15`).
    Ningun hex suelto es necesario.
11. **Credenciales de seed** para el hint de `__DEV__` del login:
    `ana@oneimpact.org` / `User123!` y `admin@oneimpact.org` / `Admin123!`
    (`apps/api/prisma/seed.ts:12-33`).
12. **Verificacion disponible**: `bash scripts/dev/quality-check.sh --list` ->
    `scopes: mobile api admin shared all | steps: typecheck lint unit e2e bundle`,
    y acepta `--filter <path>` que se pasa a jest (`scripts/dev/quality-check.sh:4,42`).

## Decisiones pendientes (bloqueantes)

**D1 -- Que se hace con la deuda del item 07 (BLOQUEA la Fase 1).**
El item 09 no puede cumplir su spec sin `AuthProvider` + grupo `(app)` +
`dashboard` placeholder (Contexto #1 y #2).

- **Opcion A (recomendada)**: este plan **absorbe** la Fase 4 del plan de 07
  como su Fase 1, y **amplia el write-scope** del spec 09 con
  `apps/mobile/src/auth/**`, `apps/mobile/app/(app)/**` y
  `apps/mobile/app/_layout.tsx`. Se registra en el ROADMAP que 07 quedo con las
  Fases 3 y 5 pendientes.
- Opcion B: reabrir 07 en su propia rama antes de empezar 09. Mas limpio en
  trazabilidad, pero serializa dos items a menos de 30 h de la entrega.
  El plan de abajo esta escrito asumiendo **A**. Si se elige B, la Fase 1 se borra
  de este plan y las demas no cambian.

**D2 -- MSW: se hace, se difiere o se descarta (BLOQUEA el criterio de aceptacion).**
El spec 09 pide "flujo completo contra MSW y contra API". MSW es la Fase 3 no
ejecutada de 07 y `msw` no esta en el lockfile (Contexto #1).

- **Opcion A (recomendada)**: **diferir**. El motivo original de MSW era
  "mobile avanza mientras la API no existe"; el item 06 ya esta en `main`, asi
  que el flujo se verifica contra la API real con `pnpm db:up` + `pnpm dev:api`.
  MSW pasa a ser un seguro de demo del item 15. Consecuencia: el criterio de
  aceptacion queda como "flujo completo contra la API real"; se anota la
  diferencia en el ROADMAP.
- Opcion B: meter MSW como fase previa. El propio plan de 07 la marca como "la
  fase con mas superficie de fallo" (polyfills de `msw/native` sobre Hermes,
  riesgo de tocar `metro.config.js`). A esta altura del calendario, es el
  candidato numero uno a comerse la tarde.
  El plan de abajo esta escrito asumiendo **A**.

**D3 -- Instalacion de dependencias (BLOQUEA la Fase 2).**
`react-hook-form@^7.66.0` y `@hookform/resolvers@^5.2.2` en
`apps/mobile/package.json`. Siguiendo la convencion del plan de 07, **las
instala el usuario** antes de arrancar la fase; el implementer no corre
`pnpm add`. Confirmar que se usan esas versiones (las de `apps/admin`) y no
otras.

**D4 -- Logo de brand en `CardPreview` (no bloqueante, decidido).**
No hay assets de marca en el vault (Contexto #9) y no se van a inventar logos de
terceros. Se resuelve con el **nombre de la marca como texto**
(`VISA` / `MASTERCARD` / `AMEX`, `font-black text-xs tracking-widest text-white/70`),
que sigue satisfaciendo "reacciona al tipeo" y no agrega ningun asset ni
dependencia. Si el usuario prefiere iconos, es un cambio de una linea en la
Fase 2.

## Principios

- Aditivo antes que destructivo: nada de lo publico (Inicio, Zonas,
  Suscripcion) cambia de comportamiento salvo el `href` del CTA.
- Verde por fase: cada fase deja `typecheck`, `lint` y `unit` de `mobile` en
  verde para su alcance; la bateria `--scope all` corre una vez, al cierre.
- El spec del vault manda en UI: clases, copy y orden salen de
  `pantallas-nuevas.md:23-56`, no de una interpretacion.
- Los schemas viven una sola vez, en `packages/shared`. Cero validacion
  duplicada en el cliente.
- Sin PAN en el servidor: el numero completo y el CVC no salen del estado del
  form, no van a un log, no van a un query param, no van a secure-store.
- Sin supresiones nuevas (`eslint-disable`, `@ts-ignore`) y sin debilitar tests.
- Copy visible en espanol; codigo, rutas e identificadores en ingles.
- Colores solo por token; ningun hex suelto en un componente.

## Mapa de fases

| Fase | Nombre                                                                    | Area   | Impacto | Shared | Prisma | Commit sugerido                                                  |
| ---- | ------------------------------------------------------------------------- | ------ | ------- | ------ | ------ | ---------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                                                 | --     | Ninguno | No     | No     | _(sin commit)_                                                   |
| 1    | Sesion: AuthProvider, grupo `(app)` y dashboard placeholder (deuda de 07) | mobile | Aditivo | No     | No     | `feat(mobile): auth provider with secure store and route groups` |
| 2    | Primitivas de formulario: `Input`, `Stepper`, `CardPreview`               | mobile | Aditivo | No     | No     | `feat(mobile): form primitives for the auth flow`                |
| 3    | Registro (`(auth)/register`) + integracion del CTA de Suscripcion         | mobile | Aditivo | No     | No     | `feat(mobile): register screen`                                  |
| 4    | Pago simulado (`(auth)/payment`)                                          | mobile | Aditivo | No     | No     | `feat(mobile): simulated card payment screen`                    |
| 5    | Bienvenida, Login e integracion de sesion en el menu                      | mobile | Aditivo | No     | No     | `feat(mobile): welcome and login screens`                        |
| 6    | Cierre: bateria completa + AI log                                         | --     | Ninguno | No     | No     | `docs: log ai session mobile-register-payment-welcome`           |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar que el arbol de partida es el que este plan asume y que
D1/D2/D3 estan resueltas antes de escribir una linea.

**Area**: --
**Archivos**: ninguno (solo lectura)
**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Confirmar `git status` limpio y rama base `main` en `935e109`.
2. Confirmar el hallazgo del Contexto #1: `ls apps/mobile/src/auth/` devuelve
   solo `token-store.ts`; `ls "apps/mobile/app/(app)"` devuelve solo
   `.gitkeep`; `grep -rl msw apps/mobile` no devuelve nada.
3. Confirmar D3: `react-hook-form` y `@hookform/resolvers` presentes en
   `apps/mobile/package.json` **antes** de la Fase 2. Si no lo estan, parar y
   pedirlas.
4. Levantar la API real para las verificaciones manuales del flujo:
   `pnpm db:up`, migrar, seed, `pnpm dev:api`. Confirmar
   `GET http://localhost:5000/health` y `POST /v1/auth/login` con
   `ana@oneimpact.org` / `User123!`.
5. Correr la linea base para no atribuirle a este plan un fallo heredado:
   `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
  en verde **antes** de empezar. Si esta en rojo, se documenta y se decide si se
  arregla aparte.

**Riesgos**: si la linea base ya esta roja, cualquier gate posterior es ruido.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Sesion: AuthProvider, grupo `(app)` y dashboard placeholder

**Objetivo**: entregar el mecanismo de sesion que el item 07 dejo sin ejecutar,
sin ninguna pantalla de auth todavia. Al cerrar la fase existe `signUp`,
`signIn`, `signOut`, un grupo `(app)` protegido y un `dashboard` placeholder al
que las fases siguientes puedan navegar.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/auth/AuthProvider.tsx` -- context con
  `user: UserProfile | null`, `status: 'loading' | 'guest' | 'authed'`,
  `signIn`, `signUp`, `signOut`.
- `apps/mobile/src/auth/useAuth.ts`
- `apps/mobile/src/auth/useRequireAuth.ts`
- `apps/mobile/src/auth/useRequireRole.ts`
- `apps/mobile/src/auth/index.ts`
- `apps/mobile/app/_layout.tsx:31-36` -- montar `AuthProvider` **dentro** de
  `QueryClientProvider` (el provider usa `queryClient.clear()` en `signOut`) y
  declarar `Stack.Screen name="(app)"` y `name="(auth)"`.
- `apps/mobile/app/(app)/_layout.tsx` -- guard del grupo protegido.
- `apps/mobile/app/(app)/dashboard.tsx` -- placeholder minimo, marcado en un
  comentario para que el item 10 lo reemplace entero.

**Spec**: vault `01-Tecnologia-Arquitectura/arquitectura-mobile.md`, seccion
"Sesion y roles" y grupo `(app)`. Reutiliza integralmente el diseno de la Fase 4
de `.claude/plans/20260822-mobile-data-layer-and-auth.plan.md:474-543`.
**Shared**: No -- consume `UserProfile` y `Role` (`packages/shared/src/enums.ts`).
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `AuthProvider` con la maquina de tres estados. Al montar: si hay token en
   secure-store (`getAccessToken`, `apps/mobile/src/auth/token-store.ts:11-13`)
   -> `GET /me` via `callApi`; si responde, `authed` con el `role`
   **del servidor**; si falla, `clearTokens()` y `guest`. El `role` no se
   persiste nunca como fuente de verdad.
2. `signUp(input)` y `signIn(input)` envuelven `useRegister`/`useLogin`
   (`apps/mobile/src/api/hooks/useAuthMutations.ts:10-19`), guardan tokens con
   `saveTokens` **antes** de setear el usuario, y devuelven el `UserProfile`.
   `signOut` llama `auth.logout({ refreshToken })`, limpia secure-store y hace
   `queryClient.clear()`.
3. Suscribir el provider a `onSessionExpired`
   (`apps/mobile/src/auth/token-store.ts:42-47`), el listener que la Fase 2 de
   07 dejo preparado: refresh fallido -> `guest`.
4. Hooks `useAuth`, `useRequireAuth(returnTo)`, `useRequireRole('ADMIN')`.
5. `app/(app)/_layout.tsx` con el guard y `dashboard.tsx` placeholder. Las
   rutas publicas siguen accesibles con sesion: **el guard no expulsa de
   `(tabs)`**. Una sola capa decide el destino inicial; la otra solo bloquea.
6. Tests (`apps/mobile/__tests__/auth-provider.test.tsx`) con
   `expo-secure-store` mockeado: `signIn` guarda el token; `signOut` lo borra;
   arranque con token valido -> `authed` con el rol de `GET /me`; arranque con
   token invalido -> `guest` y secure-store vacio.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter auth`
- Casos negativos obligatorios (zona de riesgo auth):
  - `GET /me` -> 401 al arrancar deja `guest` **y** secure-store vacio.
  - `useRequireRole('ADMIN')` con un usuario `USER` **no** da acceso.
  - El `role` no se lee de estado local escribible ni de secure-store.
- Pendiente manual (Expo Go): matar y reabrir la app mantiene la sesion;
  `signOut` devuelve a `(tabs)` sin pantalla en blanco.

**Riesgos**:

- Pantalla en blanco si `status === 'loading'` no termina nunca (secure-store
  que no resuelve en un simulador limpio). Mitigacion: el `_layout` ya tiene la
  disciplina de "no renderizar hasta que las fuentes carguen"
  (`apps/mobile/app/_layout.tsx:24-26`); se reusa el mismo patron con un solo
  punto de decision.
- Bucle de navegacion si el guard de `(app)` y la redireccion inicial de
  `_layout` compiten. Mitigacion explicita en la accion 5.
- `typedRoutes` (`apps/mobile/app.json`, `experiments.typedRoutes: true`) puede
  no conocer `/dashboard` hasta que Metro regenere tipos; el `typecheck` puede
  fallar hasta un `pnpm dev:mobile` que regenere `.expo/types`.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(mobile): auth provider with secure store and route groups`

---

## Fase 2 -- Primitivas de formulario: `Input`, `Stepper`, `CardPreview`

**Objetivo**: los tres componentes nuevos del sistema de diseno que consumen
las Fases 3 a 5, con sus tests, antes de que exista una pantalla que los use.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/components/ui/Input.tsx`
- `apps/mobile/src/components/ui/Stepper.tsx`
- `apps/mobile/src/components/ui/CardPreview.tsx`
- `apps/mobile/src/components/ui/index.ts` -- exports nombrados (el archivo ya
  sigue el patron `export { X } from './X'; export type { XProps }`,
  `apps/mobile/src/components/ui/index.ts:1-43`).
- `apps/mobile/__tests__/Stepper.test.tsx`, `apps/mobile/__tests__/CardPreview.test.tsx`
- `apps/mobile/package.json` -- las dos dependencias de **D3**, instaladas por
  el usuario. El implementer **no** corre `pnpm add`.

**Spec**: `pantallas-nuevas.md:24-31`:

- `Input`: `bg-white rounded-2xl px-4 py-4 border border-black/5`, focus
  `border-dark-green`, error `text-red-500 text-xs`. `accessibilityLabel`
  obligatorio; area tactil >= 44pt.
- `Stepper`: dos pildoras, "1 Cuenta" activa `bg-dark-green` (texto blanco),
  "2 Pago" inactiva.
- `CardPreview`: `rounded-3xl bg-forest`, numero enmascarado, nombre del
  titular, `MM/AA`, marca detectada. Reacciona al tipeo.

**Shared**: No -- `CardPreview` consume `detectCardBrand`
(`packages/shared/src/schemas/payment.ts:52-58`) para derivar la marca. **No
reimplementa la deteccion.**
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `Input` presentacional y controlado: props `label`, `value`, `onChangeText`,
   `error?`, `keyboardType?`, `secureTextEntry?`, `maxLength?`,
   `autoCapitalize?`, `testID?`. El estado de focus vive dentro
   (`onFocus`/`onBlur`) para alternar el borde. **Nunca** loguea `value`.
2. `Stepper` con props `{ current: 1 | 2 }` y los labels en espanol como
   constantes del propio componente. `accessibilityRole="header"` en el paso
   activo.
3. `CardPreview` con props `{ pan: string; holder: string; expMonth: string;
expYear: string; pulsing?: boolean }`. **Enmascara dentro del componente**:
   solo se pintan los ultimos 4 digitos, el resto son bullets. `pulsing`
   alimenta la animacion de loading de la Fase 4 (Reanimated, ya en
   `apps/mobile/package.json`). Marca como texto (**D4**).
4. Tests: `Stepper` marca el paso correcto y no el otro; `CardPreview` con
   `4242424242424242` muestra `VISA` y **no** muestra los 12 primeros digitos
   (assert negativo explicito -- es la primera linea de defensa del invariante
   del PAN, esta vez en la UI).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "Stepper|CardPreview"`
- Pendiente manual: ninguno todavia (no hay pantalla que los monte).

**Riesgos**:

- `react-hook-form` no se usa en esta fase pero se instala aca; si la version no
  es la de `apps/admin` (**D3**), pnpm resuelve dos arboles y el
  `--scope all` del cierre puede tardar o romperse.
- La animacion de `CardPreview` con Reanimated: NativeWind no aplica
  `className` sobre componentes de Reanimated -- ya mordio en
  `FullScreenMenu.tsx:49-52`. Se aplica el mismo patron (estilo en un `View`
  normal envuelto por el `Animated.View`).

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): form primitives for the auth flow`

---

## Fase 3 -- Registro y conexion del CTA de Suscripcion

**Objetivo**: `(auth)/register?plan=&billing=` funcionando de punta a punta:
resumen de plan, validacion con el schema de shared, alta real contra la API,
tokens persistidos y navegacion al pago.

**Area**: mobile
**Archivos**:

- `apps/mobile/app/(auth)/_layout.tsx` -- `Stack` sin header propio.
- `apps/mobile/app/(auth)/register.tsx` -- ruta fina: lee params, compone.
- `apps/mobile/src/features/auth/RegisterForm.tsx` -- el form.
- `apps/mobile/src/features/auth/PlanSummaryCard.tsx` -- tarjeta blanca del plan.
- `apps/mobile/src/features/auth/AuthScreenHeader.tsx` -- header con back,
  compartido por register/payment/login.
- `apps/mobile/src/features/auth/index.ts`
- `apps/mobile/src/features/auth/auth-errors.ts` -- mapeo `code` -> copy en
  espanol, leyendo `ApiError.body.code` (Contexto #3).
- `apps/mobile/app/(tabs)/subscription.tsx:16-20` -- reemplazar el `Alert`
  stub por `router.push`. **Unico cambio fuera de `(auth)`/`features/auth`.**
- `apps/mobile/__tests__/register-form.test.tsx`

**Spec**: `pantallas-nuevas.md:23-28` (Registro). Fondo crema, header con back,
`Stepper` paso 1, tarjeta blanca `rounded-2xl` con nombre + `$/mes` + "Cambiar",
campos nombre/email/contrasena, CTA dark `fullWidth` "Continuar al pago", link
"Ya tienes cuenta? Inicia sesion".
**Shared**: No -- `registerSchema` (`packages/shared/src/schemas/auth.ts:4-9`)
via `zodResolver`; `PLANS` y `monthlyPriceFor`
(`packages/shared/src/plans.ts:8-23`) para el resumen.
**Prisma**: No
**Eventos**: No (la API emite `user.registered`).

**Acciones**:

1. `(auth)/_layout.tsx` y `register.tsx`: leer `plan` y `billing` con
   `useLocalSearchParams`, **validarlos** contra los enums de shared y caer a
   `estandar`/`monthly` si vienen basura (una URL a mano no debe romper la
   pantalla).
2. `PlanSummaryCard`: nombre, precio mensual segun `billing` con
   `monthlyPriceFor`, y "Cambiar" -> `router.back()` a Suscripcion. **Los
   precios no se escriben a mano**: salen de `PLANS`.
3. `RegisterForm` con `useForm` + `zodResolver(registerSchema)`. Los mensajes de
   error son **los del schema** (`packages/shared/src/schemas/auth.ts:5-7`,
   ya en espanol); no se duplican.
4. Submit -> `signUp` del `AuthProvider` (Fase 1) -> `router.push('/(auth)/payment?plan=&billing=')`.
   `409 EMAIL_TAKEN` -> error inline bajo el campo email: "Ese email ya tiene
   cuenta". Cualquier otro error -> banner generico. La ramificacion es por
   `code`, nunca por el `message`.
5. Link "Ya tienes cuenta? Inicia sesion" -> `/(auth)/login?returnTo=...`.
6. `subscription.tsx`: `router.push` con `plan` y `billing` del estado local
   (`apps/mobile/app/(tabs)/subscription.tsx:13-14`), borrando el `Alert` y el
   `TODO(item 09)`.
7. Test `register-form.test.tsx`: email invalido y password corta bloquean el
   submit y muestran el copy del schema; submit valido llama al mutador una vez
   con `{ name, email, password }` y nada mas.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "register|auth"`
- Casos negativos obligatorios (zona de riesgo auth):
  - Email ya registrado -> 409 -> error inline, **sin navegacion** a pago y
    **sin tokens** guardados.
  - Params `plan`/`billing` invalidos -> pantalla usable con el default, no un
    crash.
- Pendiente manual (Expo Go, API real arriba): Suscripcion -> CTA llega a
  Registro con el plan correcto; teclado `email-address` en el campo email;
  contrasena enmascarada; "Cambiar" vuelve a Suscripcion conservando la
  seleccion.

**Riesgos**:

- Si el usuario abandona en el paso 2, queda una cuenta sin suscripcion. El spec
  no lo cubre; para la entrega, un login posterior lleva al dashboard vacio.
  Se anota como PREGUNTA ABIERTA, no se inventa un flujo de recuperacion.
- `typedRoutes` puede no conocer `/(auth)/payment` hasta que Metro regenere
  tipos; mismo riesgo que la Fase 1.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(mobile): register screen`

---

## Fase 4 -- Pago simulado

**Objetivo**: la pantalla donde se demuestra el invariante del PAN. Form de
tarjeta con mascara, Luhn y deteccion de marca en vivo; al servidor solo
`{brand, last4, holder, expMonth, expYear}`.

**Area**: mobile
**Archivos**:

- `apps/mobile/app/(auth)/payment.tsx`
- `apps/mobile/src/features/auth/CardForm.tsx`
- `apps/mobile/src/features/auth/card-format.ts` -- mascara 4-4-4-4 y parseo de
  `MM/AA`. **Formato de presentacion unicamente**: Luhn y marca vienen de
  shared.
- `apps/mobile/src/features/auth/PaymentDeclinedBanner.tsx`
- `apps/mobile/__tests__/card-form.test.tsx`

**Spec**: `pantallas-nuevas.md:29-34` (Pago simulado). `Stepper` paso 2,
`CardPreview` arriba, campos numero/titular/MM-AA/CVC, aviso fijo "Pago
simulado -- no se realiza ningun cargo", hint de tarjetas de prueba, CTA accent
"Confirmar $10/mes", loading ~800 ms, rechazo -> banner rojo suave + reintentar,
exito -> `/(auth)/welcome`.
**Shared**: No -- `isValidLuhn` y `detectCardBrand`
(`packages/shared/src/schemas/payment.ts:35-58`), `createSubscriptionSchema` y
`simulatedCardSchema` (`:14-32`) para tipar el payload. **Cero validacion
duplicada.**
**Prisma**: No
**Eventos**: No (la API emite `payment.succeeded` y `subscription.activated`).

**Acciones**:

1. `card-format.ts`: `formatPan` (grupos de 4) y
   `parseExpiry('MM/AA') -> { expMonth: number; expYear: number }` (año a 4
   digitos: `2000 + AA`, coherente con `expYear >= 2024` del schema,
   `packages/shared/src/schemas/payment.ts:20`).
2. `CardForm` con `useForm`. El PAN y el CVC son **estado local del form y
   nada mas**: no van a un context, no van a `queryClient`, no van a
   secure-store, no se loguean. Validacion del PAN: `isValidLuhn` de shared;
   si falla, el CTA queda deshabilitado.
3. Al enviar, construir el payload **explicitamente campo por campo**:
   `{ planId, billing, card: { brand: detectCardBrand(pan), last4: pan.slice(-4),
holder, expMonth, expYear } }`. Nunca un spread del estado del form -- un
   spread es exactamente como se filtraria el PAN.
4. `useCreateSubscription` (`apps/mobile/src/api/hooks/useCreateSubscription.ts:11-22`)
   para el envio. Durante el `isPending`, `CardPreview` con `pulsing`.
5. Manejo de errores por `code` (Contexto #3):
   - `402 PAYMENT_DECLINED` -> `PaymentDeclinedBanner` con el `message` de la
     API y boton "Reintentar". **Sin navegacion.**
   - `409 SUBSCRIPTION_EXISTS` -> el usuario ya tiene suscripcion activa; se
     navega directo a `/(auth)/welcome`. El spec no lo contempla (Contexto #3);
     decision tomada aca para no dejar al usuario en un callejon.
   - `401` -> la sesion murio entre registro y pago; volver a
     `/(auth)/login?returnTo=/(auth)/payment`.
6. Aviso fijo y hint de tarjetas de prueba (`4242 4242 4242 4242` OK,
   `...0000` fuerza rechazo), visibles siempre -- no solo en `__DEV__`: el
   spec los pide como parte de la pantalla.
7. Tests `card-form.test.tsx`, los tres que exige el spec 09:
   - PAN que falla Luhn -> submit bloqueado.
   - **El payload enviado no contiene `number`, `pan` ni `cvc`**: assert sobre
     el argumento del mutador con `expect(Object.keys(payload.card).sort())`
     -- claves exactas, no `toMatchObject`, que dejaria pasar un campo de mas.
   - `simulatedCardSchema.safeParse(payload.card).success === true`: el payload
     se valida contra el **mismo** schema `.strict()` que corre en el servidor.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "card"`
- Casos negativos obligatorios (zona de riesgo pago simulado):
  - `4242 4242 4242 0000` -> 402 -> banner de rechazo, **sin navegacion** a
    Bienvenida.
  - Tarjeta vencida (`MM/AA` en el pasado) -> 402 `CARD_EXPIRED`.
  - Luhn invalido -> CTA deshabilitado, **la peticion nunca sale**.
  - Sin token -> 401 -> vuelta a login, no un crash.
- Pendiente manual (Expo Go, API real arriba): teclado numerico en numero/CVC;
  la mascara agrupa de a 4 sin saltar el cursor; `CardPreview` se actualiza al
  tipear y pulsa durante los ~800 ms; haptic al confirmar.
- **Verificacion manual del invariante, obligatoria y anotada**: con
  `pnpm dev:api` en primer plano, completar un pago y confirmar que el log
  pino de la API **no contiene** el PAN. Es la evidencia de la prueba tecnica y
  no la cubre ningun test automatico.

**Riesgos**:

- La mascara 4-4-4-4 sobre `TextInput` controlado puede mover el cursor al
  final en Android en cada pulsacion. Mitigacion: formatear solo hacia adelante
  y probarlo en dispositivo antes de dar la fase por cerrada.
- Amex tiene 15 digitos y CVC de 4: la mascara 4-4-4-4 y `maxLength` fijos lo
  cortan. `detectCardBrand` **si** detecta amex
  (`packages/shared/src/schemas/payment.ts:56`). Para la entrega se acepta el
  formato de 16 digitos y se anota; forzar el caso amex es alcance de otro item.
- El riesgo de fuga del PAN no es el envio explicito sino un `console.log` de
  depuracion olvidado o un mensaje de error que incluya el estado del form. El
  gate de la fase incluye leer el diff buscando exactamente eso.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(mobile): simulated card payment screen`

---

## Fase 5 -- Bienvenida, Login e integracion de sesion

**Objetivo**: cerrar el flujo (Bienvenida -> Dashboard), entregar Login con
`returnTo`, y que el menu refleje que hay sesion.

**Area**: mobile
**Archivos**:

- `apps/mobile/app/(auth)/welcome.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/src/features/auth/WelcomeCheck.tsx` -- check animado (Reanimated
  spring).
- `apps/mobile/src/features/auth/LoginForm.tsx`
- `apps/mobile/src/data/nav.ts:23-26` -- CTA del menu dependiente de sesion.
- `apps/mobile/src/components/layout/FullScreenMenu.tsx:82-89` -- usar ese CTA.
  **Desviacion del write-scope declarada en el Contexto #7.**
- `apps/mobile/__tests__/login-form.test.tsx`

**Spec**: `pantallas-nuevas.md:35-37` (Bienvenida: pantalla lima full, check
grande animado, "Bienvenido a tu travesia!", "Tu primer punto ya esta
registrado", CTA dark "Ir a mi dashboard") y `pantallas-nuevas.md:54-56`
(Login: fondo crema, logo negro, email + password, CTA dark, link a registro que
lleva a Suscripcion, credenciales seed visibles solo en dev).
**Shared**: No -- `loginSchema` (`packages/shared/src/schemas/auth.ts:11-15`).
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `welcome.tsx`: fondo `bg-accent` a pantalla completa (mismo tratamiento que
   `FullScreenMenu`), `WelcomeCheck` con spring de Reanimated, copy exacto del
   spec, CTA `variant="dark"` -> `router.replace('/(app)/dashboard')`.
   **`replace`, no `push`**: el back no debe volver al pago.
2. `login.tsx` + `LoginForm` con `zodResolver(loginSchema)`. Submit -> `signIn`
   del provider -> `router.replace(returnTo ?? '/(app)/dashboard')`. `401` ->
   error generico "Email o contrasena incorrectos" **sin decir cual de los dos
   falla**.
3. Hint de credenciales de seed **solo bajo `__DEV__`**: `ana@oneimpact.org` /
   `User123!` (`apps/api/prisma/seed.ts:26-33`). Nunca la del admin en una
   pantalla de usuario.
4. Link "Crear cuenta" -> `/subscription` (elegir plan primero), como pide el
   spec.
5. `nav.ts` + `FullScreenMenu`: cuando `status === 'authed'`, el CTA es
   "Mi dashboard" -> `/(app)/dashboard`; si no, sigue siendo "Unete a One
   Impact" -> `/subscription`. `FullScreenMenu` pasa a leer `useAuth`; es el
   unico componente de layout que gana una dependencia de sesion.
6. Test `login-form.test.tsx`: email invalido bloquea el submit; un 401 muestra
   el mensaje generico y **no** navega. Ampliar
   `apps/mobile/__tests__/FullScreenMenu.test.tsx` con el caso `authed` sin
   romper los asserts existentes.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "login|FullScreenMenu"`
- Casos negativos obligatorios (zona de riesgo auth):
  - Credenciales invalidas -> 401 -> mensaje generico, sin navegacion, sin
    tokens guardados.
  - Las credenciales de seed **no** aparecen en un build de produccion
    (`__DEV__ === false`).
  - `returnTo` con un valor arbitrario no navega fuera de la app: se valida
    contra una lista de rutas conocidas o se cae al dashboard.
- Pendiente manual (Expo Go): la animacion del check corre una sola vez y no
  parpadea; el back desde Bienvenida no vuelve al pago; con sesion iniciada, el
  menu dice "Mi dashboard".

**Riesgos**:

- `FullScreenMenu` esta montado en las tres pantallas publicas; si `useAuth`
  lanza por estar fuera del provider, se caen Inicio, Zonas y Suscripcion a la
  vez. Mitigacion: el provider se monta en `app/_layout.tsx` (Fase 1), por
  encima de todo, y el hook devuelve un default seguro si el context falta.
- El test existente `FullScreenMenu.test.tsx` va a necesitar el provider en su
  render. Envolverlo, **no** relajar sus asserts.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `feat(mobile): welcome and login screens`

---

## Fase 6 -- Cierre: bateria completa y AI log

**Objetivo**: dejar el arbol verde en todos los workspaces, verificar el flujo
completo a mano contra la API real, y registrar la sesion como entregable.

**Area**: --
**Archivos**:

- `docs/ai-workflow.md` -- via `/ai-log`.
- `.claude/roadmap/ROADMAP.md` -- tabla de Estado: item 09 hecho; **y la nota de
  que el item 07 quedo con sus Fases 3 (MSW) y 5 (Zonas con hooks) pendientes**
  (Contexto #1, decisiones D1 y D2).
- `.claude/plans/README.md` -- indice y estado del plan.

**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all`.
2. `bash scripts/dev/quality-check.sh --scope mobile --only bundle` (`expo
export --platform android`): la unica prueba de que las dependencias nuevas
   de la Fase 2 bundlean bajo Hermes.
3. Recorrido manual completo contra la API real, anotando cada paso:
   Suscripcion -> Registro -> Pago (`4242...`) -> Bienvenida -> Dashboard;
   y la variante `...0000` -> banner de rechazo sin navegacion.
4. `/ai-log` con lo pedido, lo entregado, lo revisado y lo ajustado a mano.
5. Actualizar el ROADMAP y el `README.md` de planes con el estado y el rango de
   commits.

**Verificacion** (acotada a la fase):

- `--scope all` en verde y `--only bundle` en verde.
- Lista de pendientes manuales de las Fases 1 a 5 resuelta o explicitamente
  anotada como **SIN CONFIRMAR** en el resumen. "El test pasa" no es "la
  feature funciona".

**Riesgos**: `--scope all` incluye los e2e de `api` (necesitan `pnpm db:up`) y
Playwright en `admin`; si algo rojo viene de un item ajeno, se documenta y no se
arregla dentro de este plan.

CHECKPOINT -- Fin del plan.
**Commit sugerido**: `docs: log ai session mobile-register-payment-welcome`
