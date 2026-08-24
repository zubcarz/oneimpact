import { Pressable, Text, View } from 'react-native';
import { PLANS, type Billing, type PlanId } from '@oneimpact/shared';
import { formatMonthlyPrice } from '@/data/subscription';

export interface PlanSummaryCardProps {
  planId: PlanId;
  billing: Billing;
  onChangePress: () => void;
  testID?: string;
}

/**
 * Resumen del plan elegido, arriba del form de Registro
 * (`pantallas-nuevas.md:25`): "nombre, $/mes, Cambiar" en una tarjeta blanca.
 * El precio nunca se escribe a mano: sale de `PLANS`/`formatMonthlyPrice`
 * (`packages/shared/src/plans.ts`), la misma fuente que usa Suscripcion.
 */
export function PlanSummaryCard({ planId, billing, onChangePress, testID }: PlanSummaryCardProps) {
  // `planId` ya viene validado contra el enum en la ruta (`register.tsx`), asi
  // que siempre hay match; el fallback es solo para no romper el render si
  // `PLANS` cambiara sin que este componente se actualice.
  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[1];

  return (
    <View
      className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
      testID={testID}
    >
      <View>
        <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Tu plan
        </Text>
        <Text className="mt-1 text-lg font-bold text-gray-900">{plan.name}</Text>
        <Text className="text-sm text-gray-700">{formatMonthlyPrice(plan, billing)}/mes</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cambiar plan"
        onPress={onChangePress}
        className="min-h-[44px] items-center justify-center rounded-full bg-cream px-4 active:opacity-80"
      >
        <Text className="text-xs font-bold text-gray-900">Cambiar</Text>
      </Pressable>
    </View>
  );
}
