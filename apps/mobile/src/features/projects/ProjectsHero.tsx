import { Text, View } from 'react-native';
import { TopoLines } from '@/components/icons/TopoLines';
import { projectsScreen } from '@/data/projects';

/** Seccion 1 de Proyectos: hero de texto sobre crema con lineas topograficas, mismo patron que `ZonesHero` (`src/features/zones/ZonesHero.tsx:8-16`). */
export function ProjectsHero() {
  return (
    <View className="overflow-hidden bg-cream px-5 pb-14 pt-24">
      <TopoLines />
      <Text className="mb-4 text-4xl font-bold leading-tight text-gray-900">
        {projectsScreen.heroTitle}
      </Text>
      <Text className="max-w-lg text-base leading-relaxed text-gray-600">
        {projectsScreen.heroSubtitle}
      </Text>
    </View>
  );
}
