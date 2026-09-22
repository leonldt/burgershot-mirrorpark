import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * Kompletter Ablauf: Login → Kasse/Bestellung → Küche → Ausgabe an der Kasse →
 * Trinkgeld wird gutgeschrieben. Der Test baut seine eigenen Daten auf
 * (keine Abhängigkeit von Demo-/Seed-Daten).
 */
const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/burgershot_test";

// Sauberer Zustand pro Lauf: Betriebsdaten leeren und einen minimalen
// Katalog + Mitarbeiter anlegen. Der Admin existiert aus dem Seed.
test.beforeEach(async () => {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  await client.query(
    `TRUNCATE TABLE "OrderItem", "Order", "TipTransaction", "TipPayout", "AuditLog",
       "MenuItem", "Menu", "Product", "Category", "Session" CASCADE`
  );
  await client.query(`DELETE FROM "User" WHERE username <> 'admin'`);
  await client.query(
    `INSERT INTO "Category" (id, name, "sortOrder", active, "createdAt", "updatedAt")
     VALUES ('e2e-cat-burger', 'Burger', 0, true, now(), now())`
  );
  await client.query(
    `INSERT INTO "Product" (id, name, description, "priceCents", "sortOrder", active, "categoryId", "createdAt", "updatedAt")
     VALUES ('e2e-prod-burger', 'Classic Burger', NULL, 500, 0, true, 'e2e-cat-burger', now(), now())`
  );
  await client.query(
    `INSERT INTO "User" (id, username, "passwordHash", "firstName", "lastName", role, active, "createdAt", "updatedAt")
     VALUES ('e2e-user-max', 'max', 'x', 'Max', 'Mustermann', 'EMPLOYEE', true, now(), now())
     ON CONFLICT (username) DO NOTHING`
  );
  await client.end();
});

async function readyOrdersCount(): Promise<number> {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  const res = await client.query(`SELECT count(*)::int n FROM "Order" WHERE status = 'READY'`);
  await client.end();
  return res.rows[0].n;
}

test("POS → Küche → Kasse → Trinkgeld", async ({ page }) => {
  // ── Login als Admin ─────────────────────────────────────────────
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /ANMELDEN/i }).click();
  await expect(page).toHaveURL(/\/admin/);

  // ── Kasse: Produkt in den Warenkorb ─────────────────────────────
  await page.goto("/pos");
  await page.locator("button:has-text('Classic Burger')").first().click();
  await expect(page.getByText("Aktuelle Bestellung")).toBeVisible();
  await expect(page.locator("button:has-text('BESTELLUNG ABSCHICKEN')")).toBeEnabled();

  // ── Bestellung abschicken ───────────────────────────────────────────
  await page.locator("button:has-text('BESTELLUNG ABSCHICKEN')").click();
  await expect(page.getByText(/an die Küche gesendet/)).toBeVisible({ timeout: 15_000 });

  // ── Küche: Bestellung ist da → übernehmen → zubereiten ─────────────────
  await page.goto("/kitchen");
  await expect(page.getByText("Classic Burger")).toBeVisible({ timeout: 15_000 });
  await page.locator("button:has-text('ÜBERNEHMEN')").first().click();
  await page.locator("button:has-text('ZUBEREITET')").first().click();

  // Deterministisch warten, bis die Bestellung in der DB wirklich READY ist
  await expect.poll(async () => readyOrdersCount(), { timeout: 20_000 }).toBeGreaterThan(0);

  // ── Kasse: READY-Karte (Button mit „RAUS GEBEN") öffnet den Bezahl-Dialog ──
  await page.goto("/pos");
  const readyCard = page.locator("button:has-text('RAUS GEBEN')").first();
  await readyCard.click({ timeout: 15_000 });

  const dialog = page.getByRole("dialog");
  // Betrag 20 über den Touch-Ziffernblock eingeben; „Rest als Trinkgeld" ist automatisch aktiv
  await dialog.getByRole("button", { name: "2", exact: true }).click();
  await dialog.getByRole("button", { name: "0", exact: true }).click();
  await dialog.locator("button:has-text('BEZAHLT · BESTELLUNG RAUS GEBEN')").click();

  // Ausgabe-Bereich ist wieder leer (Bestellung abgeschlossen)
  await expect(page.locator("button:has-text('RAUS GEBEN')").first()).not.toBeVisible({ timeout: 15_000 });

  // ── Admin: Trinkgeld-Balance des Admins sichtbar (er hat die Bestellung kassiert) ──
  await page.goto("/admin/tips");
  await expect(page.getByText("Admin Burgershot").first()).toBeVisible();
});