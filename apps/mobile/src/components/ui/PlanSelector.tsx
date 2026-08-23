import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { PLANS, type Billing, type PlanId } from '@oneimpact/shared';
import { formatMonthlyPrice, subscriptionScreen } from '@/data/subscription';
import { cx } from './cx';

export interface PlanSelectorProps {
  value: PlanId;
  billing: Billing;
  onChange: (value: PlanId) => void;
  className?: string;
  testID?: string;
}

/**
 * Selector de plan (Basico/Estandar/Premium) de la pantalla Suscripcion
 * (`02-Analisis-Visual/pantallas/suscripcion.md`, seccion 2). Controlado: no
 * guarda estado propio, la pantalla decide el `value` por defecto ("estandar").
 * Los planes y precios salen de `PLANS`/`formatMonthlyPrice`, nunca de una
 * lista local.
 */
export function PlanSelector({ value, billing, onChange, className, testID }: PlanSelectorProps) {
  const handlePress = (id: PlanId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(id);
  };

  return (
    <View className={cx('flex-row rounded-3xl bg-white/70 p-2', className)} testID={testID}>
      {PLANS.map((plan) => {
        const selected = plan.id === value;

        return (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            accessibilityLabel={plan.name}
            accessibilityState={{ selected }}
            onPress={() => handlePress(plan.id)}
            className={cx(
              'min-h-[44px] flex-1 items-center rounded-2xl px-1 py-3',
              selected && 'bg-white shadow-md',
            )}
          >
            {selected && (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-dark-green"
              >
                <Check size={12} color={colors.white} strokeWidth={2} />
              </View>
            )}
            <Text className="text-sm font-bold text-gray-900">{plan.name}</Text>
            <View className="mt-1 flex-row items-baseline">
              <Text className="text-lg font-bold text-gray-900">
                {formatMonthlyPrice(plan, billing)}
              </Text>
              <Text className="text-[10px] text-gray-500">
                /{subscriptionScreen.billing.perMonth}
              </Text>
            </View>
            {billing === 'annual' && (
              <Text className="mt-0.5 text-[9px] text-gray-500">
                {subscriptionScreen.billing.annualNote}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
