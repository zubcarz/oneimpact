import { FlatList, Text, View } from 'react-native';
import { Button, ProjectCard, SectionHeader } from '@/components/ui';
import type { ProjectCardView } from '@/data/projects';

export interface FollowedProjectsProps {
  projects: ProjectCardView[];
  onPressProject: (id: string) => void;
  onExplorePress: () => void;
}

const CARD_GAP = 16;

/**
 * Seccion "Tus proyectos" del Dashboard: carrusel horizontal de las tarjetas
 * seguidas, o el estado vacio con CTA "Explorar proyectos"
 * (`pantallas-nuevas.md`, "Dashboard", linea 42).
 */
export function FollowedProjects({
  projects,
  onPressProject,
  onExplorePress,
}: FollowedProjectsProps) {
  return (
    <View className="py-6">
      <View className="px-5">
        <SectionHeader title="Tus proyectos" weight="bold" titleClassName="text-2xl mb-4" />
      </View>
      {projects.length === 0 ? (
        <View className="mx-5 gap-4 rounded-2xl bg-cream px-5 py-6">
          <Text className="text-sm text-gray-600">Aún no sigues ningún proyecto.</Text>
          <Button
            label="Explorar proyectos"
            variant="dark"
            onPress={onExplorePress}
            className="self-start"
          />
        </View>
      ) : (
        <FlatList
          horizontal
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: CARD_GAP }}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => onPressProject(item.id)}
              className="w-[75vw]"
            />
          )}
        />
      )}
    </View>
  );
}
