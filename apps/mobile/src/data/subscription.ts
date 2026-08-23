/**
 * Copy y datos derivados de la pantalla Suscripcion (`02-Analisis-Visual/pantallas/suscripcion.md`,
 * secciones 1 "Collage fotografico", 2 "Hero + selector de plan" y 3 "Beneficios") y
 * `contenido-textos.json`, clave `suscripcion[1]`. El copy va en espanol tal cual el vault.
 *
 * Los precios y nombres de plan NO se transcriben aca: se leen de `PLANS` /
 * `monthlyPriceFor` de `@oneimpact/shared` (`packages/shared/src/plans.ts:8-23`),
 * que es la unica fuente de precio para API, mobile y admin.
 */
import { monthlyPriceFor, type Billing, type Plan } from '@oneimpact/shared';

/**
 * Las 5 imagenes del collage con `require()` literal. Metro exige literales
 * estaticos: no se puede armar esta tabla con un template string (mismo motivo
 * que documenta `src/data/zones.ts:11-12`).
 */
export const COLLAGE = {
  row1: [
    require('@/assets/images/subscription/collage-1.jpg'),
    require('@/assets/images/subscription/collage-2.jpg'),
    require('@/assets/images/subscription/collage-3.jpg'),
  ] as number[],
  row2: {
    heroMain: require('@/assets/images/subscription/hero-main.jpg') as number,
    heroSecondary: require('@/assets/images/subscription/hero-secondary.jpg') as number,
  },
};

export interface SubscriptionScreenCopy {
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  disclaimer: string;
  benefitsTitle: string;
  billing: {
    monthly: string;
    annual: string;
    perMonth: string;
    annualNote: string;
  };
}

export const subscriptionScreen: SubscriptionScreenCopy = {
  heroTitle: 'Lo que haces hoy queda en el mundo',
  heroSubtitle: 'Elige cómo quieres sostenerlo.',
  ctaLabel: 'Comenzar mi travesía',
  disclaimer: 'Cancela cuando quieras, los registros de tu suscripción son permanentes.',
  benefitsTitle: 'Lo que incluye tu suscripción',
  billing: {
    monthly: 'Mensual',
    annual: 'Anual',
    perMonth: 'mes',
    annualNote: 'facturado anualmente',
  },
};

export interface BenefitCopy {
  id: 'ipass' | 'proyectos' | 'travesia' | 'academy' | 'wallet' | 'emergencias';
  title: string;
  description: string;
}

export const BENEFITS: BenefitCopy[] = [
  {
    id: 'ipass',
    title: 'Tu iPass',
    description: 'Tu identidad digital de impacto, registra cada proyecto, logro y contribución.',
  },
  {
    id: 'proyectos',
    title: 'Proyectos con coordenadas reales',
    description: 'Sabes exactamente dónde ocurre tu impacto y recibes evidencia audiovisual.',
  },
  {
    id: 'travesia',
    title: 'Tu línea de travesía',
    description:
      'Cada mes activo suma un punto permanente a tu historia. Lo que ya ocurrió no se cancela.',
  },
  {
    id: 'academy',
    title: 'Academy + comunidad',
    description:
      'Formación, foros, eventos y voluntariado, un ecosistema completo de personas que actúan.',
  },
  {
    id: 'wallet',
    title: 'Wallet + marketplace',
    description:
      'Tokens, insignias y activos digitales que acumulas y que puedes usar como moneda dentro del ecosistema.',
  },
  {
    id: 'emergencias',
    title: 'Fondo de emergencias',
    description:
      'Parte de tu suscripción ya está en el fondo de respuesta climática, antes de que ocurra, ya estás ahí.',
  },
];

/**
 * Formatea el precio mensual mostrado en `PlanSelector`, ej. `"$8"`. El monto
 * sale de `monthlyPriceFor` (`packages/shared/src/plans.ts:21-23`); esta
 * funcion solo agrega el simbolo, nunca reimplementa la tabla de precios.
 */
export function formatMonthlyPrice(plan: Plan, billing: Billing): string {
  return `$${monthlyPriceFor(plan, billing)}`;
}
