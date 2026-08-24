import { describe, expect, it } from 'vitest';
import {
  createSubscriptionSchema,
  dashboardSummarySchema,
  detectCardBrand,
  isValidLuhn,
  paymentSchema,
  subscriptionSchema,
} from './payment';

describe('payment helpers', () => {
  it('validates Luhn', () => {
    expect(isValidLuhn('4242 4242 4242 4242')).toBe(true);
    expect(isValidLuhn('4242 4242 4242 4241')).toBe(false);
  });
  it('detects brand', () => {
    expect(detectCardBrand('4242424242424242')).toBe('visa');
    expect(detectCardBrand('5555555555554444')).toBe('mastercard');
    expect(detectCardBrand('378282246310005')).toBe('amex');
  });
});

describe('dashboardSummarySchema', () => {
  it('parses a full summary for a subscribed user', () => {
    const result = dashboardSummarySchema.safeParse({
      plan: {
        id: 'estandar',
        name: 'Estandar',
        monthlyPrice: 25000,
        annualMonthlyPrice: 20000,
        annualTotal: 240000,
        recommended: true,
      },
      billing: 'monthly',
      status: 'ACTIVE',
      activeMonths: 3,
      startedAt: '2026-05-01T00:00:00.000Z',
      followedProjects: 2,
      followedProjectIds: ['project-1', 'project-2'],
      journeyPoints: 120,
      unreadNotifications: 4,
      latestUpdate: {
        id: 'update-1',
        projectId: 'project-1',
        title: 'Avance de siembra',
        body: 'Se sembraron 500 arboles.',
        progress: 40,
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(result.success).toBe(true);
  });

  it('parses a summary for a user without a subscription', () => {
    const result = dashboardSummarySchema.safeParse({
      plan: null,
      billing: null,
      status: null,
      activeMonths: 0,
      startedAt: null,
      followedProjects: 0,
      followedProjectIds: [],
      journeyPoints: 0,
      unreadNotifications: 0,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a summary missing journeyPoints', () => {
    const result = dashboardSummarySchema.safeParse({
      plan: null,
      billing: null,
      status: null,
      activeMonths: 0,
      startedAt: null,
      followedProjects: 0,
      followedProjectIds: [],
      unreadNotifications: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a summary missing followedProjectIds', () => {
    const result = dashboardSummarySchema.safeParse({
      plan: null,
      billing: null,
      status: null,
      activeMonths: 0,
      startedAt: null,
      followedProjects: 0,
      journeyPoints: 0,
      unreadNotifications: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a summary missing startedAt', () => {
    const result = dashboardSummarySchema.safeParse({
      plan: null,
      billing: null,
      status: null,
      activeMonths: 0,
      followedProjects: 0,
      followedProjectIds: [],
      journeyPoints: 0,
      unreadNotifications: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('subscriptionSchema', () => {
  it('rejects an invalid status', () => {
    const result = subscriptionSchema.safeParse({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'estandar',
      billing: 'monthly',
      status: 'PAUSED',
      startedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a subscription without canceledAt', () => {
    const result = subscriptionSchema.safeParse({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'estandar',
      billing: 'monthly',
      status: 'ACTIVE',
      startedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });
});

describe('paymentSchema', () => {
  it('accepts a failed payment without a subscriptionId', () => {
    const result = paymentSchema.safeParse({
      id: 'payment-1',
      userId: 'user-1',
      amount: 25000,
      currency: 'COP',
      status: 'FAILED',
      cardBrand: 'visa',
      cardLast4: '0000',
      simulated: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a cardLast4 that is not 4 digits', () => {
    const result = paymentSchema.safeParse({
      id: 'payment-1',
      subscriptionId: 'sub-1',
      userId: 'user-1',
      amount: 25000,
      currency: 'COP',
      status: 'SUCCEEDED',
      cardBrand: 'visa',
      cardLast4: '42',
      simulated: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('simulated payment invariant: the full PAN never crosses the contract', () => {
  it('rejects a createSubscriptionSchema payload whose card carries a number field', () => {
    const result = createSubscriptionSchema.safeParse({
      planId: 'estandar',
      billing: 'monthly',
      card: {
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        expMonth: 12,
        expYear: 2030,
        number: '4242424242424242',
      },
    });

    // .strict() turns an extra PAN-shaped key into a hard 400 instead of a
    // silent strip: the full card number never reaches the server unnoticed.
    expect(result.success).toBe(false);
  });

  it('rejects a createSubscriptionSchema payload whose card carries a pan field', () => {
    const result = createSubscriptionSchema.safeParse({
      planId: 'estandar',
      billing: 'monthly',
      card: {
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        expMonth: 12,
        expYear: 2030,
        pan: '4242424242424242',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a createSubscriptionSchema payload whose card carries a cvv field', () => {
    const result = createSubscriptionSchema.safeParse({
      planId: 'estandar',
      billing: 'monthly',
      card: {
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        expMonth: 12,
        expYear: 2030,
        cvv: '123',
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a createSubscriptionSchema payload with a valid card and no extra keys', () => {
    const result = createSubscriptionSchema.safeParse({
      planId: 'estandar',
      billing: 'monthly',
      card: {
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        expMonth: 12,
        expYear: 2030,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data.card).sort()).toEqual(
        ['brand', 'expMonth', 'expYear', 'holder', 'last4'].sort(),
      );
    }
  });

  it('strips number, pan and cvv when parsing a paymentSchema record', () => {
    const result = paymentSchema.safeParse({
      id: 'payment-1',
      subscriptionId: 'sub-1',
      userId: 'user-1',
      amount: 25000,
      currency: 'COP',
      status: 'SUCCEEDED',
      cardBrand: 'visa',
      cardLast4: '4242',
      simulated: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      number: '4242424242424242',
      pan: '4242424242424242',
      cvv: '123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('number');
      expect(result.data).not.toHaveProperty('pan');
      expect(result.data).not.toHaveProperty('cvv');
    }
  });

  it('strips number, pan and cvv when parsing a subscriptionSchema record', () => {
    const result = subscriptionSchema.safeParse({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'estandar',
      billing: 'monthly',
      status: 'ACTIVE',
      startedAt: '2026-01-01T00:00:00.000Z',
      number: '4242424242424242',
      pan: '4242424242424242',
      cvv: '123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('number');
      expect(result.data).not.toHaveProperty('pan');
      expect(result.data).not.toHaveProperty('cvv');
    }
  });
});
