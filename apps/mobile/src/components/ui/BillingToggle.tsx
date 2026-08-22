import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Billing } from '@oneimpact/shared';
import { subscriptionScreen } from '@/data/subscription';
import { cx } from './cx';

export interface BillingToggleProps {
  value: Billing;
  onChange: (value: Billing) => void;
  className?: string;
  testID?: string;
}

/**
 * Selector Mensual/Anual de la pantalla Suscripcion
 * (`02-Analisis-Visual/pantallas/suscripcion.md`, seccion 2). Controlado: no
 * guarda estado propio, la pantalla decide el `billing` por defecto.
 */
export function BillingToggle({ value, onChange, className, testID }: BillingToggleProps) {
  const { monthly, annual } = subscriptionScreen.billing;
  const options: { id: Billing; label: string }[] = [
    { id: 'monthly', label: monthly },
    { id: 'annual', label: annual },
  ];

  const handlePress = (id: Billing) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(id);
  };

  return (
    <View className={cx('flex-row rounded-full bg-white p-1', className)} testID={testID}>
      {options.map((option) => {
        const selected = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => handlePress(option.id)}
            className={cx(
              'min-h-[44px] flex-1 items-center justify-center rounded-full active:opacity-90',
              selected && 'bg-dark-green',
            )}
          >
            <Text className={cx('text-sm font-bold', selected ? 'text-white' : 'text-gray-500')}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
