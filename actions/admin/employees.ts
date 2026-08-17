"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { employeeSchema, passwordSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { errCode } from "@/lib/errors";

export type ActionResult = { ok: false; error: string } | { ok: true };

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const base = employeeSchema.safeParse({
    username: formData.get("username"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
  });
  if (!base.success) return { ok: false, error: base.error.issues[0]?.message ?? "Ungültige Daten." };
  const pw = passwordSchema.safeParse({ password: formData.get("password") });
  if (!pw.success) return { ok: false, error: pw.error.issues[0]?.message ?? "Ungültiges Passwort." };
  try {
    const passwordHash = await hashPassword(pw.data.password);
    const emp = await prisma.user.create({
      data: { ...base.data, passwordHash, active: true },
      select: { id: true, username: true },
    });
    await logAudit(user.id, "EMPLOYEE_CREATED", "User", emp.id, emp.username);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2002") return { ok: false, error: "Dieser Benutzername ist bereits vergeben." };
    return { ok: false, error: "Mitarbeiter konnte nicht erstellt werden." };
  }
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const base = employeeSchema.safeParse({
    username: formData.get("username"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
  });
  if (!base.success) return { ok: false, error: base.error.issues[0]?.message ?? "Ungültige Daten." };
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Mitarbeiter nicht gefunden." };
    await prisma.user.update({ where: { id }, data: base.data });
    await logAudit(user.id, "EMPLOYEE_UPDATED", "User", id, `${base.data.username} · Rolle ${base.data.role}`);
    return ok();
  } catch (e) {
    if (errCode(e) === "P2002") return { ok: false, error: "Dieser Benutzername ist bereits vergeben." };
    return { ok: false, error: "Mitarbeiter konnte nicht aktualisiert werden." };
  }
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const pw = passwordSchema.safeParse({ password: formData.get("password") });
  if (!pw.success) return { ok: false, error: pw.error.issues[0]?.message ?? "Ungültiges Passwort." };
  try {
    const passwordHash = await hashPassword(pw.data.password);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await logAudit(user.id, "PASSWORD_RESET", "User", id);
    return ok();
  } catch {
    return { ok: false, error: "Passwort konnte nicht zurückgesetzt werden." };
  }
}

export async function toggleEmployee(formData: FormData): Promise<ActionResult> {
  const user = await requireRole([Roles.ADMIN]);
  const id = String(formData.get("id") ?? "");
  try {
    const emp = await prisma.user.findUnique({ where: { id } });
    if (!emp) return { ok: false, error: "Mitarbeiter nicht gefunden." };
    if (emp.id === user.id && emp.active) return { ok: false, error: "Du kannst dich nicht selbst deaktivieren." };
    await prisma.user.update({ where: { id }, data: { active: !emp.active } });
    await logAudit(user.id, emp.active ? "EMPLOYEE_DEACTIVATED" : "EMPLOYEE_ACTIVATED", "User", id, `${emp.firstName} ${emp.lastName}`);
    return ok();
  } catch {
    return { ok: false, error: "Status konnte nicht geändert werden." };
  }
}

function ok(): ActionResult {
  revalidatePath("/admin/employees");
  return { ok: true };
}