"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: false; error: string } | { ok: true };

/** Lieferant bestätigt: Ware ist eingegangen (Status OFFEN → GELIEFERT). */
export async function confirmDelivered(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.SUPPLIER, Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Ungültige Listen-ID." };
  try {
    const list = await prisma.purchaseList.findUnique({ where: { id } });
    if (!list) return { ok: false, error: "Einkaufsliste nicht gefunden." };
    if (user.role !== Roles.ADMIN && list.supplierId !== user.id) {
      return { ok: false, error: "Diese Liste gehört nicht zu deinem Konto." };
    }
    if (list.status !== "OFFEN") return { ok: false, error: "Liste ist bereits bestätigt." };
    await prisma.purchaseList.update({ where: { id }, data: { status: "GELIEFERT" } });
    await logAudit(user.id, "PURCHASE_LIST_DELIVERED", "PurchaseList", id);
    revalidatePath("/supplier");
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Bestätigung fehlgeschlagen." };
  }
}