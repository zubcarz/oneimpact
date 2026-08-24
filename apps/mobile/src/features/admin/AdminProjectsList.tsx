import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Project } from '@oneimpact/shared';
import { Button, ProjectCard } from '@/components/ui';
import { toProjectCardView } from '@/data/projects';
import { PublishUpdateForm } from './PublishUpdateForm';

export interface AdminProjectsListProps {
  projects: Project[];
  /** Llamado cuando cualquier fila publica un avance con exito. */
  onPublishSuccess: () => void;
  testID?: string;
}

/**
 * Lista de proyectos del atajo admin (`pantallas-nuevas.md:51-52`, "Admin
 * (mobile, solo rol admin)"): reusa `ProjectCard` tal cual (con `zoneName`
 * `undefined` -- resolver la zona aca complicaria de mas una pantalla que es
 * un atajo, no el admin completo), y agrega un boton "Publicar avance" por
 * fila. Al tocarlo expande `PublishUpdateForm` inline debajo de esa card
 * (estado local `selectedProjectId`), sin modal ni bottom-sheet nuevos.
 */
export function AdminProjectsList({ projects, onPublishSuccess, testID }: AdminProjectsListProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (projects.length === 0) {
    return (
      <View className="items-center px-5 pb-14" testID={`${testID ?? 'admin-projects-list'}-empty`}>
        <Text className="text-center text-base font-bold text-gray-900">
          Aún no hay proyectos aquí
        </Text>
      </View>
    );
  }

  const handleTogglePress = (id: string) => {
    setSelectedProjectId((current) => (current === id ? null : id));
  };

  const handlePublishSuccess = () => {
    setSelectedProjectId(null);
    onPublishSuccess();
  };

  return (
    <View className="gap-4 px-5 pb-14" testID={testID}>
      {projects.map((project) => {
        const isSelected = selectedProjectId === project.id;
        return (
          <View key={project.id} className="gap-3">
            <ProjectCard project={toProjectCardView(project, undefined)} />
            <Button
              label={isSelected ? 'Cancelar' : 'Publicar avance'}
              variant={isSelected ? 'ink' : 'dark'}
              onPress={() => handleTogglePress(project.id)}
              className="self-start"
              testID={`admin-project-${project.id}-toggle`}
            />
            {isSelected ? (
              <PublishUpdateForm
                projectId={project.id}
                onSuccess={handlePublishSuccess}
                testID={`admin-project-${project.id}-publish-form`}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
