import { describe, expect, it } from "vitest";
import { formatMoney, parseDollarsToCents } from "./money";
import { FORMATTED_ORDER_NUMBER } from "./constants";

describe("formatMoney", () => {
  it("zeigt Beträge in ganzen Dollar ohne Nachkommastellen", () => {
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(500)).toBe("$5");
    expect(formatMoney(200000)).toBe("$2,000");
    expect(formatMoney(15000)).toBe("$150");
  });
});

describe("parseDollarsToCents", () => {
  it("parst Beträge valide", () => {
    expect(parseDollarsToCents("20")).toBe(2000);
    expect(parseDollarsToCents("20.5")).toBe(2050);
    expect(parseDollarsToCents("$19,90")).toBe(1990);
  });
  it("lehnt ungültige Eingaben ab", () => {
    expect(() => parseDollarsToCents("-1")).toThrow();
    expect(() => parseDollarsToCents("abc")).toThrow();
    expect(() => parseDollarsToCents("20.999")).toThrow();
  });
});

describe("orderDisplayNumber", () => {
  it("zeigt die Bestellnummer mit #-Prefix", () => {
    expect(FORMATTED_ORDER_NUMBER(42)).toBe("#1042");
  });
});