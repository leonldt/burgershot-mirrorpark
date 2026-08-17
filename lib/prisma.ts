import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Die Anwendung benötigt im Betrieb zwingend eine PostgreSQL-Datenbank. " +
        "Lokale Entwicklung: npm run db:start (embedded PostgreSQL). " +
        "Deployment: DATABASE_URL in der Host-Umgebung setzen (siehe DEPLOYMENT.md / README.md)."
    );
  }

  // Gehostete Anbieter (Supabase/Neon u. ä.) verlangen TLS. Aktivierung:
  // per `?sslmode=require` in der URL oder Env DATABASE_SSL=true.
  let sslMode = false;
  try {
    sslMode = new URL(connectionString).searchParams.get("sslmode") === "require" || process.env.DATABASE_SSL === "true";
  } catch {
    sslMode = process.env.DATABASE_SSL === "true";
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 10,
    ...(sslMode ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}