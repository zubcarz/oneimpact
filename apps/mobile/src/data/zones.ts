/**
 * Copy y mappers de la pantalla Zonas (`02-Analisis-Visual/pantallas/zonas.md`,
 * secciones 1 "Hero", 2 "Lista de zonas" y 3 "Avances desde el territorio") y del
 * detalle de zona (misma pagina, seccion "Detalle de zona `/zonas/[slug]`").
 * Los datos ya no se derivan del seed en este modulo: llegan por `src/api/hooks`
 * (`useZones`, `useProjects`, `useZone`), que consumen la API o MSW segun
 * `EXPO_PUBLIC_API_URL`. Este archivo solo mapea `Zone`/`Project` (el contrato
 * de `@oneimpact/shared`) a las vistas que consumen las secciones, y conserva
 * el copy estatico (contenido de marketing, no dato remoto).
 */
import type { Project, Zone } from '@oneimpact/shared';

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

/**
 * Non-throwing counterpart of `assetFor` for the remote path (D3): `Zone`/
 * `Project` records now come from the API (or MSW), so an image key without a
 * local `require()` in `ASSETS` -- e.g. content added later through the admin,
 * not yet bundled as a local asset -- must not crash the screen. Callers use
 * this to build a view and drop it if the image does not resolve, instead of
 * throwing.
 */
export function assetForKey(key: string): number | undefined {
  return ASSETS[key];
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
  title: string;
  body: string;
  image: number;
  year: number;
}

/**
 * `Zone -> ZoneView` (D3). Returns `undefined` when `imageKey` has no mapped
 * asset instead of throwing -- see `assetForKey`. Callers filter the
 * `undefined` entries out of the list.
 */
export function toZoneView(zone: Zone): ZoneView | undefined {
  const image = assetForKey(zone.imageKey);
  if (image === undefined) {
    return undefined;
  }
  return {
    slug: zone.slug,
    name: zone.name,
    description: zone.description,
    image,
    order: zone.order,
  };
}

/**
 * `Project -> AdvanceView` (D2): the advance card is derived straight from
 * the project (`title`, `summary`, `coverKey`, the year of `createdAt`), not
 * from a separate `ProjectUpdate`. One request (`useProjects()`) covers the
 * whole carousel -- no N+1 per project. Returns `undefined` when `coverKey`
 * is missing or has no mapped asset (D3); callers filter those out.
 */
export function toAdvanceView(project: Project): AdvanceView | undefined {
  const image = project.coverKey ? assetForKey(project.coverKey) : undefined;
  if (image === undefined) {
    return undefined;
  }
  return {
    id: project.id,
    title: project.title,
    body: project.summary,
    image,
    year: new Date(project.createdAt).getUTCFullYear(),
  };
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
