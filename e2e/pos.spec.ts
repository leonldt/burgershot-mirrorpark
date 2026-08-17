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
  await page.locator("button:has-text('Burger')").first().click();
  await page.locator("button:has-text('Classic Burger')").first().click();
  await expect(page.getByText("Aktuelle Bestellung")).toBeVisible();

  // ── Bestellung abschicken ───────────────────────────────────────────
  await page.locator("button:has-text('BESTELLUNG ABSCHICKEN')").click();
  await expect(page.getByText(/Bestellung #\d+ an die Küche gesendet/)).toBeVisible();

  // ── Küche: übernehmen & zubereiten ─────────────────────────────────────────
  await page.goto("/kitchen");
  await page.locator("button:has-text('ÜBERNEHMEN')").first().click();
  await page.locator("button:has-text('ZUBEREITET')").first().click();

  // ── Kasse: Bestellung öffnen, bezahlen inkl. Trinkgeld ─────────────────────
  await page.goto("/pos");
  await page.locator("section:has-text('Bereit zur Ausgabe') button").first().click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("input[type='text']").or(dialog.locator("input[inputmode='decimal']")).fill("20");
  const tipBtn = dialog.locator("button:has-text('Rest als Trinkgeld')");
  if (await tipBtn.count()) await tipBtn.first().click();
  await dialog.locator("button:has-text('BEZAHLT · BESTELLUNG RAUS GEBEN')").click();

  await expect(page.getByText(/bezahlt & ausgegeben · Rückgeld \$\d+\.\d\d · Trinkgeld/)).toBeVisible();

  // ── Admin: Trinkgeld-Balance des Mitarbeiters sichtbar ──────────────────────
  await page.goto("/admin/tips");
  await expect(page.getByText("Max Mustermann").first()).toBeVisible();
});