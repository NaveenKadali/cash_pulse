import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { createPool, closePool } from "../../src/infrastructure/db/pool.js";
import { withTransaction } from "../../src/infrastructure/db/transaction.js";
import { runMigrations } from "../../src/infrastructure/db/migrate.js";

const migrationsDir = fileURLToPath(
  new URL("../../src/infrastructure/db/migrations", import.meta.url),
);

describe.skipIf(!process.env.TEST_DATABASE_URL)("db engine (integration)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool(process.env.TEST_DATABASE_URL as string);
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await runMigrations(pool, migrationsDir);
  });

  afterAll(async () => {
    await closePool(pool);
  });

  it("running runMigrations twice applies zero migrations the second time", async () => {
    const before = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM schema_migrations",
    );
    const applied = await runMigrations(pool, migrationsDir);
    const after = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM schema_migrations",
    );

    expect(applied).toEqual([]);
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it("withTransaction rolls back all writes when the callback throws", async () => {
    await expect(
      withTransaction(pool, async (client) => {
        await client.query("INSERT INTO studio (name, plan) VALUES ($1, $2)", [
          "Rollback Studio",
          "Free",
        ]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM studio",
    );
    expect(result.rows[0].count).toBe("0");
  });

  it("rejects a payment with amount 0", async () => {
    const studio = await pool.query<{ id: string }>(
      "INSERT INTO studio (name, plan) VALUES ($1, $2) RETURNING id",
      ["Payment Studio", "Free"],
    );
    const studioId = studio.rows[0].id;

    const client = await pool.query<{ id: string }>(
      "INSERT INTO client (studio_id, whatsapp_phone) VALUES ($1, $2) RETURNING id",
      [studioId, "+919999999999"],
    );
    const project = await pool.query<{ id: string }>(
      `INSERT INTO project (studio_id, client_id, primary_contact_person, stage, contract_value)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [studioId, client.rows[0].id, "Contact", "Booking", 100000],
    );
    const milestone = await pool.query<{ id: string }>(
      "INSERT INTO milestone (project_id, amount) VALUES ($1, $2) RETURNING id",
      [project.rows[0].id, 50000],
    );

    let error: unknown;
    try {
      await pool.query(
        "INSERT INTO payment (studio_id, milestone_id, amount) VALUES ($1, $2, $3)",
        [studioId, milestone.rows[0].id, 0],
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });

  it("rejects two app_user rows with the same studio_id and login_identifier", async () => {
    const studio = await pool.query<{ id: string }>(
      "INSERT INTO studio (name, plan) VALUES ($1, $2) RETURNING id",
      ["User Studio", "Starter"],
    );
    const studioId = studio.rows[0].id;

    await pool.query(
      "INSERT INTO app_user (studio_id, login_identifier) VALUES ($1, $2)",
      [studioId, "owner@example.com"],
    );

    let error: unknown;
    try {
      await pool.query(
        "INSERT INTO app_user (studio_id, login_identifier) VALUES ($1, $2)",
        [studioId, "owner@example.com"],
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });
});
