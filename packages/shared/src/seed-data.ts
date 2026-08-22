import { ProjectStatus } from './enums';
import type { Zone, Project, ProjectUpdate } from './types/catalog';
import { PLANS } from './plans';

export type SeedZone = Omit<Zone, 'id'>;

export type SeedProjectUpdate = Omit<ProjectUpdate, 'projectId' | 'authorId'>;

export type SeedProject = Omit<Project, 'id' | 'zoneId' | 'createdAt'> & {
  zoneSlug: string;
  updates: SeedProjectUpdate[];
};

/**
 * Zones for the demo dataset, consumed by the API seed, the e2e fixtures and
 * MSW handlers. Descriptions are taken verbatim from the vault
 * (02-Analisis-Visual/pantallas/zonas.md, sections "2. Lista de zonas" and
 * the two proposed RN-only zones).
 */
export const SEED_ZONES: SeedZone[] = [
  {
    slug: 'amazonia',
    name: 'Amazonía',
    description: 'Pulmón verde clave para la estabilización climática del planeta.',
    imageKey: 'zones/amazonia.jpg',
    order: 1,
  },
  {
    slug: 'mexico',
    name: 'México',
    description:
      'Hogar de los manglares más estratégicos del planeta para la captura de carbono y la preservación costera.',
    imageKey: 'zones/mexico.jpg',
    order: 2,
  },
  {
    slug: 'africa',
    name: 'África',
    description:
      'Territorio esencial para la resiliencia climática global y la protección de comunidades.',
    imageKey: 'zones/africa.jpg',
    order: 3,
  },
  {
    slug: 'borneo',
    name: 'Borneo',
    description:
      'Selvas tropicales con una de las mayores biodiversidades del planeta, bajo monitoreo satelital permanente.',
    imageKey: 'zones/borneo.jpg',
    order: 4,
  },
  {
    slug: 'patagonia',
    name: 'Patagonia',
    description:
      'Ecosistemas australes clave para la conservación de agua dulce y especies endémicas.',
    imageKey: 'zones/patagonia.jpg',
    order: 5,
  },
];

/** Same source as the pricing shown across mobile/admin, no duplicated prices. */
export const SEED_PLANS = PLANS;

/**
 * Projects derived 1:1 from the "Avances desde el territorio" carousel
 * (zonas.md, section 3). Zone mapping follows "Detalle de zona":
 * Guainía/Amazonía -> amazonia, Yucatán -> mexico, savana -> africa,
 * Borneo -> borneo. Each project ships with exactly one publisher update
 * whose title/body mirror the advance verbatim.
 */
export const SEED_PROJECTS: SeedProject[] = [
  {
    slug: 'guainia',
    zoneSlug: 'amazonia',
    title: 'Restauración de ecosistemas en Guainía',
    summary:
      'Ejecutamos el plan de restauración activa en seis cuencas hidrográficas clave, consolidando el corredor ecológico y la biodiversidad local.',
    description:
      'Ejecutamos el plan de restauración activa en seis cuencas hidrográficas clave, consolidando el corredor ecológico y la biodiversidad local.',
    status: ProjectStatus.ACTIVE,
    progress: 64, // proposed: no esta en el vault
    targetDate: '2026-12-31T00:00:00.000Z', // proposed: no esta en el vault
    lat: 3.87, // proposed: no esta en el vault
    lng: -67.92, // proposed: no esta en el vault
    coverKey: 'advances/guainia.jpg',
    updates: [
      {
        id: 'guainia-update-1',
        title: 'Restauración de ecosistemas en Guainía',
        body: 'Ejecutamos el plan de restauración activa en seis cuencas hidrográficas clave, consolidando el corredor ecológico y la biodiversidad local.',
        progress: 64, // proposed: no esta en el vault
        mediaKey: 'advances/guainia.jpg',
        publishedAt: '2026-02-10T12:00:00.000Z',
      },
    ],
  },
  {
    slug: 'yucatan',
    zoneSlug: 'mexico',
    title: 'Inicio de diagnóstico ecológico costero en Yucatán',
    summary:
      'Iniciamos la caracterización ambiental en zonas prioritarias de manglar para definir áreas de conservación y establecer línea base de captura de carbono y biodiversidad.',
    description:
      'Iniciamos la caracterización ambiental en zonas prioritarias de manglar para definir áreas de conservación y establecer línea base de captura de carbono y biodiversidad.',
    status: ProjectStatus.ACTIVE,
    progress: 25, // proposed: no esta en el vault
    targetDate: '2026-12-31T00:00:00.000Z', // proposed: no esta en el vault
    lat: 20.7, // proposed: no esta en el vault
    lng: -89.1, // proposed: no esta en el vault
    coverKey: 'advances/yucatan.jpg',
    updates: [
      {
        id: 'yucatan-update-1',
        title: 'Inicio de diagnóstico ecológico costero en Yucatán',
        body: 'Iniciamos la caracterización ambiental en zonas prioritarias de manglar para definir áreas de conservación y establecer línea base de captura de carbono y biodiversidad.',
        progress: 25, // proposed: no esta en el vault
        mediaKey: 'advances/yucatan.jpg',
        publishedAt: '2026-03-18T12:00:00.000Z',
      },
    ],
  },
  {
    slug: 'corredores',
    zoneSlug: 'africa',
    title: 'Diseño de corredores verdes en savana oriental',
    summary:
      'Concluimos los primeros modelos de corredores, incluyendo la definición de zonas, modelación de flujos y proyección de impacto a 10 años.',
    description:
      'Concluimos los primeros modelos de corredores, incluyendo la definición de zonas, modelación de flujos y proyección de impacto a 10 años.',
    status: ProjectStatus.ACTIVE,
    progress: 40, // proposed: no esta en el vault
    targetDate: '2026-12-31T00:00:00.000Z', // proposed: no esta en el vault
    lat: 0.5, // proposed: no esta en el vault
    lng: 37.5, // proposed: no esta en el vault
    coverKey: 'advances/corredores.jpg',
    updates: [
      {
        id: 'corredores-update-1',
        title: 'Diseño de corredores verdes en savana oriental',
        body: 'Concluimos los primeros modelos de corredores, incluyendo la definición de zonas, modelación de flujos y proyección de impacto a 10 años.',
        progress: 40, // proposed: no esta en el vault
        mediaKey: 'advances/corredores.jpg',
        publishedAt: '2026-04-22T12:00:00.000Z',
      },
    ],
  },
  {
    slug: 'borneo-monitoreo',
    zoneSlug: 'borneo',
    title: 'Sistema de monitoreo satelital en Borneo',
    summary:
      'Implementamos sensores remotos y alertas tempranas para detectar deforestación en tiempo real en zonas críticas de biodiversidad.',
    description:
      'Implementamos sensores remotos y alertas tempranas para detectar deforestación en tiempo real en zonas críticas de biodiversidad.',
    status: ProjectStatus.ACTIVE,
    progress: 80, // proposed: no esta en el vault
    targetDate: '2026-12-31T00:00:00.000Z', // proposed: no esta en el vault
    lat: 1.0, // proposed: no esta en el vault
    lng: 114.0, // proposed: no esta en el vault
    coverKey: 'advances/borneo-monitoreo.jpg',
    updates: [
      {
        id: 'borneo-monitoreo-update-1',
        title: 'Sistema de monitoreo satelital en Borneo',
        body: 'Implementamos sensores remotos y alertas tempranas para detectar deforestación en tiempo real en zonas críticas de biodiversidad.',
        progress: 80, // proposed: no esta en el vault
        mediaKey: 'advances/borneo-monitoreo.jpg',
        publishedAt: '2026-05-30T12:00:00.000Z',
      },
    ],
  },
  {
    slug: 'amazonia-carbono',
    zoneSlug: 'amazonia',
    title: 'Certificación de créditos de carbono en Amazonía',
    summary:
      'Completamos la validación de 120,000 hectáreas bajo estándar Verra, habilitando la primera emisión de créditos verificados del proyecto.',
    description:
      'Completamos la validación de 120,000 hectáreas bajo estándar Verra, habilitando la primera emisión de créditos verificados del proyecto.',
    status: ProjectStatus.COMPLETED,
    progress: 100, // proposed: no esta en el vault
    targetDate: '2026-06-15T12:00:00.000Z', // proposed: no esta en el vault (COMPLETED -> usa publishedAt)
    lat: -3.4, // proposed: no esta en el vault
    lng: -62.2, // proposed: no esta en el vault
    coverKey: 'advances/amazonia-carbono.jpg',
    updates: [
      {
        id: 'amazonia-carbono-update-1',
        title: 'Certificación de créditos de carbono en Amazonía',
        body: 'Completamos la validación de 120,000 hectáreas bajo estándar Verra, habilitando la primera emisión de créditos verificados del proyecto.',
        progress: 100, // proposed: no esta en el vault
        mediaKey: 'advances/amazonia-carbono.jpg',
        publishedAt: '2026-06-15T12:00:00.000Z',
      },
    ],
  },
];
