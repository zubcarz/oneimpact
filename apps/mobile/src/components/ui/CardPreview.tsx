import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { detectCardBrand, type CardBrand } from '@oneimpact/shared';

export interface CardPreviewProps {
  /** Numero de tarjeta tal como se escribe. Nunca se pinta completo. */
  pan: string;
  holder: string;
  expMonth: string;
  expYear: string;
  /** Alimenta la animacion de "enviando pago" mientras la mutacion esta en curso. */
  pulsing?: boolean;
  testID?: string;
}

const BULLET = '•';

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  amex: 'AMEX',
  unknown: '',
};

/**
 * Enmascara el PAN dejando visibles solo los ultimos 4 digitos, agrupados de a
 * 4 igual que el resto de la tarjeta. Con el campo vacio muestra el patron de
 * placeholder completo. Es la unica funcion del componente que toca el numero
 * crudo: nunca se pasa a `console`, a un `Text` sin pasar por aca, ni afuera.
 */
function maskPan(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (digits.length === 0) {
    return `${BULLET.repeat(4)} ${BULLET.repeat(4)} ${BULLET.repeat(4)} ${BULLET.repeat(4)}`;
  }

  const last4 = digits.slice(-4);
  const hiddenLength = Math.max(digits.length - 4, 0);
  const hiddenGroups: string[] = [];
  for (let i = 0; i < hiddenLength; i += 4) {
    hiddenGroups.push(BULLET.repeat(Math.min(4, hiddenLength - i)));
  }

  return [...hiddenGroups, last4].join(' ');
}

/**
 * Vista de tarjeta del paso de Pago simulado (`pantallas-nuevas.md:30`).
 * Reacciona al tipeo (numero enmascarado, titular, vencimiento, marca) sin
 * exponer el PAN completo en ningun momento.
 */
export function CardPreview({ pan, holder, expMonth, expYear, pulsing, testID }: CardPreviewProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (pulsing) {
      opacity.value = withRepeat(withTiming(0.4, { duration: 600 }), -1, true);
    } else {
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 150 });
    }

    return () => cancelAnimation(opacity);
  }, [pulsing, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const brand = detectCardBrand(pan);
  const brandLabel = BRAND_LABEL[brand];
  const maskedPan = maskPan(pan);
  const shortYear = expYear ? expYear.slice(-2) : 'AA';

  return (
    <Animated.View style={animatedStyle} testID={testID}>
      <View className="rounded-3xl bg-forest p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-widest text-white/50">Tarjeta</Text>
          {brandLabel ? (
            <Text className="font-black text-xs tracking-widest text-white/70">{brandLabel}</Text>
          ) : null}
        </View>

        <Text
          className="mt-6 text-lg font-bold tracking-widest text-white"
          accessibilityLabel="Numero de tarjeta enmascarado"
        >
          {maskedPan}
        </Text>

        <View className="mt-6 flex-row items-end justify-between">
          <View>
            <Text className="text-[10px] uppercase text-white/50">Titular</Text>
            <Text className="text-sm font-bold text-white">{holder || '—'}</Text>
          </View>
          <View>
            <Text className="text-[10px] uppercase text-white/50">Vence</Text>
            <Text className="text-sm font-bold text-white">
              {expMonth || 'MM'}/{shortYear}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
