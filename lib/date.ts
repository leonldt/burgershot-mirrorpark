/** Tagesgrenzen & Formatierung – Zeitzonen-konfigurierbar (APP_TIMEZONE). */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Berlin";

/** Zeitversatz (ms) der Zeitzone gegenüber UTC zum Zeitpunkt `at`. */
export function tzOffsetMs(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - at.getTime();
}

/** UTC-Bereich (start inkl., end exkl.) für einen lokalen Kalendertag "YYYY-MM-DD". */
export function dayRange(dateStr: string, tz: string = APP_TIMEZONE): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const atNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const offset = tzOffsetMs(tz, atNoon);
  const start = new Date(Date.UTC(y, m - 1, d) - offset);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/** Heutiges Datum als "YYYY-MM-DD" in der Zeit-Zone. */
export function todayStr(tz: string = APP_TIMEZONE): string {
  return dateStrInTz(new Date(), tz);
}

/** Datum als "YYYY-MM-DD" in der Zeit-Zone. */
export function dateStrInTz(d: Date, tz: string = APP_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return dtf.format(d);
}

/** Zeitraum für einen vordefinierten Zeitraum (today/yesterday/week/month/custom). */
export function periodRange(
  period: string,
  from?: string,
  to?: string,
  tz: string = APP_TIMEZONE
): { start: Date; end: Date } {
  if (period === "custom" && from && to) {
    return { start: dayRange(from, tz).start, end: dayRange(to, tz).end };
  }
  const now = new Date();
  if (period === "yesterday") {
    return dayRange(dateStrInTz(new Date(now.getTime() - 86_400_000), tz), tz);
  }
  if (period === "week") {
    const dow = (now.getDay() + 6) % 7; // Montag = 0
    return dayRange(dateStrInTz(new Date(now.getTime() - dow * 86_400_000), tz), tz);
  }
  if (period === "month") {
    const [y, m] = todayStr(tz).split("-").map(Number);
    const start = dayRange(`${y}-${String(m).padStart(2, "0")}-01`, tz).start;
    const nextMonthStart = new Date(Date.UTC(y, m, 1, 12));
    const end = new Date(Date.UTC(y, m, 1) - tzOffsetMs(tz, nextMonthStart));
    return { start, end };
  }
  return dayRange(todayStr(tz), tz);
}

export function formatDateTime(d: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatTime(d: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
}