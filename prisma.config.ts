import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Die `datasource` ist nur nötig, wenn ein DB-Befehl ausgeführt wird
  // (migrate/seed/studio). `prisma generate` (postinstall) funktioniert auch ohne
  // DATABASE_URL – z. B. beim Build ohne Datenbank-Verbindung (CI/Netlify).
  ...(process.env.DATABASE_URL ? { datasource: { url: env("DATABASE_URL") } } : {}),
});