/**
 * Copy y assets estaticos de la pantalla Inicio (`02-Analisis-Visual/pantallas/inicio.md`,
 * `contenido-textos.json` -> `index`). Consumido por `src/features/home/*` a lo largo
 * de las fases 4-6 del plan; el copy va en espanol tal cual el spec.
 */

export interface HomeHero {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export interface HomeVideoSection {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  videoLabel: string;
}

export interface HomeZone {
  slug: string;
  name: string;
  /** Resultado de `require()`, resuelto por Metro a un modulo numerico. */
  image: number;
}

export interface HomeZonesSection {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export interface HomeTestimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  /** Resultado de `require()`, resuelto por Metro a un modulo numerico. */
  image: number;
}

export interface HomeTestimonialsSection {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export interface HomeAlly {
  id: string;
  name: string;
  /** Resultado de `require()`, resuelto por Metro a un modulo numerico. */
  logo: number;
}

export interface HomeAlliesSection {
  title: string;
  subtitle: string;
}

export interface HomeStats {
  lead: string;
  value: number;
  display: string;
  caption: string;
  cta: string;
  ctaHref: string;
}

export const hero: HomeHero = {
  title: 'Juntos cuidamos lo que nos conecta',
  subtitle: 'Conectamos aportes, proyectos y seguimiento en un mismo lugar',
  cta: 'Explorar Zonas de Impacto',
  ctaHref: '/zones',
};

export const videoSection: HomeVideoSection = {
  title: 'Conoce qué es One Impact',
  subtitle: 'Conectamos aportes, proyectos y seguimiento en un mismo lugar',
  cta: 'Quiero hacer parte',
  ctaHref: '/subscription',
  videoLabel: 'Ver video',
};

export const homeZones: HomeZone[] = [
  { slug: 'amazonia', name: 'Amazonia', image: require('@/assets/images/zones/amazonia.jpg') },
  { slug: 'borneo', name: 'Borneo', image: require('@/assets/images/zones/borneo.jpg') },
  { slug: 'patagonia', name: 'Patagonia', image: require('@/assets/images/zones/patagonia.jpg') },
];

export const zonesSection: HomeZonesSection = {
  title: 'Nuestras zonas one impact',
  subtitle: 'Conectamos aportes, proyectos y seguimiento en un mismo lugar',
  cta: 'Explora todas las zonas',
  ctaHref: '/zones',
};

export const testimonials: HomeTestimonial[] = [
  {
    id: 'ana-rodriguez',
    name: 'Ana Rodriguez',
    role: 'Agente de cambio, Colombia',
    quote:
      'Gracias a One Impact, hemos podido conectar con comunidades y proyectos que comparten nuestra visión de un futuro sostenible para la Amazonia.',
    image: require('@/assets/images/testimonials/ana-rodriguez.jpg'),
  },
  {
    id: 'carlos-mendez',
    name: 'Carlos Méndez',
    role: 'Líder comunitario, Brasil',
    quote:
      'La plataforma nos permitió hacer visible el trabajo de años de nuestra comunidad y recibir el apoyo necesario para continuar protegiendo el bosque.',
    image: require('@/assets/images/testimonials/carlos-mendez.jpg'),
  },
  {
    id: 'lucia-torres',
    name: 'Lucía Torres',
    role: 'Investigadora ambiental, México',
    quote:
      'One Impact crea puentes reales entre quienes quieren contribuir y quienes están en el campo generando impacto positivo día a día.',
    image: require('@/assets/images/testimonials/lucia-torres.jpg'),
  },
];

export const testimonialsSection: HomeTestimonialsSection = {
  title: 'Voces del cambio',
  subtitle: 'Haz clic en cada perfil para escuchar sus testimonios',
  cta: 'Conecta con la comunidad',
  ctaHref: '/zones',
};

export const allies: HomeAlly[] = [
  { id: 'wwf', name: 'WWF', logo: require('@/assets/images/allies/wwf.png') },
  { id: 'ci', name: 'Conservation International', logo: require('@/assets/images/allies/ci.png') },
  { id: 'tnc', name: 'The Nature Conservancy', logo: require('@/assets/images/allies/tnc.png') },
];

export const alliesSection: HomeAlliesSection = {
  title: 'Conoce a nuestros aliados',
  subtitle:
    'Instituciones globales que aportan legitimidad técnica y compromiso verificable en cada territorio',
};

export const stats: HomeStats = {
  lead: 'Únete a más de',
  value: 35000,
  display: '35K',
  caption: 'agentes de cambio',
  cta: 'Quiero unirme',
  ctaHref: '/subscription',
};

export const heroPoster: number = require('@/assets/images/hero-bg.jpg');
export const heroVideo: number = require('@/assets/videos/one-impact-intro.mp4');
export const videoThumbnail: number = require('@/assets/images/video-thumbnail.jpg');
export const statsBackground: number = require('@/assets/images/stats-bg.jpg');
