import { describe, expect, it } from 'vitest';
import { writeAuditEntry } from '../../src/lib/audit/index.js';

function fakeClient() {
  const calls: { text: string; values?: unknown[] }[] = [];
  return {
    calls,
    query: async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      return { rows: [] };
    },
  };
}

const base = {
  studioId: '00000000-0000-0000-0000-000000000001',
  actorUserId: '00000000-0000-0000-0000-000000000002',
  action: 'payment.void',
  entity: 'payment',
  entityId: '00000000-0000-0000-0000-000000000003',
};

describe('writeAuditEntry', () => {
  it('issues an INSERT INTO audit_log with values in documented order', async () => {
    const client = fakeClient();
    await writeAuditEntry(client, {
      ...base,
      oldValue: { amount: 100 },
      newValue: { amount: 200 },
      reason: 'typo',
    });

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].text.startsWith('INSERT INTO audit_log')).toBe(true);
    expect(client.calls[0].values).toEqual([
      base.studioId,
      base.actorUserId,
      'payment.void',
      'payment',
      base.entityId,
      JSON.stringify({ amount: 100 }),
      JSON.stringify({ amount: 200 }),
      'typo',
    ]);
  });

  it('stores undefined oldValue as null', async () => {
    const client = fakeClient();
    await writeAuditEntry(client, { ...base, actorUserId: null, newValue: 5 });

    const values = client.calls[0].values as unknown[];
    expect(values[5]).toBeNull();
    expect(values[6]).toBe('5');
    expect(values[7]).toBeNull();
  });

  it('throws and never queries when reason is 501 characters', async () => {
    const client = fakeClient();
    await expect(
      writeAuditEntry(client, { ...base, reason: 'x'.repeat(501) }),
    ).rejects.toThrow();
    expect(client.calls).toHaveLength(0);
  });
});
