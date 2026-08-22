import { Text, View } from 'react-native';
import { zoneDetail } from '@/data/zones';

/**
 * Estado vacio del bloque "Avances en esta zona" cuando la zona no tiene
 * ningun proyecto publicado (hoy, `patagonia`). Decision del roadmap: nunca
 * una seccion vacia ni un spinner infinito, se explica y se ofrece el mismo
 * CTA (`03-mobile-zones-screens.md`, seccion "Detalle").
 */
export function ZoneEmptyAdvances() {
  return (
    <View className="bg-forest px-5 py-14">
      <Text className="mb-3 text-xl font-bold text-white">{zoneDetail.emptyTitle}</Text>
      <Text className="text-sm leading-relaxed text-white/70">{zoneDetail.emptyBody}</Text>
    </View>
  );
}
