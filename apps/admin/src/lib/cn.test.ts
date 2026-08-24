import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins the truthy class names with a single space', () => {
    expect(cn('rounded-full', 'bg-accent', 'text-gray-900')).toBe(
      'rounded-full bg-accent text-gray-900',
    );
  });

  it('drops undefined, null, empty strings and false branches', () => {
    expect(cn('bg-accent', undefined, null, '', false, '   ', 'text-gray-900')).toBe(
      'bg-accent text-gray-900',
    );
  });

  it('trims each value so an optional className cannot produce a double space', () => {
    expect(cn('  bg-cream  ', ' p-4')).toBe('bg-cream p-4');
  });

  it('returns an empty string when nothing survives', () => {
    expect(cn(undefined, false, null)).toBe('');
  });
});
