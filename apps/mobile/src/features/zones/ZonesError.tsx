import { Text, View } from 'react-native';
import { Button } from '@/components/ui';

export interface ZonesErrorProps {
  onRetry: () => void;
}

const COPY = {
  title: 'No pudimos cargar las zonas',
  body: 'Revisa tu conexión e intenta de nuevo.',
  retry: 'Reintentar',
};

/**
 * Estado de error de red para Zonas (lista y detalle): reemplaza el contenido
 * dependiente de `useZones()`/`useProjects()`/`useZone()` cuando la request
 * falla, con un CTA que refetchea. Fondo crema y boton pildora, tokens del
 * sistema (`60-design-system.md`); nada de hex suelto.
 */
export function ZonesError({ onRetry }: ZonesErrorProps) {
  return (
    <View className="items-center gap-4 bg-cream px-5 py-14" testID="zones-error">
      <Text className="text-center text-xl font-bold text-gray-900">{COPY.title}</Text>
      <Text className="text-center text-sm leading-relaxed text-gray-600">{COPY.body}</Text>
      <Button variant="dark" label={COPY.retry} onPress={onRetry} />
    </View>
  );
}
