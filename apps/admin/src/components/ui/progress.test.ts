import { describe, expect, it } from 'vitest';
import { clampProgress, formatProgress } from './progress';

describe('clampProgress', () => {
  it('keeps a value already inside the range', () => {
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(40)).toBe(40);
    expect(clampProgress(100)).toBe(100);
  });

  it('clamps below zero and above one hundred', () => {
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(150)).toBe(100);
  });

  it('rounds decimals to the nearest integer', () => {
    expect(clampProgress(40.4)).toBe(40);
    expect(clampProgress(40.5)).toBe(41);
    expect(clampProgress(99.6)).toBe(100);
    expect(clampProgress(0.4)).toBe(0);
  });

  it('resolves non finite values without leaking NaN', () => {
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(100);
    expect(clampProgress(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('formatProgress', () => {
  it('writes the number, a space and the percent sign', () => {
    expect(formatProgress(40)).toBe('40 %');
    expect(formatProgress(0)).toBe('0 %');
    expect(formatProgress(100)).toBe('100 %');
  });

  it('formats the clamped value, not the raw one', () => {
    expect(formatProgress(150)).toBe('100 %');
    expect(formatProgress(-5)).toBe('0 %');
    expect(formatProgress(39.7)).toBe('40 %');
  });
});
