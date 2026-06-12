import fs from "node:fs";
import path from "node:path";

import { pool } from "./pool.js";

// Migrations that are safe to re-run on every startup (idempotent UPDATEs, etc.).
// These are removed from _migrations before the run so they always re-apply,
// allowing you to edit the file and have changes take effect on next deploy.
const REPLAYABLE_MIGRATIONS = new Set(["015_spot_coordinates.sql"]);

// Schema probes for the external-init guard below (step 2b). When the guard
// fires, the database was initialized outside this runner — but possibly from
// a dump that PREDATES the newest migrations. Blanket-marking those as applied
// would skip them forever and break every query that relies on their schema.
// Each probe is a query returning a boolean `present` column: true when the
// migration's schema change already exists. A file whose probe returns false
// is left unmarked so the runner applies it normally — probed migrations must
// therefore be idempotent and non-destructive. Add a probe here for every new
// migration that changes the schema.
const SCHEMA_PROBES: Record<string, string> = {
  "024_booking_date.sql": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'booking_date'
    ) AS present`,
};

export async function runMigrations() {
  console.log("[migrations] Checking for database migrations...");

  // 1. Create migrations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // 2. Read all files from migrations directory
  const migrationsDir = path.join(process.cwd(), "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.warn(
      `[migrations] Migrations directory not found at ${migrationsDir}`,
    );
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // 2b. Guard against re-running migrations on a database that was initialized
  // OUTSIDE this runner (e.g. docker-entrypoint-initdb.d executes every .sql
  // directly but never records them, or a restored dump lacks _migrations).
  // In that case _migrations is empty yet the schema already exists. Re-running
  // the files would re-execute destructive DML — 005 does `DELETE FROM spots`,
  // which cascade-deletes ALL bookings, day-status, audit, and spotted reports.
  // So when the schema is already present but nothing is recorded, mark every
  // current migration as applied instead of replaying them.
  const { rows: countRows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM _migrations",
  );
  if ((countRows[0]?.n ?? 0) === 0) {
    const { rows: schemaRows } = await pool.query(
      "SELECT to_regclass('public.spots') IS NOT NULL AS exists",
    );
    if (schemaRows[0]?.exists) {
      console.warn(
        "[migrations] Schema already exists but no migrations are recorded — " +
          "assuming the database was initialized outside the runner. Marking all " +
          "current migrations as applied to avoid re-running destructive DML.",
      );
      for (const file of files) {
        // Files with a schema probe are only marked when their schema change is
        // actually present — a restored dump may predate them, and marking them
        // here would skip them forever.
        const probe = SCHEMA_PROBES[file];
        if (probe) {
          const { rows: probeRows } = await pool.query(probe);
          if (!probeRows[0]?.present) {
            console.warn(
              `[migrations] ${file} is not reflected in the existing schema — ` +
                "leaving it unrecorded so it is applied normally.",
            );
            continue;
          }
        }
        await pool.query(
          "INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
          [file],
        );
      }
    }
  }

  // 3. Force re-apply replayable migrations by removing them from the applied set
  for (const name of REPLAYABLE_MIGRATIONS) {
    await pool.query("DELETE FROM _migrations WHERE name = $1", [name]);
  }

  // 4. Get applied migrations
  const { rows } = await pool.query("SELECT name FROM _migrations");
  const applied = new Set(rows.map((r: any) => r.name));

  // 5. Run missing migrations
  for (const file of files) {
    if (!applied.has(file)) {
      console.log(`[migrations] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const rawSql = fs.readFileSync(filePath, "utf8");
      // Strip BEGIN/COMMIT from migration files — the runner wraps each in its own transaction
      const sql = rawSql
        .replace(/^\s*BEGIN\s*;?\s*/i, "")
        .replace(/\s*COMMIT\s*;?\s*$/i, "");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`[migrations] Successfully applied ${file}`);
      } catch (err: any) {
        await client.query("ROLLBACK");

        // Handle "already exists" errors (42P07: table, 42701: column, 42P04: database)
        // If we get these, it means the migration was likely already applied (e.g. by docker-entrypoint-initdb.d)
        // but not recorded in our new _migrations table.
        const alreadyExists =
          err.code === "42P07" ||
          err.code === "42701" ||
          err.code === "42710" ||
          err.code === "42P10" ||
          err.message.includes("already exists");

        if (alreadyExists) {
          console.warn(
            `[migrations] ${file} already applied (found existing relation/column). Marking as applied.`,
          );
          await pool.query(
            "INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
            [file],
          );
        } else {
          console.error(`[migrations] Failed to apply ${file}:`, err.message);
          throw err;
        }
      } finally {
        client.release();
      }
    }
  }

  console.log("[migrations] All migrations checked/applied.");
}
