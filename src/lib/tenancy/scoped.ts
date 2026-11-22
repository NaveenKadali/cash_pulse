import { isTenantTable } from './tables.js';
import type { TenantScope } from './scope.js';

const IDENT = /^[a-z_][a-z0-9_]*$/;

function assertIdent(name: string, kind: 'table' | 'column'): void {
  if (!IDENT.test(name)) {
    throw new Error(`Invalid ${kind} name: "${name}"`);
  }
}

function assertTenantTable(table: string): void {
  assertIdent(table, 'table');
  if (!isTenantTable(table)) {
    throw new Error(`Not a tenant table: "${table}"`);
  }
}

/**
 * Builds a SELECT scoped to the scope's studio.
 *
 * The `where` fragment is wrapped in parentheses and appended after
 * `studio_id = $1`. The caller numbers placeholders in `where` starting at $2;
 * `params` are sent in that same order after the studio id.
 */
export function buildScopedSelect(
  scope: TenantScope,
  table: string,
  opts?: { columns?: string[]; where?: string; params?: unknown[] },
): { text: string; values: unknown[] } {
  assertTenantTable(table);
  const cols =
    opts?.columns && opts.columns.length > 0
      ? opts.columns
          .map((c) => {
            assertIdent(c, 'column');
            return c;
          })
          .join(', ')
      : '*';
  let text = `SELECT ${cols} FROM ${table} WHERE studio_id = $1`;
  if (opts?.where) {
    text += ` AND (${opts.where})`;
  }
  return { text, values: [scope.studioId, ...(opts?.params ?? [])] };
}

/**
 * Builds an INSERT for a tenant table. Any caller-supplied `studio_id` is
 * overwritten with the scope's studio id.
 */
export function buildScopedInsert(
  scope: TenantScope,
  table: string,
  row: Record<string, unknown>,
): { text: string; values: unknown[] } {
  assertTenantTable(table);
  const keys = Object.keys(row);
  if (keys.length === 0) {
    throw new Error('Cannot insert an empty row');
  }
  const otherKeys = keys.filter((k) => k !== 'studio_id');
  for (const k of otherKeys) {
    assertIdent(k, 'column');
  }
  const cols = ['studio_id', ...otherKeys];
  const values: unknown[] = [scope.studioId, ...otherKeys.map((k) => row[k])];
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  return {
    text: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
}
