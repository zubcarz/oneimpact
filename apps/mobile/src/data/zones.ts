/**
 * Copy y datos derivados de la pantalla Zonas (`02-Analisis-Visual/pantallas/zonas.md`,
 * secciones 1 "Hero", 2 "Lista de zonas" y 3 "Avances desde el territorio") y del
 * detalle de zona (misma pagina, seccion "Detalle de zona `/zonas/[slug]`").
 * Fuente de datos: `SEED_ZONES` / `SEED_PROJECTS` de `@oneimpact/shared`, el
 * mismo dataset que consumen la API y MSW. El copy va en espanol tal cual el vault.
 */
import { SEED_PROJECTS, SEED_ZONES, type SeedProject } from '@oneimpact/shared';

/**
 * Mapa clave de asset (tal como lo entrega el seed) -> `require()`. Metro exige
 * literales estaticos: no se puede armar esta tabla con un template string.
 */
const ASSETS: Record<string, number> = {
  'zones/amazonia.jpg': require('@/assets/images/zones/amazonia.jpg'),
  'zones/mexico.jpg': require('@/assets/images/zones/mexico.jpg'),
  'zones/africa.jpg': require('@/assets/images/zones/africa.jpg'),
  'zones/borneo.jpg': require('@/assets/images/zones/borneo.jpg'),
  'zones/patagonia.jpg': require('@/assets/images/zones/patagonia.jpg'),
  'advances/guainia.jpg': require('@/assets/images/advances/guainia.jpg'),
  'advances/yucatan.jpg': require('@/assets/images/advances/yucatan.jpg'),
  'advances/corredores.jpg': require('@/assets/images/advances/corredores.jpg'),
  'advances/borneo-monitoreo.jpg': require('@/assets/images/advances/borneo-monitoreo.jpg'),
  'advances/amazonia-carbono.jpg': require('@/assets/images/advances/amazonia-carbono.jpg'),
};

/**
 * Resuelve una clave de asset del seed a su modulo `require()`. Una clave sin
 * asset mapeado es un error de datos (seed y assets desincronizados), no un
 * caso a resolver con un placeholder silencioso.
 */
export function assetFor(key: string): number {
  const asset = ASSETS[key];
  if (!asset) {
    throw new Error(`No hay asset mapeado para la clave "${key}"`);
  }
  return asset;
}

export interface ZoneView {
  slug: string;
  name: string;
  description: string;
  image: number;
  order: number;
}

export interface AdvanceView {
  id: string;
  zoneSlug: string;
  title: string;
  body: string;
  image: number;
  year: number;
}

export const zones: ZoneView[] = [...SEED_ZONES]
  .sort((a, b) => a.order - b.order)
  .map((zone) => ({
    slug: zone.slug,
    name: zone.name,
    description: zone.description,
    image: assetFor(zone.imageKey),
    order: zone.order,
  }));

export const advances: AdvanceView[] = SEED_PROJECTS.map((project) => {
  const [update] = project.updates;
  return {
    id: update.id,
    zoneSlug: project.zoneSlug,
    title: update.title,
    body: update.body,
    image: assetFor(update.mediaKey ?? project.coverKey ?? ''),
    year: new Date(update.publishedAt).getUTCFullYear(),
  };
});

export function getZone(slug: string): ZoneView | undefined {
  return zones.find((zone) => zone.slug === slug);
}

export function advancesByZone(slug: string): AdvanceView[] {
  return advances.filter((advance) => advance.zoneSlug === slug);
}

export function projectsByZone(slug: string): SeedProject[] {
  return SEED_PROJECTS.filter((project) => project.zoneSlug === slug);
}

export interface ZonesScreenCopy {
  heroTitle: string;
  heroSubtitle: string;
  advancesTitle: string;
  advancesSubtitle: string;
  chipLabel: string;
}

export const zonesScreen: ZonesScreenCopy = {
  heroTitle: 'Zonas One Impact',
  heroSubtitle:
    'Conoce los territorios donde ya hemos ejecutado iniciativas y los que se integrarán en las próximas fases.',
  advancesTitle: 'Avances desde el territorio',
  advancesSubtitle:
    'Somos la fuerza colectiva que moviliza las acciones individuales hacia la restauración planetaria.',
  chipLabel: 'Ver más',
};

export interface ZoneDetailCopy {
  advancesTitle: string;
  emptyTitle: string;
  emptyBody: string;
  cta: string;
  ctaHref: string;
  notFoundTitle: string;
  back: string;
}

export const zoneDetail: ZoneDetailCopy = {
  advancesTitle: 'Avances en esta zona',
  emptyTitle: 'Aún no hay avances publicados',
  emptyBody:
    'Esta zona está en preparación. Suscríbete para enterarte cuando arranquen los primeros proyectos.',
  cta: 'Quiero aportar',
  ctaHref: '/subscription',
  notFoundTitle: 'Zona no encontrada',
  back: 'Volver',
};
