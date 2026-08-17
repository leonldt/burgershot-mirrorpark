import { describe, expect, it } from "vitest";
import { dayRange, todayStr, periodRange, dateStrInTz } from "./date";

describe("date helpers", () => {
  it("todayStr liefert YYYY-MM-DD", () => {
    const s = todayStr("Europe/Berlin");
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dayRange liefert 24h exklusiv", () => {
    const r = dayRange("2026-08-17", "Europe/Berlin");
    expect(r.end.getTime() - r.start.getTime()).toBe(86_400_000);
  });

  it("periodRange monat beginnt am 1. des Monats (lokal)", () => {
    const r = periodRange("month");
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    expect(dateStrInTz(r.start)).toBe(`${y}-${m}-01`);
  });
});