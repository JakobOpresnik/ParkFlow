import fs from "node:fs";
import path from "node:path";

import { pool } from "./pool.js";

// Migrations that are safe to re-run on every startup (idempotent UPDATEs, etc.).
// These are removed from _migrations before the run so they always re-apply,
// allowing you to edit the file and have changes take effect on next deploy.
const REPLAYABLE_MIGRATIONS = new Set([
  "015_spot_coordinates.sql",
]);

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
    console.warn(`[migrations] Migrations directory not found at ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

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
      const sql = rawSql.replace(/^\s*BEGIN\s*;?\s*/i, "").replace(/\s*COMMIT\s*;?\s*$/i, "");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[migrations] Successfully applied ${file}`);
      } catch (err: any) {
        await client.query("ROLLBACK");
        
        // Handle "already exists" errors (42P07: table, 42701: column, 42P04: database)
        // If we get these, it means the migration was likely already applied (e.g. by docker-entrypoint-initdb.d)
        // but not recorded in our new _migrations table.
        const alreadyExists = err.code === '42P07' || err.code === '42701' || err.code === '42710' || err.code === '42P10' || err.message.includes('already exists');
        
        if (alreadyExists) {
          console.warn(`[migrations] ${file} already applied (found existing relation/column). Marking as applied.`);
          await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [file]);
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
