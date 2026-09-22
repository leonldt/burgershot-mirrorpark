#!/usr/bin/env node
/**
 * Importiert den Produkt-/Menü-Katalog aus einer Tab-getrennten .tsv-Datei.
 *
 * Format (Kopfzeile): ID\tName\tKategorie\tPreis\tKcal\tBild_URL\tAktiv\tInhalt
 *  – Zeilen OHNE Inhalt  → Produkt (Bild → imageUrl, Kcal → Beschreibung "xx kcal")
 *  – Zeilen MIT Inhalt   → Menü (Inhalt = enthaltene Produkte, Mengen via "2x Name")
 *  – Preise werden als ganze Ganzzahlen übernommen und in Cent gespeichert (Wert × 100)
 *
 * Aufruf: DATABASE_URL=... node scripts/import-katalog.mjs [pfad.tsv]
 * Der Katalog (Product/Category/Menu/MenuItem) wird dabei ersetzt; Bestellungen bleiben.
 */
import fs from "node:fs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[import-katalog] DATABASE_URL fehlt.");
  process.exit(1);
}

const tsvPath = process.argv[2] ?? "data/katalog.tsv";
const raw = fs.readFileSync(tsvPath, "utf8");

const rows = raw
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("ID\t"));

const parsed = rows.map((l) => {
  const [id, name, kategorie, preis, kcal, bild, aktiv, inhalt = ""] = l.split("\t");
  return {
    id: (id ?? "").trim(),
    name: (name ?? "").trim(),
    kategorie: (kategorie ?? "").trim(),
    preis: Number(preis ?? 0),
    kcal: Number(kcal ?? 0),
    bild: (bild ?? "").trim(),
    aktiv: (aktiv ?? "").trim().toLowerCase() === "ja",
    inhalt: (inhalt ?? "").trim(),
  };
});

// Manuelle Zuordnung für Schreibfehler in den Menü-Komponenten
const ALIASES = {
  "ceasar salat": "Caesar Salad",
  "double cheesburger": "Double Cheeseburger",
  "pfirsich eistee": "Eistee Pfirsich",
  "köfte": "Köfte Burger",
  "sucuk": "Sucuk Burger",
};
const norm = (s) => s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, "").replace(/\s+/g, " ").trim();
const qtyRe = /^(\d+)x\s*(.*)$/i;

// Kurze, kollisionsarme IDs (Prisma-CUIDs sind clientseitig – beim Roh-SQL selbst erzeugen)
const uid = (prefix) => prefix + "_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("BEGIN");
  await client.query(`TRUNCATE TABLE "MenuItem", "Menu", "Product", "Category" CASCADE`);

  // Kategorien in Reihenfolge ihres ersten Auftretens
  const catNames = [...new Set(parsed.map((p) => p.kategorie))];
  const catIds = {};
  for (let i = 0; i < catNames.length; i++) {
    const id = uid("cat");
    await client.query(
      `INSERT INTO "Category" (id, name, "sortOrder", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, true, now(), now())`,
      [id, catNames[i], i]
    );
    catIds[catNames[i]] = id;
  }

  const productByIdName = {};
  const sortCount = {};
  const products = parsed.filter((p) => p.inhalt === "");
  for (const p of products) {
    sortCount[p.kategorie] = (sortCount[p.kategorie] ?? 0) + 1;
    const id = uid("prod");
    await client.query(
      `INSERT INTO "Product" (id, name, description, "priceCents", "imageUrl", "sortOrder", active, "categoryId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [id, p.name, p.kcal > 0 ? `${p.kcal} kcal` : null, p.preis * 100, p.bild || null, sortCount[p.kategorie] - 1, p.aktiv, catIds[p.kategorie]]
    );
    productByIdName[norm(p.name)] = id;
  }

  const menus = parsed.filter((p) => p.inhalt !== "");
  const menuErrors = [];
  for (const p of menus) {
    sortCount[p.kategorie] = (sortCount[p.kategorie] ?? 0) + 1;
    const id = uid("menu");
    await client.query(
      `INSERT INTO "Menu" (id, name, description, "priceCents", active, "sortOrder", "categoryId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [id, p.name, p.kcal > 0 ? `${p.kcal} kcal` : null, p.preis * 100, p.aktiv, sortCount[p.kategorie] - 1, catIds[p.kategorie]]
    );
    for (const part of p.inhalt.split(",")) {
      const piece = part.trim();
      if (!piece) continue;
      const m = piece.match(qtyRe);
      const qty = m ? Number(m[1]) : 1;
      const namePart = (m ? m[2] : piece).trim();
      const key = norm(ALIASES[norm(namePart)] ?? namePart);
      let productId = productByIdName[key];
      if (!productId) {
        // Toleranz: exakt eine Teilübereinstimmung
        const candidates = Object.entries(productByIdName).filter(([k]) => k.includes(key) || key.includes(k));
        if (candidates.length === 1) productId = candidates[0][1];
      }
      if (!productId) {
        menuErrors.push(`${p.name}: Komponente „${piece}“ nicht gefunden`);
        continue;
      }
      await client.query(`INSERT INTO "MenuItem" (id, "menuId", "productId", quantity) VALUES ($1, $2, $3, $4)`, [uid("mi"), id, productId, qty]);
    }
  }

  await client.query("COMMIT");
  console.log(`[import-katalog] Kategorien: ${catNames.join(", ")}`);
  console.log(`[import-katalog] Produkte: ${products.length} · Menüs: ${menus.length}`);
  if (menuErrors.length) {
    console.warn("[import-katalog] WARNUNG – nicht zugeordnete Menü-Komponenten:");
    for (const e of menuErrors) console.warn("  -", e);
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("[import-katalog] Fehler:", e.message);
  process.exit(1);
} finally {
  await client.end();
}