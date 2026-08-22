import { View } from 'react-native';
import { Image } from 'expo-image';
import { COLLAGE } from '@/data/subscription';

/**
 * Seccion 1 de Suscripcion: collage fotografico sin texto, el header flota
 * encima (`pantallas/suscripcion.md` #1). Puramente decorativo: sin
 * `accessibilityLabel`, oculto para el screen reader.
 */
export function SubscriptionCollage() {
  return (
    <View accessible={false}>
      <View className="flex-row">
        {COLLAGE.row1.map((source, index) => (
          <Image key={index} source={source} contentFit="cover" className="aspect-square flex-1" />
        ))}
      </View>
      <View className="h-56 flex-row">
        <Image
          source={COLLAGE.row2.heroMain}
          contentFit="cover"
          contentPosition="top"
          className="flex-[3]"
        />
        <Image source={COLLAGE.row2.heroSecondary} contentFit="cover" className="flex-[2]" />
      </View>
    </View>
  );
}
