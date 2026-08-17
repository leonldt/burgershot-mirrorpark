"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { formatMoney } from "@/lib/money";

export type ActionResult = { ok: false; error: string } | { ok: true };

/**
 * Trinkgeld eines Mitarbeiters vollständig auszahlen.
 * Race-sicher: Die User-Zeile wird innerhalb der Transaktion mit SELECT ... FOR UPDATE
 * gesperrt, sodass zwei parallele Auszahlungen nie denselben Saldo doppelt verbuchen.
 */
export async function payoutTips(employeeId: string): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const admin = await requireRole([Roles.ADMIN]);
  if (!employeeId) return { ok: false, error: "Ungültiger Mitarbeiter." };
  try {
    const amountCents = await prisma.$transaction(async (tx) => {
      const user = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${employeeId} FOR UPDATE`;
      if (user.length === 0) throw new Error("employee-not-found");

      const earned = await tx.tipTransaction.aggregate({ where: { employeeId }, _sum: { amountCents: true } });
      const paidOut = await tx.tipPayout.aggregate({ where: { employeeId }, _sum: { amountCents: true } });
      const balance = (earned._sum.amountCents ?? 0) - (paidOut._sum.amountCents ?? 0);
      if (balance <= 0) return { error: "empty" };

      await tx.tipPayout.create({ data: { employeeId, amountCents: balance, paidById: admin.id } });
      await tx.auditLog.create({
        data: { actorId: admin.id, action: "TIP_PAID_OUT", entity: "User", entityId: employeeId, details: `${formatMoney(balance)}` },
      });
      return { amountCents: balance };
    });
    if ("error" in amountCents) return { ok: false, error: "Aktuell ist kein auszahlbares Trinkgeld vorhanden." };
    revalidatePath("/admin/tips");
    revalidatePath("/admin/employees");
    return { ok: true, amountCents: amountCents.amountCents };
  } catch {
    return { ok: false, error: "Auszahlung fehlgeschlagen." };
  }
}