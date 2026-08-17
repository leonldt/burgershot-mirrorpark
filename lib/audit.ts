import { prisma } from "@/lib/prisma";

/**
 * Schreibt einen Audit-Log-Eintrag. Fehler beim Schreiben dürfen den Betrieb
 * nie unterbrechen (das Log ist Beobachtung, nicht kritischer Pfad).
 */
export async function logAudit(actorId: string, action: string, entity?: string, entityId?: string, details?: string): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, details: details ?? null } });
  } catch {
    // ignorieren
  }
}