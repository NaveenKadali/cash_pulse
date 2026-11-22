import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { withTransaction } from './transaction.js';

const MIGRATION_FILENAME = /^(\d{4})_([a-z0-9_]+)\.sql$/;

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
}

/**
 * Parses a migration filename of the form NNNN_description.sql.
 * Throws when the name does not match.
 */
export function parseMigrationFilename(filename: string): MigrationFile {
  const match = MIGRATION_FILENAME.exec(filename);
  if (!match) {
    throw new Error(`Malformed migration filename: ${filename}`);
  }
  return { version: match[1], name: match[2], filename };
}

/**
 * Applies every migration in dir that is not yet recorded in schema_migrations,
 * in filename order, each inside its own transaction. Returns the versions applied
 * by this call. Throws on malformed filenames or duplicate versions.
 */
export async function runMigrations(pool: Pool, dir: string): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const entries = (await readdir(dir)).filter((name) => name.endsWith('.sql'));
  const migrations = entries.map(parseMigrationFilename).sort((a, b) =>
    a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0,
  );

  const seen = new Set<string>();
  for (const migration of migrations) {
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    seen.add(migration.version);
  }

  const applied = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations',
  );
  const appliedVersions = new Set(applied.rows.map((row) => row.version));

  const newlyApplied: string[] = [];
  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }
    const sql = await readFile(path.join(dir, migration.filename), 'utf8');
    await withTransaction(pool, async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [
        migration.version,
      ]);
    });
    newlyApplied.push(migration.version);
  }
  return newlyApplied;
}
