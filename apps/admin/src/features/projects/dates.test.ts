import { describe, expect, it } from 'vitest';
import { NO_TARGET_DATE, formatTargetDate } from './dates';

describe('formatTargetDate', () => {
  it('formats an ISO instant as dd/mm/yyyy', () => {
    expect(formatTargetDate('2026-12-31T00:00:00.000Z')).toBe('31/12/2026');
  });

  it('pads day and month to two digits', () => {
    expect(formatTargetDate('2027-03-05T12:00:00.000Z')).toBe('05/03/2027');
  });

  it('reads the instant in UTC, not in the local zone', () => {
    // Midnight UTC is the previous day anywhere west of Greenwich. The output
    // must not depend on where the process runs.
    expect(formatTargetDate('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
    expect(formatTargetDate('2026-01-01T23:59:59.000Z')).toBe('01/01/2026');
  });

  it('keeps the same day for an offset that crosses midnight', () => {
    // 2026-06-30T22:00-03:00 is 2026-07-01T01:00Z: UTC is the reference.
    expect(formatTargetDate('2026-06-30T22:00:00.000-03:00')).toBe('01/07/2026');
  });

  it('falls back when there is no date', () => {
    expect(formatTargetDate(undefined)).toBe(NO_TARGET_DATE);
    expect(formatTargetDate('')).toBe(NO_TARGET_DATE);
  });

  it('falls back instead of rendering an invalid date', () => {
    expect(formatTargetDate('no-es-una-fecha')).toBe(NO_TARGET_DATE);
  });
});
