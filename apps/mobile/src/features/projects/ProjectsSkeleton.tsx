import { View } from 'react-native';

const ROW_COUNT = 5;

/**
 * Placeholder de carga para la lista de Proyectos mientras
 * `useProjects()`/`useZones()` resuelven (`pantallas-nuevas.md`, seccion
 * "Proyectos"). Calcado de `ZonesSkeleton` (`src/features/zones/ZonesSkeleton.tsx`)
 * para que ambas pantallas se comporten igual ante el mismo estado. Cinco
 * filas `h-52 rounded-3xl` como placeholder generico de card; solo tokens de
 * color (`bg-cream`, `gray-200`), sin hex suelto.
 */
export function ProjectsSkeleton() {
  return (
    <View className="gap-4 bg-cream px-5 pb-14" testID="projects-skeleton">
      {Array.from({ length: ROW_COUNT }).map((_, index) => (
        <View key={index} className="h-52 w-full rounded-3xl bg-gray-200" />
      ))}
    </View>
  );
}
