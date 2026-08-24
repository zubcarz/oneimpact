import { View } from 'react-native';

const ROW_COUNT = 5;

/**
 * Placeholder de carga para la seccion 2 "Lista de zonas" mientras
 * `useZones()`/`useProjects()` resuelven (`pantallas/zonas.md` #2). Reemplaza
 * `ZonesList` + `AdvancesCarousel` -- no toca `ZonesHero`, que es copy estatico
 * y no depende de red. Cinco filas `h-52 rounded-3xl` porque hoy son las cinco
 * zonas del seed; con datos cargados el bloque real ocupa el mismo layout.
 * Solo tokens de color (`bg-cream`, `gray-200`), sin hex suelto.
 */
export function ZonesSkeleton() {
  return (
    <View className="gap-4 bg-cream px-5 pb-14" testID="zones-skeleton">
      {Array.from({ length: ROW_COUNT }).map((_, index) => (
        <View key={index} className="h-52 w-full rounded-3xl bg-gray-200" />
      ))}
    </View>
  );
}
