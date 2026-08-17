import { expect, test } from "@playwright/test";

/**
 * Kompletter Ablauf: Login → Kasse/Bestellung → Küche → Ausgabe an der Kasse →
 * Trinkgeld wird dem Mitarbeiter gutgeschrieben.
 */
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

  // ── Kasse: READY-Karte (Button mit „RAUS GEBEN") öffnet den Bezahl-Dialog ──
  await page.goto("/pos");
  const readyCard = page.locator("button:has-text('RAUS GEBEN')").first();
  await readyCard.click({ timeout: 15_000 });

  const dialog = page.getByRole("dialog");
  await dialog.locator("input").fill("20");
  await dialog.locator("button:has-text('Rest als Trinkgeld')").click();
  await dialog.locator("button:has-text('BEZAHLT · BESTELLUNG RAUS GEBEN')").click();

  // Ausgabe-Bereich ist wieder leer (Bestellung abgeschlossen)
  await expect(page.locator("button:has-text('RAUS GEBEN')").first()).not.toBeVisible({ timeout: 15_000 });

  // ── Admin: Trinkgeld-Balance des Mitarbeiters sichtbar ──────────────────────
  await page.goto("/admin/tips");
  await expect(page.getByText("Max Mustermann").first()).toBeVisible();
});