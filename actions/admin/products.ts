"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { errCode } from "@/lib/errors";
import { productSchema } from "@/lib/validation";
import { formatMoney } from "@/lib/money";

export type ActionResult = { ok: false; error: string } | { ok: true };

function parseProductForm(fd: FormData) {
  return {
    name: fd.get("name"),
    description: fd.get("description") ?? "",
    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),
    categoryId: fd.get("categoryId"),
    active: fd.get("active") === "on",
  };
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const parsed = productSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  const { name, description, priceCents, categoryId, active } = parsed.data;
  try {
    const max = await prisma.product.aggregate({ _max: { sortOrder: true } });
    const prod = await prisma.product.create({
      data: { name, description: description || null, priceCents, categoryId, active, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
    await logAudit(user.id, "PRODUCT_CREATED", "Product", prod.id, `${name} · ${formatMoney(priceCents)}`);
    return ok();
  } catch {
    return { ok: false, error: "Produkt konnte nicht erstellt werden." };
  }
}

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  const { name, description, priceCents, categoryId, active } = parsed.data;
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Produkt nicht gefunden." };
    await prisma.product.update({ where: { id }, data: { name, description: description || null, priceCents, categoryId, active } });
    if (existing.priceCents !== priceCents) {
      await logAudit(user.id, "PRODUCT_PRICE_CHANGED", "Product", id, `${name} · ${formatMoney(existing.priceCents)} → ${formatMoney(priceCents)}`);
    }
    await logAudit(user.id, "PRODUCT_UPDATED", "Product", id, name);
    return ok();
  } catch {
    return { ok: false, error: "Produkt konnte nicht aktualisiert werden." };
  }
}

export async function toggleProduct(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return { ok: false, error: "Produkt nicht gefunden." };
    await prisma.product.update({ where: { id }, data: { active: !product.active } });
    await logAudit(user.id, product.active ? "PRODUCT_DEACTIVATED" : "PRODUCT_ACTIVATED", "Product", id, product.name);
    return ok();
  } catch {
    return { ok: false, error: "Status konnte nicht geändert werden." };
  }
}

export async function deleteProduct(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return { ok: false, error: "Produkt nicht gefunden." };
    await prisma.product.delete({ where: { id } });
    await logAudit(user.id, "PRODUCT_DELETED", "Product", id, product.name);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2003") return { ok: false, error: "Produkt wird in einem Menü verwendet und kann nicht gelöscht werden." };
    return { ok: false, error: "Produkt konnte nicht gelöscht werden." };
  }
}

/** Sortierung einer Kategorie per Drag & Drop: Liste der Produkt-IDs in neuer Reihenfolge. */
export async function reorderProducts(input: { productIds: string[] }): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  if (!Array.isArray(input.productIds)) return { ok: false, error: "Ungültige Sortierung." };
  try {
    await prisma.$transaction(
      input.productIds.map((id, index) => prisma.product.update({ where: { id }, data: { sortOrder: index } }))
    );
    await logAudit(user.id, "PRODUCTS_REORDERED", "Product");
    return ok();
  } catch {
    return { ok: false, error: "Sortierung konnte nicht gespeichert werden." };
  }
}

function ok(): ActionResult {
  revalidatePath("/admin/products");
  revalidatePath("/pos");
  return { ok: true };
}