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
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 10,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}