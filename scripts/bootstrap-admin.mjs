#!/usr/bin/env node
/**
 * Bootstraps den Admin-Zugang auf einer FRISCHEN Datenbank (z. B. Produktion).
 * – Läuft idempotent: existiert der Admin bereits, passiert nichts (kein
 *   stilles Passwort-Reset).
 * – Erwartet ADMIN_PASSWORD aus der Host-Umgebung; ohne diese Variable wird
 *   nur gewarnt und das Skript beendet sich mit 0 (Build darf weiterlaufen).
 *
 * Aufruf (nach den Migrationen, vor dem App-Start):
 *   node scripts/bootstrap-admin.mjs
 */
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[bootstrap-admin] DATABASE_URL fehlt – übersprungen.");
  process.exit(0);
}

const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.warn("[bootstrap-admin] ADMIN_PASSWORD nicht gesetzt – übersprungen (kein stilles Passwort-Reset).");
  process.exit(0);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const existing = await client.query(`SELECT id FROM "User" WHERE username = $1`, [username]);
  if (existing.rowCount > 0) {
    console.log(`[bootstrap-admin] Admin "${username}" existiert bereits – nichts zu tun.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO "User" (id, username, "passwordHash", "firstName", "lastName", role, active, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'Admin', 'Burgershot', 'ADMIN', true, now(), now())`,
    [cryptoRandomId(), username, passwordHash]
  );
  console.log(`[bootstrap-admin] Admin "${username}" angelegt.`);
} finally {
  await client.end();
}

// kurze, kollisionsarme ID (langlebig genug für eine varchar(30)-Spalte)
function cryptoRandomId() {
  return "adm_" + randomBytes(12).toString("hex"); // 16 Zeichen
}