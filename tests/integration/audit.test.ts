import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeAuditEntry } from '../../src/lib/audit/index.js';
import { createPool, closePool } from '../../src/infrastructure/db/pool.js';
import { runMigrations } from '../../src/infrastructure/db/migrate.js';
import { withTransaction } from '../../src/infrastructure/db/transaction.js';
import type { Pool } from 'pg';

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../src/infrastructure/db/migrations', import.meta.url),
);

describe.skipIf(!process.env.TEST_DATABASE_URL)('audit_log append-only (integration)', () => {
  let pool: Pool;
  let studioId: string;

  beforeAll(async () => {
    pool = createPool(process.env.TEST_DATABASE_URL as string);
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await runMigrations(pool, MIGRATIONS_DIR);

    const studio = await pool.query<{ id: string }>(
      "INSERT INTO studio (name, plan) VALUES ('Audit Test Studio', 'Free') RETURNING id",
    );
    studioId = studio.rows[0].id;

    await withTransaction(pool, async (client) => {
      await writeAuditEntry(client, {
        studioId,
        actorUserId: null,
        action: 'studio.create',
        entity: 'studio',
        entityId: studioId,
        newValue: { name: 'Audit Test Studio' },
      });
    });
  });

  afterAll(async () => {
    await closePool(pool);
  });

  it('rejects UPDATE on audit_log', async () => {
    await expect(
      pool.query("UPDATE audit_log SET action = 'tampered'"),
    ).rejects.toThrow(/append-only/);
  });

  it('rejects DELETE on audit_log', async () => {
    await expect(pool.query('DELETE FROM audit_log')).rejects.toThrow(/append-only/);
  });
});
