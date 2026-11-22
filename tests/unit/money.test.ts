import { describe, expect, it } from 'vitest';
import {
  addPaise,
  comparePaise,
  formatInr,
  paise,
  parseRupeesToPaise,
  subPaise,
} from '../../src/infrastructure/money.js';

describe('paise', () => {
  it('adds and subtracts integer paise', () => {
    expect(addPaise(paise(100n), paise(250n))).toBe(350n);
    expect(subPaise(paise(500n), paise(125n))).toBe(375n);
  });

  it('rejects non-integer numbers such as 1.5', () => {
    expect(() => paise(1.5)).toThrow();
  });

  it('accepts integer numbers and bigints', () => {
    expect(paise(42)).toBe(42n);
    expect(paise(42n)).toBe(42n);
  });

  it('compares amounts', () => {
    expect(comparePaise(paise(1n), paise(2n))).toBe(-1);
    expect(comparePaise(paise(2n), paise(2n))).toBe(0);
    expect(comparePaise(paise(3n), paise(2n))).toBe(1);
  });
});

describe('parseRupeesToPaise', () => {
  it('parses "1234.50" to 123450n', () => {
    expect(parseRupeesToPaise('1234.50')).toBe(123450n);
  });

  it('parses whole and single-decimal strings exactly', () => {
    expect(parseRupeesToPaise('1234')).toBe(123400n);
    expect(parseRupeesToPaise('1234.5')).toBe(123450n);
  });

  it('rejects strings with more than two decimals', () => {
    expect(() => parseRupeesToPaise('1.234')).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => parseRupeesToPaise('abc')).toThrow();
    expect(() => parseRupeesToPaise('')).toThrow();
  });
});

describe('formatInr', () => {
  it('formats paise as an INR string with en-IN grouping', () => {
    expect(formatInr(paise(123450n))).toBe('₹1,234.50');
    expect(formatInr(paise(100000000n))).toBe('₹10,00,000.00');
  });

  it('formats zero and negative amounts', () => {
    expect(formatInr(paise(0n))).toBe('₹0.00');
    expect(formatInr(paise(-5n))).toBe('-₹0.05');
  });
});
