import { Text, View } from 'react-native';
import { cx } from './cx';

export interface StepperProps {
  current: 1 | 2;
  testID?: string;
}

const STEPS: { step: 1 | 2; label: string }[] = [
  { step: 1, label: '1 Cuenta' },
  { step: 2, label: '2 Pago' },
];

/**
 * Indicador de paso del flujo Registro -> Pago (`pantallas-nuevas.md:24`). Los
 * labels en espanol son constantes propias del componente, no vienen de
 * `src/data`: no hay otra pantalla que los reutilice.
 */
export function Stepper({ current, testID }: StepperProps) {
  return (
    <View className="flex-row gap-2" testID={testID}>
      {STEPS.map(({ step, label }) => {
        const active = step === current;

        return (
          <View
            key={step}
            className={cx('rounded-full px-4 py-2', active ? 'bg-dark-green' : 'bg-black/5')}
          >
            <Text
              accessibilityRole={active ? 'header' : undefined}
              className={cx('text-xs font-bold', active ? 'text-white' : 'text-gray-500')}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
