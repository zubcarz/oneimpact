import { Text, View } from 'react-native';
import type { Billing, Plan, SubscriptionStatus } from '@oneimpact/shared';
import { formatMonthlyPrice } from '@/data/subscription';
import { Button } from './Button';
import { cx } from './cx';

export interface SubscriptionCardProps {
  plan: Plan | null;
  billing: Billing | null;
  status: SubscriptionStatus | null;
  activeMonths: number;
  onManagePress: () => void;
  className?: string;
  testID?: string;
}

/**
 * Tarjeta forest del Dashboard (`pantallas-nuevas.md`, "Dashboard", linea 40):
 * plan + precio, meses activos, boton pildora blanca "Gestionar". Sin `plan`
 * muestra el estado vacio con CTA "Elegir un plan" -- el mismo `onManagePress`,
 * el caller decide a donde navega en cada caso (`app/(app)/dashboard.tsx`).
 */
export function SubscriptionCard({
  plan,
  billing,
  status,
  activeMonths,
  onManagePress,
  className,
  testID,
}: SubscriptionCardProps) {
  return (
    <View className={cx('rounded-3xl bg-forest p-6', className)} testID={testID}>
      {plan === null ? (
        <>
          <Text className="text-lg font-bold text-white">Aún no tienes un plan activo</Text>
          <Text className="mt-1 text-sm text-white/70">
            Elige un plan para empezar tu travesía de impacto.
          </Text>
          <Button
            label="Elegir un plan"
            variant="white"
            onPress={onManagePress}
            className="mt-5 self-start"
          />
        </>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">{plan.name}</Text>
            {status === 'CANCELED' ? (
              <View className="rounded-full bg-white/20 px-3 py-1">
                <Text className="text-xs font-bold text-white">Cancelada</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-sm text-accent">
            {billing !== null ? `${formatMonthlyPrice(plan, billing)}/mes` : null}
          </Text>
          <Text className="mt-3 text-sm text-white/70">{`${activeMonths} meses activos`}</Text>
          <Button
            label="Gestionar"
            variant="white"
            onPress={onManagePress}
            className="mt-5 self-start"
          />
        </>
      )}
    </View>
  );
}
