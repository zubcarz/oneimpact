/**
 * Copy de la pantalla "Quienes somos" (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * seccion "Quienes somos (`/about`)"). El vault trae el H1 literal, los tres
 * titulos de bloque y el tono general ("aportes, proyectos y seguimiento en un
 * mismo lugar"), pero no las frases de los bloques ni el copy de aliados: esas
 * lineas son propuestas propias, marcadas `// proposed` con la misma
 * convencion que `packages/shared/src/seed-data.ts`.
 */

export interface AboutHeroCopy {
  title: string;
  /** Etiqueta accesible del boton de volver del hero. */
  back: string;
}

/** Literal del vault (`pantallas-nuevas.md:18`); `back` es copy de navegacion. */
export const aboutHero: AboutHeroCopy = {
  title: 'Infraestructura abierta para el impacto colectivo',
  back: 'Volver',
};

export interface AboutPillar {
  /**
   * Icono de `src/components/icons/benefits/index.ts`, mapeado a su
   * componente en `AboutPillars.tsx` (Fase 3, accion 4 -- fuera de esta
   * tarea). Los tres SVG son los de beneficios reutilizados fuera de su
   * contexto original, por forma:
   * - `projects` -> `ProjectsIcon` (marcador de ubicacion: territorio/proyectos).
   * - `shield` -> `EmergencyIcon` (el escudo se lee como resguardo/verificacion,
   *   no como emergencia).
   * - `identity` -> `IPassIcon` (carnet: identidad de quienes estan detras).
   */
  icon: 'projects' | 'shield' | 'identity';
  title: string;
  description: string;
}

/** Los tres titulos son literales del vault (`pantallas-nuevas.md:19`). */
export const aboutPillars: AboutPillar[] = [
  {
    icon: 'projects',
    title: 'Qué hacemos',
    description:
      'Conectamos aportes, proyectos y seguimiento en un mismo lugar: cada suscripción financia proyectos reales, con coordenadas y avances verificables.', // proposed: no esta en el vault
  },
  {
    icon: 'shield',
    title: 'Cómo verificamos',
    description:
      'Cada avance publicado queda con fecha, evidencia y porcentaje de progreso: nada se marca como hecho sin respaldo.', // proposed: no esta en el vault
  },
  {
    icon: 'identity',
    title: 'Quién está detrás',
    description:
      'Un equipo que trabaja con aliados sobre el terreno en cada zona, no una promesa abstracta de impacto.', // proposed: no esta en el vault
  },
];

export interface AboutCtaCopy {
  label: string;
  href: string;
}

/** Label literal del vault (`pantallas-nuevas.md:20`); destino propio, no esta en el vault. */
export const aboutCta: AboutCtaCopy = {
  label: 'Quiero hacer parte',
  href: '/subscription', // proposed: no esta en el vault
};
