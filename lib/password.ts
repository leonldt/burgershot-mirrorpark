import { hash, compare } from "bcryptjs";

/** Passwörter werden ausschließlich als bcrypt-Hash gespeichert (12 Runden). */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}