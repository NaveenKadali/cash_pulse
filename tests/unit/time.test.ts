import { describe, expect, it } from 'vitest';
import {
  addDays,
  compareCalendarDates,
  daysBetween,
  generateDateSequence,
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

  it('rejects negative years or malformed strings', () => {
    expect(isValidCalendarDate('invalid-date')).toBe(false);
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('2026-00-10')).toBe(false);
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

describe('addDays', () => {
  it('adds positive days correctly across month boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-31', 5)).toBe('2026-02-05');
  });

  it('adds days across year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('throws on invalid calendar date', () => {
    expect(() => addDays('invalid', 2)).toThrow(/Invalid calendar date/);
  });
});

describe('daysBetween', () => {
  it('calculates difference between two calendar dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-10')).toBe(9);
    expect(daysBetween('2026-03-10', '2026-03-01')).toBe(-9);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('throws on invalid dates', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow(/Invalid calendar dates/);
  });
});

describe('compareCalendarDates', () => {
  it('correctly orders calendar dates', () => {
    expect(compareCalendarDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareCalendarDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareCalendarDates('2026-01-01', '2026-01-01')).toBe(0);
  });
});

describe('generateDateSequence', () => {
  it('generates a sequence of consecutive dates', () => {
    expect(generateDateSequence('2026-02-27', 3)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });

  it('returns empty array when count is 0', () => {
    expect(generateDateSequence('2026-02-27', 0)).toEqual([]);
  });

  it('throws on negative count', () => {
    expect(() => generateDateSequence('2026-02-27', -1)).toThrow(/cannot be negative/);
  });
});
