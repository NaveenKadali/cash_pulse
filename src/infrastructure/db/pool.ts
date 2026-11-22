import pg from 'pg';

const { Pool } = pg;

export type { Pool, PoolClient } from 'pg';

/**
 * Creates a pg connection pool. Does not connect until the first query.
 */
export function createPool(databaseUrl: string): pg.Pool {
  return new Pool({ connectionString: databaseUrl });
}

/**
 * Ends all idle clients and waits for checked-out clients to be released.
 */
export function closePool(pool: pg.Pool): Promise<void> {
  return pool.end();
}
