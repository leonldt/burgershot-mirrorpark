# Deployment

Das Projekt ist deployment-fertig: **Next.js 16 standalone Build**, Prisma-Migrationen,
keine hartcodierten Secrets. Für ein produktives Deployment sind drei Dinge nötig:

1. **PostgreSQL-Datenbank** (z. B. Supabase, Neon, Railway, RDS) → `DATABASE_URL`
2. **Secrets**: `AUTH_SESSION_TTL_HOURS`, `APP_TIMEZONE`, `NEXT_PUBLIC_APP_URL`
3. **Migrationen** beim Deployment ausführen: `npx prisma migrate deploy`

## Optionen

### Vercel

- Framework Preset: Next.js
- Environment Variables: `DATABASE_URL`, `AUTH_SESSION_TTL_HOURS`, `APP_TIMEZONE`, `NEXT_PUBLIC_APP_URL`
- Nach dem ersten Deploy einmal `npx prisma migrate deploy` gegen die Produktions-DB ausführen

### Railway / Fly.io / Render

- Build-Typ: **Dockerfile** (im Repo enthalten)
- PostgreSQL-Addon anlegen, `DATABASE_URL` in die App-Umgebung eintragen

### Lokal per Docker Compose

```bash
docker compose up -d db      # PostgreSQL
npm run db:migrate           # Schema
npm run db:seed              # Demo-Daten
npm run dev
```

## Produktions-Hinweise

- **Demo-Zugangsdaten zwingend ändern** (`admin/admin123` u. a., siehe README).
- Sessions sind DB-gestützt (`Session`-Tabelle) und funktionieren multi-instance.
- Echtzeit (SSE) nutzt einen In-Process-Event-Bus – für horizontale Skalierung
  on mehreren Nodes greift der 20-s-Polling-Fallback; ein externer Pub/Sub
  (Redis) wäre die Skalierungsoption.
- HTTPS stellt der Host; Cookies werden in Production automatisch mit `Secure` gesendet.
- Falls ein Deployment externe Zugangsdaten erfordert, die nicht vorhanden sind:
  werden keine erfundenen Zugangsdaten erzeugt – stattdessen hier eintragen.