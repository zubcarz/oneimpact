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

export interface ProjectDetailCopy {
  back: string;
  /** Prefijo de "Avance verificado 64 %" (`pantallas-nuevas.md`, "Detalle de proyecto"); el numero lo agrega el consumidor. */
  progressLabel: string;
  openMap: string;
  /** Prefijo de la fecha objetivo formateada; el consumidor agrega la fecha ya formateada en espanol. */
  targetDateLabel: string;
  /** Titulo de la seccion `bg-forest` con `UpdateTimeline` (`ProjectUpdates.tsx`). */
  updatesTitle: string;
  updatesEmptyTitle: string;
  updatesEmptyBody: string;
  notFoundTitle: string;
  /** Titulo del `Alert.alert` cuando un invitado intenta seguir un proyecto (`app/projects/[id].tsx`). */
  loginRequiredTitle: string;
  loginRequiredBody: string;
  loginRequiredOk: string;
}

/** Copy del detalle de proyecto (`pantallas-nuevas.md`, "Detalle de proyecto"). */
export const projectDetail: ProjectDetailCopy = {
  back: 'Volver',
  progressLabel: 'Avance verificado',
  openMap: 'Ver ubicación en el mapa',
  targetDateLabel: 'Fecha objetivo:',
  updatesTitle: 'Avances',
  updatesEmptyTitle: 'Aún no hay avances publicados',
  updatesEmptyBody:
    'Este proyecto está en marcha. En cuanto haya novedades verificadas, las vas a ver aquí.',
  notFoundTitle: 'Proyecto no encontrado',
  loginRequiredTitle: 'Inicia sesión para seguir',
  loginRequiredBody: 'Crea una cuenta o inicia sesión para seguir este proyecto y sus avances.',
  loginRequiredOk: 'Entendido',
};

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

/**
 * Neutral photo used as `resolveProjectHeroImage`'s fallback: dark enough for
 * the hero's white text/gradient (`ProjectDetailHero`) to still read fine.
 * Reused from `about` (`pantallas-nuevas.md`, "Quienes somos"), not a new asset.
 */
const PROJECT_HERO_FALLBACK: number = require('@/assets/images/stats-bg.jpg');

/**
 * Resolves the hero image for the project detail screen (`app/projects/[id].tsx`).
 * Unlike `toProjectCardView.image` (optional, the card degrades to a plain
 * placeholder view), `ProjectDetailHero.image` is a required `number` -- the
 * hero always renders a photo behind its gradient. When `coverKey` is missing
 * or unmapped (D3, see `assetForKey`) this falls back to a neutral asset
 * instead of throwing, asserting, or making the hero's prop optional.
 */
export function resolveProjectHeroImage(coverKey: string | undefined): number {
  return (coverKey ? assetForKey(coverKey) : undefined) ?? PROJECT_HERO_FALLBACK;
}
