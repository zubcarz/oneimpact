import { View } from 'react-native';
import { cx } from './cx';

export interface ProgressBarProps {
  /** Porcentaje 0..100; se clampea y redondea antes de renderizar. */
  value: number;
  className?: string;
  testID?: string;
}

/** Barra de progreso de avance de proyecto (`componentes.md`). */
export function ProgressBar({ value, className, testID }: ProgressBarProps) {
  const clamped = Math.round(Math.min(100, Math.max(0, value)));

  return (
    <View
      className={cx('h-2 w-full rounded-full bg-cream', className)}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ now: clamped, min: 0, max: 100 }}
      testID={testID}
    >
      <View className="h-2 rounded-full bg-dark-green" style={{ width: `${clamped}%` }} />
    </View>
  );
}
