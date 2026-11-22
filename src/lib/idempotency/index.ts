import type { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../infrastructure/db/transaction.js';

export class IdempotencyKeyReuseError extends Error {
  constructor(message = 'Idempotency key was reused with a different request body') {
    super(message);
    this.name = 'IdempotencyKeyReuseError';
  }
}

export class IdempotencyInProgressError extends Error {
  constructor(message = 'A request with this idempotency key is already in progress') {
    super(message);
    this.name = 'IdempotencyInProgressError';
  }
}

export interface WithIdempotencyArgs<T> {
  studioId: string;
  key: string;
  requestHash: string;
  fn: (client: PoolClient) => Promise<T>;
}

/**
 * Runs fn at most once per (studioId, key). A repeat call with the same key and
 * request hash returns the stored result with replayed=true. fn runs inside the
 * same transaction as the key row, so if fn throws the key is released for retry.
 */
export async function withIdempotency<T>(
  pool: Pool,
  args: WithIdempotencyArgs<T>,
): Promise<{ replayed: boolean; result: T }> {
  const { studioId, key, requestHash, fn } = args;

  if (key.length < 8 || key.length > 128) {
    throw new Error('Idempotency key must be between 8 and 128 characters');
  }
  if (requestHash.length === 0) {
    throw new Error('Idempotency request hash must be non-empty');
  }

  return withTransaction(pool, async (client) => {
    const inserted = await client.query(
      `INSERT INTO idempotency_keys (studio_id, idem_key, request_hash, status)
       VALUES ($1, $2, $3, 'in_progress')
       ON CONFLICT DO NOTHING
       RETURNING studio_id`,
      [studioId, key, requestHash],
    );

    if (inserted.rows.length === 0) {
      const existing = await client.query<{
        request_hash: string;
        status: 'in_progress' | 'completed';
        response: unknown;
      }>(
        `SELECT request_hash, status, response
         FROM idempotency_keys
         WHERE studio_id = $1 AND idem_key = $2`,
        [studioId, key],
      );
      const row = existing.rows[0];

      if (row.request_hash !== requestHash) {
        throw new IdempotencyKeyReuseError();
      }
      if (row.status === 'completed') {
        return { replayed: true, result: row.response as T };
      }
      throw new IdempotencyInProgressError();
    }

    const result = await fn(client);

    await client.query(
      `UPDATE idempotency_keys
       SET status = 'completed', response = $3::jsonb, completed_at = now()
       WHERE studio_id = $1 AND idem_key = $2`,
      [studioId, key, JSON.stringify(result)],
    );

    return { replayed: false, result };
  });
}
