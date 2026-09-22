"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";

export type ActionResult = { ok: false; error: string } | { ok: true };

function dollarsToCents(v: unknown): number {
  const n = Math.round(Number(v ?? 0) * 100);
  return Number.isFinite(n) && n >= 0 ? n : -1;
}

function positiveInt(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

/** Lieferanten-Zugang anlegen (Rolle SUPPLIER). */
export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const admin = await requireRole([Roles.ADMIN]);
  const username = String(formData.get("username") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return { ok: false, error: "Benutzername: 3–30 Zeichen, nur Buchstaben/Zahlen/_." };
  if (!firstName || !lastName) return { ok: false, error: "Vor- und Nachname fehlen." };
  if (password.length < 6) return { ok: false, error: "Passwort muss mindestens 6 Zeichen haben." };
  try {
    const passwordHash = await hashPassword(password);
    const supplier = await prisma.user.create({
      data: { username, firstName, lastName, role: "SUPPLIER", active: true, passwordHash },
    });
    await logAudit(admin.id, "SUPPLIER_CREATED", "User", supplier.id, `${firstName} ${lastName} (@${username})`);
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Benutzername ist bereits vergeben." };
  }
}

/** Produkt dem Sortiment des Lieferanten hinzufügen. */
export async function addSupplierProduct(formData: FormData): Promise<ActionResult> {
  await requireRole([Roles.ADMIN]);
  const supplierId = String(formData.get("supplierId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!supplierId || !productId) return { ok: false, error: "Lieferant oder Produkt fehlt." };
  try {
    await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      update: {},
      create: { supplierId, productId, sollMenge: 0, istMenge: 0, einkaufspreisCents: 0, verkaufspreisCents: 0 },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Produkt konnte nicht zugeordnet werden." };
  }
}

/** Soll-/Ist-Menge und Preise eines Lieferanten-Produkts pflegen. */
export async function upsertSupplierProduct(formData: FormData): Promise<ActionResult> {
  const admin = await requireRole([Roles.ADMIN]);
  const supplierId = String(formData.get("supplierId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const sollMenge = positiveInt(formData.get("sollMenge"));
  const istMenge = positiveInt(formData.get("istMenge"));
  const einkaufspreisCents = dollarsToCents(formData.get("einkaufspreisCents"));
  const verkaufspreisCents = dollarsToCents(formData.get("verkaufspreisCents"));
  if (!supplierId || !productId) return { ok: false, error: "Lieferant oder Produkt fehlt." };
  if (sollMenge < 0 || istMenge < 0 || einkaufspreisCents < 0 || verkaufspreisCents < 0) {
    return { ok: false, error: "Werte dürfen nicht negativ sein." };
  }
  try {
    await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      update: { sollMenge, istMenge, einkaufspreisCents, verkaufspreisCents },
      create: { supplierId, productId, sollMenge, istMenge, einkaufspreisCents, verkaufspreisCents },
    });
    await logAudit(admin.id, "SUPPLIER_PRODUCT_UPDATED", "SupplierProduct", `${supplierId}:${productId}`, `Soll ${sollMenge} · Ist ${istMenge}`);
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Produktdaten konnten nicht gespeichert werden." };
  }
}

/** Produkt aus dem Sortiment des Lieferanten entfernen. */
export async function removeSupplierProduct(formData: FormData): Promise<ActionResult> {
  const admin = await requireRole([Roles.ADMIN]);
  const supplierId = String(formData.get("supplierId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  try {
    await prisma.supplierProduct.deleteMany({ where: { supplierId, productId } });
    await logAudit(admin.id, "SUPPLIER_PRODUCT_REMOVED", "SupplierProduct", `${supplierId}:${productId}`);
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch {
    return { ok: false, error: "Produkt konnte nicht entfernt werden." };
  }
}

/** Einkaufsliste aus allen Differenzpositionen (Soll − Ist > 0) erstellen und „an den Lieferanten senden“. */
export async function createPurchaseList(supplierId: string): Promise<{ ok: true; menge: number } | { ok: false; error: string }> {
  const admin = await requireRole([Roles.ADMIN]);
  try {
    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.user.findUnique({ where: { id: supplierId } });
      if (!supplier || supplier.role !== "SUPPLIER") throw new Error("supplier-not-found");

      const rows = await tx.supplierProduct.findMany({
        where: { supplierId, product: { active: true } },
        include: { product: { select: { id: true, name: true } } },
      });
      const items = rows
        .map((r) => {
          const menge = r.sollMenge - r.istMenge;
          if (menge <= 0) return null;
          return {
            productId: r.productId,
            productName: r.product.name,
            menge,
            einkaufspreisCents: r.einkaufspreisCents,
            verkaufspreisCents: r.verkaufspreisCents,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (items.length === 0) throw new Error("no-difference");

      await tx.purchaseList.create({
        data: {
          supplierId,
          status: "OFFEN",
          items: { create: items },
        },
      });
      return { menge: items.reduce((s, i) => s + i.menge, 0) };
    }).then(async (r) => {
      await logAudit(admin.id, "PURCHASE_LIST_CREATED", "PurchaseList", supplierId, `an @${(await prisma.user.findUnique({ where: { id: supplierId }, select: { username: true } }))?.username ?? ""} · ${r.menge} Stück`);
      revalidatePath("/admin/suppliers");
      revalidatePath("/supplier");
      return { ok: true as const, menge: r.menge };
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "supplier-not-found") return { ok: false, error: "Lieferant nicht gefunden." };
    if (code === "no-difference") return { ok: false, error: "Keine Differenz vorhanden – nichts zu bestellen." };
    return { ok: false, error: "Einkaufsliste konnte nicht erstellt werden." };
  }
}

/** Formular-Wrapper fürs Admin-Panel (ActionForm übergibt die ID in FormData). */
export async function createPurchaseListForm(formData: FormData): Promise<ActionResult> {
  const res = await createPurchaseList(String(formData.get("supplierId") ?? ""));
  return res.ok ? { ok: true } : res;
}