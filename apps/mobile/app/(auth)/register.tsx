import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Billing, PlanId } from '@oneimpact/shared';
import { Screen } from '@/components/layout';
import { Stepper } from '@/components/ui';
import { loginHref } from '@/auth';
import { AuthScreenHeader, PlanSummaryCard, RegisterForm } from '@/features/auth';

/**
 * `/(auth)/payment` llega en la Fase 3 de este plan: `.expo/types/router.d.ts`
 * (generado por Metro, `20-mobile-conventions.md`) todavia no tiene una
 * entrada para esta ruta, asi que `Href` -- estricto bajo `typedRoutes`
 * (`apps/mobile/app.json`) -- no puede verificarla. El cast queda aislado
 * aca, igual que `src/auth/routes.ts:17-21`, y empieza a verificarse de
 * verdad en el momento en que esa pantalla aterrice.
 */
const PAYMENT_PATH = '/(auth)/payment';

const PLAN_IDS: readonly string[] = Object.values(PlanId);
const BILLING_VALUES: readonly string[] = Object.values(Billing);

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Una URL escrita a mano no debe romper la pantalla: basura cae a "estandar". */
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
 * `/(auth)/register?plan=&billing=` (`pantallas-nuevas.md:23-27`). Ruta fina:
 * resuelve los parametros, orquesta la navegacion (volver, ir a pago, ir a
 * login) y compone las secciones presentacionales de `@/features/auth`.
 */
export default function RegisterScreen() {
  const params = useLocalSearchParams<{ plan?: string; billing?: string }>();
  const plan = resolvePlanId(params.plan);
  const billing = resolveBilling(params.billing);

  const handleBack = () => router.back();

  const handleSuccess = () =>
    router.push({ pathname: PAYMENT_PATH, params: { plan, billing } } as Href);

  return (
    <Screen statusBar="dark" bg="bg-cream" contentContainerClassName="gap-6 px-5 pb-10">
      <AuthScreenHeader onBack={handleBack} />
      <Stepper current={1} />
      <PlanSummaryCard planId={plan} billing={billing} onChangePress={handleBack} />
      <RegisterForm
        onSuccess={handleSuccess}
        loginHref={loginHref(`${PAYMENT_PATH}?plan=${plan}&billing=${billing}`)}
      />
    </Screen>
  );
}
