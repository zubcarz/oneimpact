import { Text, View } from 'react-native';
import { cx } from './cx';

export interface JourneyLineProps {
  activeMonths: number;
  totalPoints: number;
  className?: string;
  testID?: string;
}

/** Puntos fijos de la fila; uno por mes, tope 12 (`pantallas-nuevas.md`, "Dashboard", linea 41). */
const DOT_COUNT = 12;

/**
 * Fila horizontal de la "linea de travesia" del Dashboard: los primeros
 * `activeMonths` puntos en lima, el resto en gris. Presentacional pura.
 */
export function JourneyLine({ activeMonths, totalPoints, className, testID }: JourneyLineProps) {
  const activeDots = Math.min(activeMonths, DOT_COUNT);

  return (
    <View className={className} testID={testID}>
      <View className="flex-row gap-2">
        {Array.from({ length: DOT_COUNT }).map((_, index) => (
          <View
            key={index}
            testID={`journey-dot-${index}`}
            className={cx('h-2 w-2 rounded-full', index < activeDots ? 'bg-accent' : 'bg-gray-200')}
          />
        ))}
      </View>
      <Text className="mt-3 text-sm text-gray-600">
        {`${activeMonths} meses · ${totalPoints} puntos permanentes`}
      </Text>
    </View>
  );
}
