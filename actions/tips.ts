"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { formatMoney } from "@/lib/money";

export type ActionResult = { ok: false; error: string } | { ok: true };

/** Manuelles Trinkgeld eintragen (nur ganze Dollar, Betrag > 0). */
export async function addManualTip(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const raw = String(formData.get("amount") ?? "").trim();
  if (!/^\d{1,6}$/.test(raw)) {
    return { ok: false, error: "Betrag nur in ganzen Dollar angeben (z. B. 5)." };
  }
  const amountCents = Number(raw) * 100;
  if (amountCents < 100 || amountCents > 10_000_000) {
    return { ok: false, error: "Ungültiger Betrag." };
  }
  try {
    const tip = await prisma.tipTransaction.create({
      data: { employeeId: user.id, amountCents, note: "Manuell eingetragen", createdById: user.id },
    });
    await logAudit(user.id, "TIP_ADDED_MANUAL", "TipTransaction", tip.id, `${formatMoney(amountCents)}`);
    revalidatePath("/me");
    revalidatePath("/admin/tips");
    return { ok: true };
  } catch {
    return { ok: false, error: "Eintrag konnte nicht gespeichert werden." };
  }
}

/** Eigenen manuellen Trinkgeld-Eintrag entfernen. Bestellbezogene Einträge sind unveränderlich. */
export async function removeManualTip(tipId: string): Promise<ActionResult> {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  try {
    const tip = await prisma.tipTransaction.findUnique({ where: { id: tipId } });
    if (!tip) return { ok: false, error: "Eintrag nicht gefunden." };
    if (tip.orderId) return { ok: false, error: "Nur manuelle Einträge können entfernt werden." };
    if (tip.employeeId !== user.id && user.role !== Roles.ADMIN) {
      return { ok: false, error: "Nur eigene Einträge können entfernt werden." };
    }
    await prisma.tipTransaction.delete({ where: { id: tipId } });
    await logAudit(user.id, "TIP_REMOVED_MANUAL", "TipTransaction", tipId, `${formatMoney(tip.amountCents)}`);
    revalidatePath("/me");
    revalidatePath("/admin/tips");
    return { ok: true };
  } catch {
    return { ok: false, error: "Eintrag konnte nicht entfernt werden." };
  }
}