#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('[migrate] No DATABASE_URL configured, skipping database migrations.');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const migrationsDir = path.resolve(__dirname, '../src/infrastructure/db/migrations');

const MIGRATION_FILENAME = /^(\d{4})_([a-z0-9_]+)\.sql$/;

async function run() {
  console.log(`[migrate] Connecting to database...`);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const entries = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql'));
    const migrations = entries
      .map((filename) => {
        const match = MIGRATION_FILENAME.exec(filename);
        if (!match) throw new Error(`Malformed migration filename: ${filename}`);
        return { version: match[1], name: match[2], filename };
      })
      .sort((a, b) => (a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0));

    const applied = await pool.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.rows.map((row) => row.version));

    let count = 0;
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }
      console.log(`[migrate] Applying migration ${migration.filename}...`);
      const sql = await readFile(path.join(migrationsDir, migration.filename), 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`[migrate] Successfully applied ${count} new migration(s). Database is up to date.`);
  } catch (err) {
    console.error(`[migrate] Migration failed:`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
