import { Text, View } from 'react-native';
import { AdvanceCard } from '@/components/ui';
import { zoneDetail, type AdvanceView } from '@/data/zones';

export interface ZoneAdvancesProps {
  advances: AdvanceView[];
}

/**
 * Bloque forest "Avances en esta zona" del detalle (`pantallas/zonas.md`,
 * "Detalle de zona"). A diferencia del carrusel de la pantalla Zonas, aca la
 * lista es vertical: cada `AdvanceCard` se estira a `w-full` sobreescribiendo
 * su ancho fijo por defecto (`w-[220px]`, ver `AdvanceCard.tsx`).
 */
export function ZoneAdvances({ advances }: ZoneAdvancesProps) {
  return (
    <View className="bg-forest px-5 py-14">
      <Text className="mb-8 text-3xl font-bold text-white">{zoneDetail.advancesTitle}</Text>
      <View className="gap-8">
        {advances.map((advance) => (
          <View key={advance.id} className="w-full">
            <AdvanceCard
              title={advance.title}
              body={advance.body}
              image={advance.image}
              year={advance.year}
              className="w-full"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
