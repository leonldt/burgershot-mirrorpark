/**
 * Geldbeträge werden IMMER als Ganzzahlen in Cent gespeichert und verarbeitet.
 * Keine Floats → keine Floating-Point-Fehler.
 */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** Parst Nutzereingaben wie "20", "20.5", "$20,50" zu Cent. */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/[$€£\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error("Ungültiger Betrag. Bitte nur Zahlen eingeben (z. B. 20 oder 19.50).");
  }
  return Math.round(Number(cleaned) * 100);
}

/** Rückgeld = Gegeben − Gesamt − Trinkgeld. Trinkgeld wird NIE automatisch aus dem Rückgeld abgeleitet. */
export function calculateChange(totalCents: number, givenCents: number, tipCents: number): number {
  return givenCents - totalCents - tipCents;
}