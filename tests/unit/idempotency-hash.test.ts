import { describe, expect, it } from 'vitest';
import { hashRequestBody } from '../../src/lib/idempotency/hash.js';

describe('hashRequestBody', () => {
  it('gives the same hash regardless of object key order', () => {
    const a = { amount: 100, customer: { name: 'Asha', city: 'Pune' } };
    const b = { customer: { city: 'Pune', name: 'Asha' }, amount: 100 };
    expect(hashRequestBody(a)).toBe(hashRequestBody(b));
  });

  it('gives different hashes for different values', () => {
    expect(hashRequestBody({ amount: 100 })).not.toBe(hashRequestBody({ amount: 101 }));
  });

  it('preserves array order', () => {
    expect(hashRequestBody([1, 2])).not.toBe(hashRequestBody([2, 1]));
  });
});
