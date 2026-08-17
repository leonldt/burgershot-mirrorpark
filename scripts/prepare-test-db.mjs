#!/usr/bin/env node
/**
 * Bereitet die E2E-Testdatenbank vor und seedet sie frisch:
 * 1. Embedded PostgreSQL starten (falls TEST_DATABASE_URL nicht gesetzt ist)
 * 2. Sicherstellen, dass DB "burgershot_test" existiert
 * 3. prisma migrate deploy + prisma db seed (SEED_RESET=1 → deterministischer Stand)
 *
 * CI setzt TEST_DATABASE_URL auf das postgres-Service → lokales Starten wird übersprungen.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = 54329;
const TEST_URL = process.env.TEST_DATABASE_URL || `postgresql://postgres:postgres@127.0.0.1:${PORT}/burgershot_test`;

async function ensureEmbeddedDb() {
  if (process.env.TEST_DATABASE_URL) return; // CI: Postgres-Service ist vorhanden
  const r = spawnSync("node", [path.join(root, "scripts", "db.mjs"), "start"], {
    stdio: "inherit",
    env: { ...process.env, PG_PORT: String(PORT) },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  // Fallback: DB anlegen, falls db.mjs sie noch nicht angelegt hat
  const { default: pg } = await import("pg");
  const client = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "postgres", database: "postgres" });
  await client.connect();
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='burgershot_test'`);
  if (res.rowCount === 0) await client.query(`CREATE DATABASE "burgershot_test"`);
  await client.end();
}

const run = (cmd, args, extraEnv = {}) => {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, DATABASE_URL: TEST_URL, TEST_DATABASE_URL: TEST_URL, ...extraEnv },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

await ensureEmbeddedDb();
console.log("[e2e] Test-DB:", TEST_URL);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["prisma", "db", "seed"], { SEED_RESET: "1" });
console.log("[e2e] Test-Datenbank bereit.");