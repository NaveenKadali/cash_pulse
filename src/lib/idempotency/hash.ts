import { createHash } from 'node:crypto';

/**
 * Returns a copy of value with every object's keys sorted recursively.
 * Array order is preserved.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * SHA-256 hex digest of a stable JSON serialisation of body.
 * Object key order does not affect the result.
 */
export function hashRequestBody(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortKeysDeep(body)))
    .digest('hex');
}
