import { PrismaClient } from "../lib/generated/prisma/client";
import { Role } from "../lib/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

/**
 * Seed: legt NUR den initialen Admin-Zugang an.
 * Kein Demo-Modus – der Betrieb startet bei 0:
 * keine Produkte, Kategorien, Menüs, Bestellungen oder Demo-Mitarbeiter.
 * Alles weitere legt der Admin selbst im Admin-Panel an.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    // Bestehendes Passwort wird NICHT überschrieben (nur Name/Rolle/Status gepflegt).
    update: { firstName: "Admin", lastName: "Burgershot", role: Role.ADMIN, active: true },
    create: {
      username: "admin",
      firstName: "Admin",
      lastName: "Burgershot",
      role: Role.ADMIN,
      active: true,
      passwordHash,
    },
  });
  console.log("Seed abgeschlossen: nur der Admin-Zugang ist angelegt (admin / admin123 – Initial-Passwort, bitte nach dem ersten Login ändern).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });