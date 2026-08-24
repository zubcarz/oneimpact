import { Linking, Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { ProgressBar } from '@/components/ui';
import { projectDetail } from '@/data/projects';

export interface ProjectFactsProps {
  /** 0..100, mismo rango que `ProgressBar` clampea internamente. */
  progress: number;
  /** `undefined` cuando el proyecto no tiene coordenadas cargadas (`projectSchema:37-38`, opcionales): la fila no se renderiza. */
  lat: number | undefined;
  lng: number | undefined;
  /** ISO datetime; `undefined` cuando el proyecto no tiene fecha objetivo (`projectSchema:36`, opcional): la fila no se renderiza. */
  targetDate: string | undefined;
  className?: string;
  testID?: string;
}

/** Fecha larga en espanol, mismo criterio que `UpdateTimeline.formatPublishedAt` (`src/components/ui/UpdateTimeline.tsx:17-23`). */
function formatDateEs(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function openInMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Bloque blanco de datos verificados del detalle de proyecto
 * (`pantallas-nuevas.md`, "Detalle de proyecto"): avance, coordenadas y fecha
 * objetivo. `lat`/`lng` y `targetDate` son opcionales en `projectSchema`
 * (`packages/shared/src/schemas/catalog.ts:36-38`): cuando faltan, la fila
 * correspondiente no se pinta en vez de mostrar un guion o un "N/D".
 */
export function ProjectFacts({
  progress,
  lat,
  lng,
  targetDate,
  className,
  testID,
}: ProjectFactsProps) {
  const clamped = Math.round(Math.min(100, Math.max(0, progress)));
  const hasCoordinates = lat !== undefined && lng !== undefined;

  return (
    <View className={className} testID={testID}>
      <ProgressBar value={progress} className="h-3" />
      <Text className="mt-3 text-base font-bold text-gray-900">
        {`${projectDetail.progressLabel} ${clamped} %`}
      </Text>

      {hasCoordinates ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={projectDetail.openMap}
          onPress={() => openInMaps(lat, lng)}
          className="mt-5 min-h-[44px] flex-row items-center gap-2 active:opacity-70"
        >
          <MapPin size={18} color={colors.gray700} />
          <Text className="text-sm text-gray-700 underline">{formatCoordinates(lat, lng)}</Text>
        </Pressable>
      ) : null}

      {targetDate !== undefined ? (
        <View className="mt-4">
          <Text className="text-sm text-gray-700">
            {`${projectDetail.targetDateLabel} ${formatDateEs(targetDate)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
