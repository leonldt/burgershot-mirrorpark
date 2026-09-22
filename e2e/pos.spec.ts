import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import pg from "pg";

/**
 * Kompletter Ablauf: Login → Kasse/Bestellung → Küche → Ausgabe an der Kasse →
 * Trinkgeld wird gutgeschrieben. Eigene Daten (keine Demo-Daten), plus ein
 * separater Test für die Stornierung einer Bestellung.
 */
const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/burgershot_test";

// Sauberer Zustand pro Lauf: Betriebsdaten leeren, minimaler Katalog + Mitarbeiter.
test.beforeEach(async () => {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  await client.query(
    `TRUNCATE TABLE "OrderItem", "Order", "TipTransaction", "TipPayout", "AuditLog",
       "MenuItem", "Menu", "Product", "Category", "Session",
       "SupplierProduct", "PurchaseListItem", "PurchaseList" CASCADE`
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

async function countOrders(status: string): Promise<number> {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  const res = await client.query(`SELECT count(*)::int n FROM "Order" WHERE status = $1`, [status]);
  await client.end();
  return res.rows[0].n;
}

async function createSession(username: string, token: string) {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  const idHash = createHash("sha256").update(token).digest("hex");
  await client.query(
    `INSERT INTO "Session" (id, "userId", "createdAt", "expiresAt") SELECT $1, id, now(), now() + interval '2 hours' FROM "User" WHERE username = $2`,
    [idHash, username]
  );
  await client.end();
}

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /ANMELDEN/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test("POS → Küche → Kasse → Trinkgeld", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/pos");
  await page.locator("button:has-text('Classic Burger')").first().click();
  await expect(page.getByText("Aktuelle Bestellung")).toBeVisible();
  await expect(page.locator("button:has-text('BESTELLUNG ABSCHICKEN')")).toBeEnabled();

  await page.locator("button:has-text('BESTELLUNG ABSCHICKEN')").click();
  await expect(page.getByText(/an die Küche gesendet/)).toBeVisible({ timeout: 15_000 });

  await page.goto("/kitchen");
  await expect(page.getByText("Classic Burger")).toBeVisible({ timeout: 15_000 });
  await page.locator("button:has-text('ÜBERNEHMEN')").first().click();
  await page.locator("button:has-text('ZUBEREITET')").first().click();

  await expect.poll(async () => countOrders("READY"), { timeout: 20_000 }).toBeGreaterThan(0);

  await page.goto("/pos");
  const readyCard = page.locator("button:has-text('RAUS GEBEN')").first();
  await readyCard.click({ timeout: 15_000 });

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "2", exact: true }).click();
  await dialog.getByRole("button", { name: "0", exact: true }).click();
  await dialog.locator("button:has-text('BEZAHLT · BESTELLUNG RAUS GEBEN')").click();

  await expect(page.locator("button:has-text('RAUS GEBEN')").first()).not.toBeVisible({ timeout: 15_000 });

  await page.goto("/admin/tips");
  await expect(page.getByText("Admin Burgershot").first()).toBeVisible();
});

test("Stornierung einer Bestellung", async ({ page }) => {
  await loginAsAdmin(page);

  // Bestellung aufgeben
  await page.goto("/pos");
  await page.locator("button:has-text('Classic Burger')").first().click();
  await page.locator("button:has-text('BESTELLUNG ABSCHICKEN')").click();
  await expect(page.getByText(/an die Küche gesendet/)).toBeVisible({ timeout: 15_000 });

  // In der Küche stornieren (Bestätigung akzeptieren)
  await page.goto("/kitchen");
  await expect(page.getByText("Classic Burger")).toBeVisible({ timeout: 15_000 });
  page.on("dialog", (d) => d.accept());
  await page.locator("button:has-text('Storno')").first().click();

  // Bestellung ist weg und in der DB als CANCELLED
  await expect(page.getByText("Keine Bestellungen").first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => countOrders("CANCELLED"), { timeout: 15_000 }).toBeGreaterThan(0);

  // Admin: Statusfilter zeigt die stornierte Bestellung
  await page.goto("/admin/orders?status=CANCELLED");
  await expect(page.locator("td", { hasText: "Storniert" }).first()).toBeVisible();
});

test("Mitarbeiter: eigenes Trinkgeld eintragen & entfernen", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/me");
  // Manuelles Trinkgeld über den Schnell-Button +$5 eintragen
  await page.getByRole("button", { name: "+$5" }).click();
  await expect(page.getByText("Trinkgeld wurde eingetragen.")).toBeVisible();
  await expect(page.getByText("Manueller Eintrag")).toBeVisible();

  // Eigenen manuellen Eintrag entfernen
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByText("Manueller Eintrag")).not.toBeVisible({ timeout: 15_000 });
});

test("Lieferant: Sortiment, Einkaufsliste und Bestätigung", async ({ page }) => {
  await loginAsAdmin(page);

  // Lieferant anlegen
  await page.goto("/admin/suppliers");
  await page.getByLabel(/Vorname/).fill("Lief");
  await page.getByLabel(/Nachname/).fill("Test");
  await page.getByLabel(/Benutzername/).fill("lief");
  await page.getByLabel(/Passwort/).fill("lief123");
  await page.getByRole("button", { name: "Lieferant anlegen" }).click();
  await expect(page.getByText("Lief Test").first()).toBeVisible();

  // Produkt zum Sortiment + Soll/Ist/Preise
  await page.locator("select[name='productId']").selectOption({ label: "Classic Burger" });
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await page.locator("input[name='sollMenge']").first().fill("10");
  await page.locator("input[name='istMenge']").first().fill("4");
  await page.locator("input[name='einkaufspreisCents']").first().fill("2");
  await page.locator("input[name='verkaufspreisCents']").first().fill("5");
  await page.getByRole("button", { name: "Speichern" }).first().click();
  await expect(page.getByText("+6").first()).toBeVisible(); // Differenz Soll − Ist

  // Einkaufsliste an den Lieferanten senden
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Einkaufsliste an Lieferant senden" }).click();
  await expect(page.getByText(/EK \$12 · VK \$30/)).toBeVisible();

  // Lieferant öffnet seine Ansicht (Session direkt angelegt) und bestätigt die Lieferung
  await createSession("lief", "lief-token");
  await page.context().addCookies([
    { name: "bs_session", value: "lief-token", domain: "127.0.0.1", path: "/", expires: Math.floor(Date.now() / 1000) + 3600, httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto("/supplier");
  await expect(page.getByText("Classic Burger")).toBeVisible();
  await page.getByRole("button", { name: "Lieferung bestätigen" }).click();
  await expect(page.getByText("Geliefert").first()).toBeVisible();
});