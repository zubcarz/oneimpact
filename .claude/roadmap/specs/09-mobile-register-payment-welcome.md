# Spec 09 -- mobile-register-payment-welcome

**Track**: mobile · **Depende de**: 07; contrato de 06 (MSW lo cubre hasta que 06 mergee) · **Ola**: 4 (paralelo con 14)
**Rama**: `feat/mobile-register-payment-welcome` · **Modo**: `/run-plan-guided` (flujo sensible; conviene mirar cada fase)
**Write-scope**: `apps/mobile/app/(auth)/**`, `apps/mobile/src/features/auth/**`, `apps/mobile/src/components/ui/{Input,Stepper,CardPreview}.tsx`, `apps/mobile/app/(tabs)/subscription.tsx` (solo el `href` del CTA)

## Objetivo

El flujo que convierte un visitante en suscriptor: **Registro -> Pago simulado
-> Bienvenida**, mas **Login**. Es el segundo bloque del GIF de entrega y el
que demuestra el invariante del PAN.

## Spec del vault
`pantallas/pantallas-nuevas.md` secciones Registro, Pago simulado, Bienvenida, Login. `arquitectura-sistema.md` (Flujo clave).

## Alcance

### Componentes
- `Input` (`bg-white rounded-2xl px-4 py-4 border-black/5`, focus `border-dark-green`, error `text-red-500 text-xs`, `accessibilityLabel`).
- `Stepper` de 2 pasos (pildoras "1 Cuenta" / "2 Pago").
- `CardPreview` (`rounded-3xl bg-forest`, numero enmascarado, nombre, MM/AA, logo de brand detectado) que reacciona al tipeo.

### Registro (`app/(auth)/register.tsx?plan=&billing=`)
- Resumen del plan (tarjeta blanca, "Cambiar" vuelve a Suscripcion).
- Form `react-hook-form` + `zodResolver(registerSchema)` de shared.
- Submit -> `useRegister` -> guarda tokens -> `router.push('/(auth)/payment?plan&billing')`. 409 -> error inline "Ese email ya tiene cuenta".
- Link a login.

### Pago (`app/(auth)/payment.tsx`)
- Form: numero (mascara 4-4-4-4, Luhn y `detectCardBrand` de shared en vivo), titular, MM/AA, CVC. Aviso fijo "Pago simulado -- no se realiza ningun cargo" + hint "Prueba con 4242 4242 4242 4242; ...0000 fuerza rechazo".
- Submit -> `useCreateSubscription({planId, billing, card:{brand,last4,holder,expMonth,expYear}})`. **El PAN y el CVC viven solo en el estado del form y se descartan al enviar**; test que verifica que el payload no contiene `number`.
- Loading con el `CardPreview` pulsando; 402 -> banner rojo suave + reintentar; 201 -> `/(auth)/welcome`.

### Bienvenida (`app/(auth)/welcome.tsx`)
- Pantalla lima, check animado (Reanimated spring), "Bienvenido a tu travesia", "Tu primer punto ya esta registrado", CTA dark "Ir a mi dashboard" -> `/(app)/dashboard` (placeholder de 07 hasta que 10 lo reemplace).

### Login (`app/(auth)/login.tsx?returnTo=`)
- Fondo crema, logo negro, email + password, CTA dark, link "Crear cuenta" -> Suscripcion. Credenciales seed visibles solo en `__DEV__`.

### Integracion
- CTA de Suscripcion -> `/(auth)/register?plan=<id>&billing=<b>`.
- Header muestra "Mi dashboard" en vez de "Unete" cuando hay sesion.

## Invariantes
- Nunca se loguea ni persiste el PAN/CVC. Nunca viaja por params de ruta.
- Validaciones = schemas de shared (sin duplicar).

## Criterios de aceptacion
- Flujo completo contra MSW y contra API (06) con `4242...` -> Bienvenida -> Dashboard.
- `0000` -> banner de rechazo, sin navegacion.
- Tests RNTL: `CardForm` (Luhn invalido bloquea submit; payload sin `number`), `RegisterForm` (errores de zod), `Stepper`.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope mobile --only typecheck,unit --filter auth
npx expo export --platform android --output-dir "$TMPDIR/oi"
```
Manual: teclado numerico, mascara, animacion del check, haptics.

## Commits sugeridos
`feat(mobile): register screen` · `feat(mobile): simulated card payment screen` · `feat(mobile): welcome and login screens`
