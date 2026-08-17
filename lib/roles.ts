import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";

export const Roles = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  KITCHEN: "KITCHEN",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Grundlegende Rollenprüfung – die tatsächliche Autorisierung passiert zusätzlich in jeder Aktion/Route serverseitig. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

export function roleHome(role: Role): string {
  switch (role) {
    case Roles.ADMIN:
      return "/admin";
    case Roles.KITCHEN:
      return "/kitchen";
    default:
      return "/pos";
  }
}