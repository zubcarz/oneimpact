import { subscriptionSchema, userProfileSchema } from '@oneimpact/shared';
import type { SimulatedCard } from '@oneimpact/shared';
import {
  SimulatedError,
  createSubscription,
  getActiveSubscription,
  loginUser,
  registerUser,
  resetSimulatedState,
  resolveUserFromAccessToken,
  resolveUserIdFromRefreshToken,
} from '@/api/msw/state';

const VALID_CARD: SimulatedCard = {
  brand: 'visa',
  last4: '4242',
  holder: 'Ana Rodriguez',
  expMonth: 12,
  expYear: 2099,
};

function expectSimulatedError(action: () => unknown, status: number, code: string): void {
  try {
    action();
    throw new Error('expected action to throw a SimulatedError');
  } catch (err) {
    expect(err).toBeInstanceOf(SimulatedError);
    expect((err as SimulatedError).status).toBe(status);
    expect((err as SimulatedError).code).toBe(code);
  }
}

describe('msw state', () => {
  beforeEach(() => {
    resetSimulatedState();
  });

  describe('createSubscription', () => {
    it('declines with 402 PAYMENT_DECLINED when the card last4 is 0000', () => {
      const { tokens } = loginUser({ email: 'ana@oneimpact.org', password: 'User123!' });
      const user = resolveUserFromAccessToken(`Bearer ${tokens.accessToken}`);

      expectSimulatedError(
        () =>
          createSubscription(user.id, {
            planId: 'basico',
            billing: 'monthly',
            card: { ...VALID_CARD, last4: '0000' },
          }),
        402,
        'PAYMENT_DECLINED',
      );
    });

    it('declines with 402 CARD_EXPIRED when the card expiration month has already passed', () => {
      const { tokens } = loginUser({ email: 'ana@oneimpact.org', password: 'User123!' });
      const user = resolveUserFromAccessToken(`Bearer ${tokens.accessToken}`);

      try {
        createSubscription(user.id, {
          planId: 'basico',
          billing: 'monthly',
          card: { ...VALID_CARD, last4: '4242', expMonth: 1, expYear: 2025 },
        });
        throw new Error('expected createSubscription to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(SimulatedError);
        expect((err as SimulatedError).status).toBe(402);
        expect((err as SimulatedError).code).toBe('PAYMENT_DECLINED');
        expect((err as SimulatedError).details).toEqual({ reason: 'CARD_EXPIRED' });
      }
    });
  });

  describe('loginUser', () => {
    it('rejects unknown credentials with 401 INVALID_CREDENTIALS', () => {
      expectSimulatedError(
        () => loginUser({ email: 'nobody@oneimpact.org', password: 'whatever' }),
        401,
        'INVALID_CREDENTIALS',
      );
    });

    it('rejects a known email with the wrong password, same code as an unknown email', () => {
      expectSimulatedError(
        () => loginUser({ email: 'ana@oneimpact.org', password: 'wrong-password' }),
        401,
        'INVALID_CREDENTIALS',
      );
    });
  });

  describe('resolveUserFromAccessToken', () => {
    it('rejects a missing Authorization header with 401', () => {
      expectSimulatedError(() => resolveUserFromAccessToken(undefined), 401, 'UNAUTHORIZED');
    });

    it('rejects an invalid/unknown token with 401', () => {
      expectSimulatedError(
        () => resolveUserFromAccessToken('Bearer not-a-real-token'),
        401,
        'UNAUTHORIZED',
      );
    });

    it('resolves the user behind a token issued by loginUser', () => {
      const { user, tokens } = loginUser({ email: 'ana@oneimpact.org', password: 'User123!' });
      const resolved = resolveUserFromAccessToken(`Bearer ${tokens.accessToken}`);
      expect(resolved).toEqual(user);
    });
  });

  describe('registerUser', () => {
    it('rejects an email that is already registered with 409 EMAIL_TAKEN', () => {
      expectSimulatedError(
        () => registerUser({ name: 'Otra Ana', email: 'ana@oneimpact.org', password: 'User123!' }),
        409,
        'EMAIL_TAKEN',
      );
    });
  });

  describe('happy path: register -> token -> subscribe -> already active', () => {
    it('registers, resolves the token, activates a subscription, and blocks a second one', () => {
      const { user, tokens } = registerUser({
        name: 'Carlos Nuevo',
        email: 'carlos@oneimpact.org',
        password: 'Password123!',
      });
      expect(() => userProfileSchema.parse(user)).not.toThrow();

      const resolved = resolveUserFromAccessToken(`Bearer ${tokens.accessToken}`);
      expect(resolved.id).toBe(user.id);

      const refreshUserId = resolveUserIdFromRefreshToken(tokens.refreshToken);
      expect(refreshUserId).toBe(user.id);

      const subscription = createSubscription(user.id, {
        planId: 'estandar',
        billing: 'monthly',
        card: VALID_CARD,
      });
      expect(() => subscriptionSchema.parse(subscription)).not.toThrow();
      expect(subscription.status).toBe('ACTIVE');
      expect(getActiveSubscription(user.id)).toEqual(subscription);

      expectSimulatedError(
        () =>
          createSubscription(user.id, {
            planId: 'estandar',
            billing: 'monthly',
            card: VALID_CARD,
          }),
        409,
        'SUBSCRIPTION_EXISTS',
      );
    });
  });
});
