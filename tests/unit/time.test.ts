import { describe, expect, it } from 'vitest';
import {
  isValidCalendarDate,
  todayInKolkata,
} from '../../src/infrastructure/time.js';

describe('isValidCalendarDate', () => {
  it('accepts a real date', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
  });

  it('rejects a non-existent day', () => {
    expect(isValidCalendarDate('2026-02-30')).toBe(false);
  });

  it('rejects non-padded components', () => {
    expect(isValidCalendarDate('2026-2-1')).toBe(false);
  });
});

describe('todayInKolkata', () => {
  it('returns the Asia/Kolkata calendar date for a fixed instant', () => {
    // 2026-03-01T20:00:00Z is 2026-03-02 01:30 in Asia/Kolkata (UTC+05:30).
    const fixed = new Date('2026-03-01T20:00:00Z');
    expect(todayInKolkata(fixed)).toBe('2026-03-02');
  });

  it('returns YYYY-MM-DD', () => {
    expect(todayInKolkata(new Date('2026-06-15T00:00:00Z'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
