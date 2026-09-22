import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gesundheits-Endpunkt: prüft Server + Datenbank-Verbindung. */
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  return Response.json({ ok: db, db, time: new Date().toISOString() }, { status: db ? 200 : 503 });
}