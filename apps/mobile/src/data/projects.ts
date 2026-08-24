/**
 * Copy y mappers de la pantalla Proyectos (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * seccion "Proyectos (`/projects`) -- publica"). Igual que `src/data/zones.ts`, los
 * datos (`Project`/`Zone`) llegan por `src/api/hooks` (`useProjects`, `useZones`);
 * este archivo solo mapea el contrato de `@oneimpact/shared` a la vista que
 * consumen las secciones, y conserva el copy estatico de marketing.
 */
import type { Project, Zone } from '@oneimpact/shared';
import { ProjectStatus } from '@oneimpact/shared';
import { assetForKey } from './zones';

export interface ProjectsScreenCopy {
  heroTitle: string;
  heroSubtitle: string;
  allZonesChipLabel: string;
  emptyTitle: string;
}

export const projectsScreen: ProjectsScreenCopy = {
  heroTitle: 'Proyectos en marcha',
  heroSubtitle:
    'Cada proyecto tiene coordenadas reales, evidencia y un porcentaje de avance verificado.',
  allZonesChipLabel: 'Todas',
  emptyTitle: 'Aún no hay proyectos aquí',
};

export interface ProjectsErrorCopy {
  title: string;
  body: string;
  retry: string;
}

/** Mismo tono que `ZonesError` (`src/features/zones/ZonesError.tsx:8-12`). */
export const projectsError: ProjectsErrorCopy = {
  title: 'No pudimos cargar los proyectos',
  body: 'Revisa tu conexión e intenta de nuevo.',
  retry: 'Reintentar',
};

/** Etiqueta en espanol de cada `ProjectStatus`, para el badge de estado de la card. */
export const projectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNED]: 'Planeado',
  [ProjectStatus.ACTIVE]: 'Activo',
  [ProjectStatus.COMPLETED]: 'Completado',
};

export interface ProjectCardView {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  statusLabel: string;
  progress: number;
  /** `undefined` cuando `coverKey` no tiene asset mapeado: la card cae al placeholder. */
  image: number | undefined;
  /** Nombre de la zona a la que pertenece, si se pudo resolver (ver `zoneId -> Zone`). */
  zoneName: string | undefined;
}

/**
 * `Project -> ProjectCardView`. Sigue el patron de `toZoneView`/`toAdvanceView`
 * (`src/data/zones.ts:76-109`): usa `assetForKey` para resolver `coverKey` a un
 * `require()`. A diferencia de esas dos, **nunca devuelve `undefined`**: en
 * Zonas una vista sin asset se descarta del listado porque la foto es el
 * contenido. Aca el proyecto es el dato (titulo, avance, coordenadas) y la
 * foto es el adorno, asi que una tarjeta sin imagen se degrada al placeholder
 * en vez de desaparecer -- perder un proyecto entero del listado por una
 * imagen faltante seria peor que mostrarlo sin foto.
 */
export function toProjectCardView(project: Project, zone: Zone | undefined): ProjectCardView {
  return {
    id: project.id,
    title: project.title,
    summary: project.summary,
    status: project.status,
    statusLabel: projectStatusLabels[project.status],
    progress: project.progress,
    image: project.coverKey ? assetForKey(project.coverKey) : undefined,
    zoneName: zone?.name,
  };
}
