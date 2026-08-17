"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { categorySchema } from "@/lib/validation";
import { errCode } from "@/lib/errors";

export type ActionResult = { ok: false; error: string } | { ok: true };

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  try {
    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const cat = await prisma.category.create({ data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    await logAudit(user.id, "CATEGORY_CREATED", "Category", cat.id, cat.name);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2002") return { ok: false, error: "Eine Kategorie mit diesem Namen existiert bereits." };
    return { ok: false, error: "Kategorie konnte nicht erstellt werden." };
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  try {
    await prisma.category.update({ where: { id }, data: { name: parsed.data.name } });
    await logAudit(user.id, "CATEGORY_UPDATED", "Category", id, parsed.data.name);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2002") return { ok: false, error: "Eine Kategorie mit diesem Namen existiert bereits." };
    if (errCode(e) === "P2025") return { ok: false, error: "Kategorie nicht gefunden." };
    return { ok: false, error: "Kategorie konnte nicht aktualisiert werden." };
  }
}

export async function toggleCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) return { ok: false, error: "Kategorie nicht gefunden." };
    await prisma.category.update({ where: { id }, data: { active: !cat.active } });
    await logAudit(user.id, cat.active ? "CATEGORY_DEACTIVATED" : "CATEGORY_ACTIVATED", "Category", id, cat.name);
    return ok();
  } catch {
    return { ok: false, error: "Status konnte nicht geändert werden." };
  }
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) return { ok: false, error: "Kategorie nicht gefunden." };
    await prisma.category.delete({ where: { id } });
    await logAudit(user.id, "CATEGORY_DELETED", "Category", id, cat.name);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2003") return { ok: false, error: "Kategorie enthält Produkte oder Menüs und kann nicht gelöscht werden." };
    return { ok: false, error: "Kategorie konnte nicht gelöscht werden." };
  }
}

export async function reorderCategories(input: { categoryIds: string[] }): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  if (!Array.isArray(input.categoryIds)) return { ok: false, error: "Ungültige Sortierung." };
  try {
    await prisma.$transaction(input.categoryIds.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } })));
    await logAudit(user.id, "CATEGORIES_REORDERED", "Category");
    return ok();
  } catch {
    return { ok: false, error: "Sortierung konnte nicht gespeichert werden." };
  }
}

function ok(): ActionResult {
  revalidatePath("/admin/categories");
  revalidatePath("/pos");
  revalidatePath("/admin/products");
  revalidatePath("/admin/menus");
  return { ok: true };
}