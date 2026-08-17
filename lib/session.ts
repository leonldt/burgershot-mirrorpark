import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_TTL } from "@/lib/constants";

export type SessionUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "EMPLOYEE" | "KITCHEN";
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Erstellt eine Session und gibt das Klartext-Token zurück (DB speichert nur den Hash). */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL) },
  });
  return token;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, username: true, firstName: true, lastName: true, role: true, active: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.active) return null;
  return session.user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => undefined);
  }
  jar.delete(SESSION_COOKIE);
}