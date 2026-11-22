import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { createPool, closePool } from "../../src/infrastructure/db/pool.js";
import { runMigrations } from "../../src/infrastructure/db/migrate.js";
import {
  seedAaravPixels,
  cleanAaravPixels,
} from "../../src/infrastructure/db/seeds/aarav-pixels.js";

const migrationsDir = fileURLToPath(
  new URL("../../src/infrastructure/db/migrations", import.meta.url),
);

const AS_OF_DATE = "2026-05-01";

describe.skipIf(!process.env.TEST_DATABASE_URL)("Aarav Pixels seed (integration)", () => {
  let pool: Pool;
  let studioId: string;

  beforeAll(async () => {
    pool = createPool(process.env.TEST_DATABASE_URL as string);
    await runMigrations(pool, migrationsDir);
    const studio = await pool.query<{ id: string }>(
      "INSERT INTO studio (name, plan) VALUES ($1, $2) RETURNING id",
      ["Aarav Pixels", "Starter"],
    );
    studioId = studio.rows[0].id;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM studio WHERE id = $1", [studioId]);
    await closePool(pool);
  });

  it("seedAaravPixels returns the expected row counts", async () => {
    const result = await seedAaravPixels(pool, studioId, AS_OF_DATE);

    expect(result.projects).toBe(5);
    expect(result.milestones).toBe(15);
    expect(result.vendorBills).toBe(8);
    expect(result.openingBalanceEntries).toBe(1);
    expect(result.recurringExpenses).toBe(2);
  });

  it("writes the fixture figures and dates to PostgreSQL", async () => {
    const opening = await pool.query<{ amount: string }>(
      "SELECT amount FROM opening_balance_entry WHERE studio_id = $1",
      [studioId],
    );
    expect(opening.rows).toHaveLength(1);
    expect(Number(opening.rows[0].amount)).toBe(2400000);

    const verma = await pool.query<{ amount: string; due_date: string }>(
      `SELECT m.amount, to_char(m.due_date, 'YYYY-MM-DD') AS due_date
         FROM milestone m
         JOIN project p ON p.id = m.project_id
        WHERE p.studio_id = $1 AND p.primary_contact_person = $2 AND m.amount = $3`,
      [studioId, "Verma Family", 4500000],
    );
    expect(verma.rows).toHaveLength(1);
    expect(verma.rows[0].due_date).toBe("2026-05-11");

    const printLab = await pool.query<{ amount: string; due_date: string }>(
      `SELECT amount, to_char(due_date, 'YYYY-MM-DD') AS due_date
         FROM vendor_bill
        WHERE studio_id = $1 AND amount = $2`,
      [studioId, 7000000],
    );
    expect(printLab.rows).toHaveLength(1);
    expect(printLab.rows[0].due_date).toBe("2026-05-15");

    const counts = await pool.query<{ projects: string; milestones: string; bills: string }>(
      `SELECT
         (SELECT count(*) FROM project WHERE studio_id = $1) AS projects,
         (SELECT count(*) FROM milestone m JOIN project p ON p.id = m.project_id WHERE p.studio_id = $1) AS milestones,
         (SELECT count(*) FROM vendor_bill WHERE studio_id = $1) AS bills`,
      [studioId],
    );
    expect(Number(counts.rows[0].projects)).toBe(5);
    expect(Number(counts.rows[0].milestones)).toBe(15);
    expect(Number(counts.rows[0].bills)).toBe(8);

    // Only Verma's final milestone (day 10) and Print-Lab's bill (day 14) fall in 2026-05-01..2026-05-15.
    const inWindow = await pool.query<{ count: string }>(
      `SELECT
         (SELECT count(*) FROM milestone m JOIN project p ON p.id = m.project_id
           WHERE p.studio_id = $1 AND m.due_date BETWEEN $2 AND $3) +
         (SELECT count(*) FROM vendor_bill
           WHERE studio_id = $1 AND due_date BETWEEN $2 AND $3) AS count`,
      [studioId, "2026-05-01", "2026-05-15"],
    );
    expect(Number(inWindow.rows[0].count)).toBe(2);

    const recurring = await pool.query<{ amount: string; day_of_month: number }>(
      "SELECT amount, day_of_month FROM recurring_expense WHERE studio_id = $1 ORDER BY day_of_month",
      [studioId],
    );
    expect(recurring.rows.map((r) => [Number(r.amount), r.day_of_month])).toEqual([
      [400000, 5],
      [2500000, 10],
    ]);
  });

  it("cleanAaravPixels removes all seeded rows but keeps the studio", async () => {
    await cleanAaravPixels(pool, studioId);

    const tables = [
      "payment",
      "vendor_bill",
      "recurring_expense",
      "opening_balance_entry",
      "vendor",
      "client",
      "project",
    ];
    for (const table of tables) {
      const res = await pool.query<{ count: string }>(
        `SELECT count(*) AS count FROM ${table} WHERE studio_id = $1`,
        [studioId],
      );
      expect(Number(res.rows[0].count), table).toBe(0);
    }

    const milestones = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM milestone m JOIN project p ON p.id = m.project_id WHERE p.studio_id = $1",
      [studioId],
    );
    expect(Number(milestones.rows[0].count)).toBe(0);

    const studio = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM studio WHERE id = $1",
      [studioId],
    );
    expect(Number(studio.rows[0].count)).toBe(1);
  });
});
