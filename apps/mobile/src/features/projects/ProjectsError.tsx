import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { projectsError } from '@/data/projects';

export interface ProjectsErrorProps {
  onRetry: () => void;
}

/**
 * Estado de error de red para Proyectos (lista y detalle): reemplaza el
 * contenido dependiente de `useProjects()`/`useProject()` cuando la request
 * falla, con un CTA que refetchea. Calcado de `ZonesError`
 * (`src/features/zones/ZonesError.tsx`) para que ambas pantallas se comporten
 * igual ante el mismo estado; copy propio (`projectsError` de
 * `src/data/projects.ts`). Fondo crema y boton pildora, tokens del sistema
 * (`60-design-system.md`); nada de hex suelto.
 */
export function ProjectsError({ onRetry }: ProjectsErrorProps) {
  return (
    <View className="items-center gap-4 bg-cream px-5 py-14" testID="projects-error">
      <Text className="text-center text-xl font-bold text-gray-900">{projectsError.title}</Text>
      <Text className="text-center text-sm leading-relaxed text-gray-600">
        {projectsError.body}
      </Text>
      <Button variant="dark" label={projectsError.retry} onPress={onRetry} />
    </View>
  );
}
