"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession, getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { roleHome } from "@/lib/roles";
import { loginSchema } from "@/lib/validation";
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