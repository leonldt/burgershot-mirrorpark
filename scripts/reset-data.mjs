#!/usr/bin/env node
/**
 * Setzt den Betrieb auf 0 zurück:
 * löscht ALLE Geschäftsdaten (Bestellungen, Positionen, Trinkgeld, Auszahlungen,
 * Audit-Log, Menüs, Produkte, Kategorien, Sessions) sowie alle Benutzer außer
 * dem Admin. Der Admin bleibt unangetastet (inkl. Passwort).
 *
 * Aufruf: node scripts/reset-data.mjs   (erwartet DATABASE_URL)
 */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[reset-data] DATABASE_URL fehlt.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query(
    `TRUNCATE TABLE "OrderItem", "Order", "TipTransaction", "TipPayout", "AuditLog",
       "MenuItem", "Menu", "Product", "Category", "Session" CASCADE`
  );
  const res = await client.query(`DELETE FROM "User" WHERE username <> 'admin'`);
  console.log(`[reset-data] Betrieb auf 0 gesetzt: Geschäftsdaten gelöscht, ${res.rowCount} nicht-Admin-Benutzer entfernt.`);
  console.log("[reset-data] Der Admin-Zugang bleibt bestehen.");
} finally {
  await client.end();
}