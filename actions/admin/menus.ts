"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { menuSchema } from "@/lib/validation";
import { formatMoney } from "@/lib/money";

export type ActionResult = { ok: false; error: string } | { ok: true };

function parseMenuForm(fd: FormData) {
  let items: unknown = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  return {
    name: fd.get("name"),
    description: fd.get("description") ?? "",
    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),
    categoryId: fd.get("categoryId"),
    active: fd.get("active") === "on",
    items,
  };
}

export async function createMenu(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const parsed = menuSchema.safeParse(parseMenuForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  const { name, description, priceCents, categoryId, active, items } = parsed.data;
  try {
    const max = await prisma.menu.aggregate({ _max: { sortOrder: true } });
    const menu = await prisma.menu.create({
      data: {
        name, description: description || null, priceCents, categoryId, active,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      },
    });
    await logAudit(user.id, "MENU_CREATED", "Menu", menu.id, `${name} · ${formatMoney(priceCents)}`);
    return ok();
  } catch {
    return { ok: false, error: "Menü konnte nicht erstellt werden." };
  }
}

export async function updateMenu(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const parsed = menuSchema.safeParse(parseMenuForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  const { name, description, priceCents, categoryId, active, items } = parsed.data;
  try {
    const existing = await prisma.menu.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Menü nicht gefunden." };
    await prisma.$transaction(async (tx) => {
      await tx.menuItem.deleteMany({ where: { menuId: id } });
      await tx.menu.update({
        where: { id },
        data: { name, description: description || null, priceCents, categoryId, active, items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) } },
      });
    });
    if (existing.priceCents !== priceCents) {
      await logAudit(user.id, "MENU_PRICE_CHANGED", "Menu", id, `${name} · ${formatMoney(existing.priceCents)} → ${formatMoney(priceCents)}`);
    }
    await logAudit(user.id, "MENU_UPDATED", "Menu", id, name);
    return ok();
  } catch {
    return { ok: false, error: "Menü konnte nicht aktualisiert werden." };
  }
}

export async function toggleMenu(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu) return { ok: false, error: "Menü nicht gefunden." };
    await prisma.menu.update({ where: { id }, data: { active: !menu.active } });
    await logAudit(user.id, menu.active ? "MENU_DEACTIVATED" : "MENU_ACTIVATED", "Menu", id, menu.name);
    return ok();
  } catch {
    return { ok: false, error: "Status konnte nicht geändert werden." };
  }
}

export async function deleteMenu(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu) return { ok: false, error: "Menü nicht gefunden." };
    await prisma.menu.delete({ where: { id } });
    await logAudit(user.id, "MENU_DELETED", "Menu", id, menu.name);
    return ok();
  } catch {
    return { ok: false, error: "Menü konnte nicht gelöscht werden." };
  }
}

export async function reorderMenus(input: { menuIds: string[] }): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  if (!Array.isArray(input.menuIds)) return { ok: false, error: "Ungültige Sortierung." };
  try {
    await prisma.$transaction(input.menuIds.map((id, index) => prisma.menu.update({ where: { id }, data: { sortOrder: index } })));
    await logAudit(user.id, "MENUS_REORDERED", "Menu");
    return ok();
  } catch {
    return { ok: false, error: "Sortierung konnte nicht gespeichert werden." };
  }
}

function ok(): ActionResult {
  revalidatePath("/admin/menus");
  revalidatePath("/pos");
  return { ok: true };
}