"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, destroySession, getSessionUser, hashToken } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { roleHome, requireUser } from "@/lib/roles";
import { loginSchema, changePasswordSchema } from "@/lib/validation";
import { SESSION_COOKIE, SESSION_TTL } from "@/lib/constants";

export type ActionResult = { ok: false; error: string } | { ok: true };

export async function loginAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Bitte Benutzername und Passwort eingeben." };

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  const valid = user && user.active && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!valid) return { ok: false, error: "Benutzername oder Passwort ist falsch." };

  const token = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL / 1000),
  });

  await logAudit(user.id, "LOGIN", "User", user.id, user.username);
  redirect(roleHome(user.role));
}

export async function logoutAction(): Promise<void> {
  const user = await getSessionUser();
  await destroySession();
  if (user) await logAudit(user.id, "LOGOUT", "User", user.id, user.username);
  redirect("/login");
}

/** Eigene Passwortänderung: verlangt das aktuelle Passwort, protokolliert die Änderung
 *  und beendet alle anderen Sessions des Nutzers (die aktuelle bleibt aktiv). */
export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  if (parsed.data.password !== parsed.data.confirm) {
    return { ok: false, error: "Die neuen Passwörter stimmen nicht überein." };
  }

  const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!stored) return { ok: false, error: "Benutzer nicht gefunden." };
  if (!(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))) {
    return { ok: false, error: "Das aktuelle Passwort ist falsch." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Andere Sessions beenden – die aktuelle bleibt bestehen.
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({
    where: { userId: user.id, ...(currentToken ? { NOT: { id: hashToken(currentToken) } } : {}) },
  });

  await logAudit(user.id, "PASSWORD_CHANGED_SELF", "User", user.id);
  return { ok: true };
}
