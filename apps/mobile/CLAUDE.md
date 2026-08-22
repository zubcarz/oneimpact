# apps/mobile -- AI instructions

Expo SDK 57 app (expo-router, NativeWind 4, TanStack Query, expo-image/video).
Follow root `CLAUDE.md` and `.claude/rules/20-mobile-conventions.md` +
`.claude/rules/60-design-system.md`.

- Screens live in `app/` and only compose sections from `src/features/<feature>`.
- Every screen has a spec in the vault `02-Analisis-Visual/pantallas/`. Implement the
  spec (classes, copy, assets), do not improvise.
- Colors via tokens (`bg-accent`, `bg-forest`, `bg-cream`); Geist font weights 900 (Home)
  / 700 (Zones, Subscription). Every button is a pill.
- Remote data through hooks in `src/api/hooks` (TanStack Query over `@oneimpact/api-client`);
  MSW handlers in `src/api/msw` reuse the API seed.
- Session in `expo-secure-store`; role from JWT, re-validated with `GET /me`.
- Simulated card: Luhn + brand detection from `@oneimpact/shared`; only
  `{brand,last4,holder,expMonth,expYear}` leaves the device.
- Quick check: `pnpm typecheck`, `pnpm test -- <path>`, `npx expo export --platform android`.
  Device verification (Expo Go) is manual and must be reported as pending.
