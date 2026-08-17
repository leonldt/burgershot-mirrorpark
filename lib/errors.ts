/** Ermittelt den Prisma-Fehlercode (z. B. P2002, P2003) aus einem Fehler. */
export function errCode(e: unknown): string {
  return (e as { code?: string })?.code ?? "unknown";
}