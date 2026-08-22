import { describe, expect, it } from 'vitest';
import { detectCardBrand, isValidLuhn } from './payment';

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
