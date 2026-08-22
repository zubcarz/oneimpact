import { PLANS } from '@oneimpact/shared';
import { BENEFITS, formatMonthlyPrice, subscriptionScreen } from '@/data/subscription';

describe('subscription data layer', () => {
  it('exposes 6 benefits, unique ids, in the spec order', () => {
    expect(BENEFITS).toHaveLength(6);
    expect(BENEFITS.map((benefit) => benefit.id)).toEqual([
      'ipass',
      'proyectos',
      'travesia',
      'academy',
      'wallet',
      'emergencias',
    ]);
    const ids = BENEFITS.map((benefit) => benefit.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches the vault copy exactly, accents included', () => {
    expect(subscriptionScreen.heroTitle).toBe('Lo que haces hoy queda en el mundo');
    expect(subscriptionScreen.ctaLabel).toBe('Comenzar mi travesía');
    expect(subscriptionScreen.benefitsTitle).toBe('Lo que incluye tu suscripción');
  });

  it('formats the monthly price for every plan from @oneimpact/shared', () => {
    const expectedMonthly = { basico: '$5', estandar: '$10', premium: '$15' };
    const expectedAnnual = { basico: '$4', estandar: '$8', premium: '$12' };

    for (const plan of PLANS) {
      expect(formatMonthlyPrice(plan, 'monthly')).toBe(expectedMonthly[plan.id]);
      expect(formatMonthlyPrice(plan, 'annual')).toBe(expectedAnnual[plan.id]);
    }
  });
});
