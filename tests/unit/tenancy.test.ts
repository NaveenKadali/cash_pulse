import { describe, expect, it } from 'vitest';
import {
  TENANT_TABLES,
  buildScopedInsert,
  buildScopedSelect,
  createTenantScope,
  isTenantTable,
} from '../../src/lib/tenancy/index.js';

const STUDIO_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('createTenantScope', () => {
  it('rejects a non-UUID string', () => {
    expect(() => createTenantScope('abc')).toThrow();
  });

  it('accepts a valid UUID', () => {
    expect(createTenantScope(STUDIO_ID).studioId).toBe(STUDIO_ID);
  });
});

describe('buildScopedSelect', () => {
  it('scopes by studio_id as $1', () => {
    const q = buildScopedSelect(createTenantScope(STUDIO_ID), 'project');
    expect(q.text.startsWith('SELECT')).toBe(true);
    expect(q.text).toContain('WHERE studio_id = $1');
    expect(q.values[0]).toBe(STUDIO_ID);
  });

  it("rejects table 'studio' and unknown tables", () => {
    const scope = createTenantScope(STUDIO_ID);
    expect(() => buildScopedSelect(scope, 'studio')).toThrow();
    expect(() => buildScopedSelect(scope, 'no_such_table')).toThrow();
  });

  it('rejects column names containing a semicolon or space', () => {
    const scope = createTenantScope(STUDIO_ID);
    expect(() => buildScopedSelect(scope, 'project', { columns: ['id;DROP'] })).toThrow();
    expect(() => buildScopedSelect(scope, 'project', { columns: ['id x'] })).toThrow();
  });
});

describe('buildScopedInsert', () => {
  it("overrides a caller-supplied studio_id with the scope's id", () => {
    const q = buildScopedInsert(createTenantScope(STUDIO_ID), 'client', {
      studio_id: '00000000-0000-0000-0000-000000000000',
      whatsapp_phone: '+910000000000',
    });
    expect(q.values[0]).toBe(STUDIO_ID);
    expect(q.text).toContain('RETURNING *');
  });
});

describe('TENANT_TABLES', () => {
  it("includes 'payment' and 'client' and excludes 'studio'", () => {
    expect(TENANT_TABLES).toContain('payment');
    expect(TENANT_TABLES).toContain('client');
    expect(TENANT_TABLES).not.toContain('studio');
    expect(isTenantTable('studio')).toBe(false);
  });
});
