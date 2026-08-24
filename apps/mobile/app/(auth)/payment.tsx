import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Billing, PlanId, PLANS } from '@oneimpact/shared';
import { Screen } from '@/components/layout';
import { Stepper } from '@/components/ui';
import { loginHref } from '@/auth';
import { AuthScreenHeader, CardForm } from '@/features/auth';
import { formatMonthlyPrice } from '@/data/subscription';

/**
 * `/(auth)/welcome` llega en la Fase 4 de este plan: igual que
 * `app/(auth)/register.tsx` con `/(auth)/payment`, `.expo/types/router.d.ts`
 * (generado por Metro, `20-mobile-conventions.md`) todavia no tiene una
 * entrada para esta ruta bajo `typedRoutes` (`apps/mobile/app.json`), asi que
 * el cast queda aislado aca y empieza a verificarse de verdad en el momento
 * en que esa pantalla aterrice.
 */
const WELCOME_PATH = '/(auth)/welcome';
const PAYMENT_PATH = '/(auth)/payment';

const PLAN_IDS: readonly string[] = Object.values(PlanId);
const BILLING_VALUES: readonly string[] = Object.values(Billing);

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Misma logica de fallback que `register.tsx`: una URL a mano no debe romper la pantalla. */
function resolvePlanId(value: string | string[] | undefined): PlanId {
  const candidate = firstValue(value);
  return candidate && PLAN_IDS.includes(candidate) ? (candidate as PlanId) : PlanId.ESTANDAR;
}

/** Misma logica de fallback que `resolvePlanId`, para `billing` -> "monthly". */
function resolveBilling(value: string | string[] | undefined): Billing {
  const candidate = firstValue(value);
  return candidate && BILLING_VALUES.includes(candidate)
    ? (candidate as Billing)
    : Billing.MONTHLY;
}

/**
 * `/(auth)/payment?plan=&billing=` (`pantallas-nuevas.md:29-33`). Ruta fina:
 * resuelve los parametros, decide a donde navegar segun el resultado del
 * pago y compone las secciones presentacionales de `@/features/auth`. El
 * numero de tarjeta y el CVC no pasan por esta pantalla en ningun momento:
 * viven y mueren dentro de `CardForm`.
 */
export default function PaymentScreen() {
  const params = useLocalSearchParams<{ plan?: string; billing?: string }>();
  const planId = resolvePlanId(params.plan);
  const billing = resolveBilling(params.billing);
  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[1];

  const handleBack = () => router.back();

  // Pago aprobado o `409 SUBSCRIPTION_EXISTS` (el usuario ya tenia una
  // suscripcion activa): la misma pantalla de destino en ambos casos
  // (Fase 3, accion 5 del plan). `replace`, no `push`: el back no debe volver
  // al formulario de tarjeta.
  const handleSuccess = () => router.replace(WELCOME_PATH as Href);

  // `401`: la sesion murio entre el registro y el pago.
  const handleSessionExpired = () => router.push(loginHref(PAYMENT_PATH));

  return (
    <Screen statusBar="dark" bg="bg-cream" contentContainerClassName="gap-6 px-5 pb-10">
      <AuthScreenHeader onBack={handleBack} />
      <Stepper current={2} />
      <CardForm
        planId={planId}
        billing={billing}
        priceLabel={formatMonthlyPrice(plan, billing)}
        onSuccess={handleSuccess}
        onSessionExpired={handleSessionExpired}
      />
    </Screen>
  );
}
