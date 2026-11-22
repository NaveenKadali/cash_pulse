import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { closePool, createPool } from '../../src/infrastructure/db/pool.js';
import { runMigrations } from '../../src/infrastructure/db/migrate.js';
import {
  IdempotencyKeyReuseError,
  withIdempotency,
} from '../../src/lib/idempotency/index.js';

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../src/infrastructure/db/migrations', import.meta.url),
);

describe.skipIf(!process.env.TEST_DATABASE_URL)('withIdempotency (Postgres)', () => {
  let pool: Pool;
  let studioId: string;

  beforeAll(async () => {
    pool = createPool(process.env.TEST_DATABASE_URL as string);
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await runMigrations(pool, MIGRATIONS_DIR);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO studio (name, plan) VALUES ('Test Studio', 'Free') RETURNING id`,
    );
    studioId = rows[0].id;
  });

  afterAll(async () => {
    await closePool(pool);
  });

  it('runs fn once and replays the stored result on a repeat call', async () => {
    const key = 'replay-key-001';
    const fn = vi.fn(async () => ({ bookingId: 'b-1' }));

    const first = await withIdempotency(pool, {
      studioId,
      key,
      requestHash: 'hash-a',
      fn,
    });
    expect(first.replayed).toBe(false);
    expect(first.result).toEqual({ bookingId: 'b-1' });

    const second = await withIdempotency(pool, {
      studioId,
      key,
      requestHash: 'hash-a',
      fn,
    });
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual({ bookingId: 'b-1' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws IdempotencyKeyReuseError when the same key has a different request hash', async () => {
    const key = 'reuse-key-002';
    await withIdempotency(pool, {
      studioId,
      key,
      requestHash: 'hash-original',
      fn: async () => ({ ok: true }),
    });

    await expect(
      withIdempotency(pool, {
        studioId,
        key,
        requestHash: 'hash-different',
        fn: async () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(IdempotencyKeyReuseError);
  });

  it('leaves no key row when fn throws, so a retry succeeds', async () => {
    const key = 'failure-key-003';

    await expect(
      withIdempotency(pool, {
        studioId,
        key,
        requestHash: 'hash-fail',
        fn: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');

    const { rows } = await pool.query(
      'SELECT 1 FROM idempotency_keys WHERE studio_id = $1 AND idem_key = $2',
      [studioId, key],
    );
    expect(rows).toHaveLength(0);

    const retry = await withIdempotency(pool, {
      studioId,
      key,
      requestHash: 'hash-fail',
      fn: async () => ({ recovered: true }),
    });
    expect(retry.replayed).toBe(false);
    expect(retry.result).toEqual({ recovered: true });
  });
});
