import { Text, View } from 'react-native';
import { ProjectCard } from '@/components/ui';
import { projectsScreen, type ProjectCardView } from '@/data/projects';

export interface ProjectsListProps {
  projects: ProjectCardView[];
  onPressProject: (id: string) => void;
}

/**
 * Seccion 3 de Proyectos: columna de `ProjectCard` (`pantallas-nuevas.md`,
 * "Proyectos (`/projects`) -- publica"). Presentacional: recibe `projects` ya
 * filtrado y mapeado por la ruta, no llama hooks de red -- mismo patron que
 * `ZonesList` (`src/features/zones/ZonesList.tsx`). El vacio (0 proyectos tras
 * filtrar, p. ej. la zona Patagonia) se resuelve aca porque es donde se sabe
 * que la lista quedo en cero.
 */
export function ProjectsList({ projects, onPressProject }: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <View className="items-center bg-cream px-5 pb-14" testID="projects-empty">
        <Text className="text-center text-base font-bold text-gray-900">
          {projectsScreen.emptyTitle}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4 bg-cream px-5 pb-14">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onPress={() => onPressProject(project.id)}
        />
      ))}
    </View>
  );
}
