import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { cx } from './cx';

export interface DotsProps {
  count: number;
  activeIndex: number;
  className?: string;
  testID?: string;
}

const INACTIVE_WIDTH = 8; // w-2
const ACTIVE_WIDTH = 24; // w-6
const TRANSITION_MS = 300;

function Dot({ active }: { active: boolean }) {
  const [width] = useState(() => new Animated.Value(active ? ACTIVE_WIDTH : INACTIVE_WIDTH));

  useEffect(() => {
    Animated.timing(width, {
      toValue: active ? ACTIVE_WIDTH : INACTIVE_WIDTH,
      duration: TRANSITION_MS,
      useNativeDriver: false,
    }).start();
  }, [active, width]);

  return (
    <Animated.View
      className={cx('h-2 rounded-full', active ? 'bg-accent' : 'bg-white/30')}
      style={{ width }}
    />
  );
}

/** Indicador de carrusel (`componentes.md`): punto activo se estira 8px -> 24px. */
export function Dots({ count, activeIndex, className, testID }: DotsProps) {
  return (
    <View
      className={cx('flex-row items-center justify-center gap-2', className)}
      accessibilityLabel={`Paso ${activeIndex + 1} de ${count}`}
      testID={testID}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} active={index === activeIndex} />
      ))}
    </View>
  );
}
