# Deployment

Das Projekt ist deployment-fertig: **Next.js 16 standalone Build**, Prisma-Migrationen,
keine hartcodierten Secrets. Für ein produktives Deployment sind diese Dinge nötig:

1. **PostgreSQL-Datenbank** (z. B. Supabase, Neon, Railway, RDS) → `DATABASE_URL`
2. **Secrets**: `AUTH_SESSION_TTL_HOURS`, `APP_TIMEZONE`, `NEXT_PUBLIC_APP_URL`
3. **Migrationen** beim Deployment: `npx prisma migrate deploy`

> Wichtig: `prisma migrate deploy` und die Anwendung selbst benötigen zwingend eine
> gültige `DATABASE_URL`. Es gibt bewusst keinen „Build ohne Datenbank“-Umweg –
> ohne DB-Credentials keine Migrationen, ohne DB keine funktionierende App
> (Fehlermeldung dann explizit: „DATABASE_URL ist nicht gesetzt …“).

## Netlify (schrittweise)

1. **Datenbank anlegen** (z. B. kostenlos bei [Supabase](https://supabase.com) oder
   [Neon](https://neon.tech) oder bei eurem Cloud-Hoster): PostgreSQL-Projekt starten,
   im Dashboard den Connection String kopieren (Form:
   `postgresql://user:password@host:5432/database`).
2. **Site → Site configuration → Environment variables** eintragen:

   | Name | Wert |
   | --- | --- |
   | `DATABASE_URL` | der Connection-String (unbedingt eigene Werte, niemals teilen) |
   | `AUTH_SESSION_TTL_HOURS` | z. B. `12` |
   | `APP_TIMEZONE` | z. B. `Europe/Berlin` |
   | `NEXT_PUBLIC_APP_URL` | z. B. `https://DEINE-SITE.netlify.app` |
   | `ADMIN_PASSWORD` | Nur für den ERSTEN Login: legt den Admin-Zugang an (danach entfernen oder ändern) |
   | `ADMIN_USERNAME` | optional, Standard `admin` |

3. **Build settings:**
   - Build command: `npx prisma migrate deploy && node scripts/bootstrap-admin.mjs && npm run build`
   - Publish directory: `.next` (Next.js-Preset verwenden)
   - Node-Version: >= 20 (Build-Umgebung bietet z. B. Node 24)

4. Deployen: Der erste Build führt die Migrationen aus, legt den Admin-Zugang an
   (`ADMIN_PASSWORD`) und baut die App. Die App liest zur Laufzeit dieselbe
   `DATABASE_URL`.

> TLS: Supabase/Neon verlangen verschlüsselte Verbindungen. Trage bei der Datenbank-URL
> `?sslmode=require` an (z. B. `postgresql://user:pass@host:5432/db?sslmode=require`)
> oder setze `DATABASE_SSL=true`. Ohne SSL melden diese Anbieter Verbindungsfehler.

Hinweis: Der Build schlägt bei fehlender `DATABASE_URL` mit einer klaren Prisma-Meldung
fehl (`datasource.url property is required`) – das ist gewollt und zeigt, dass die
Variable gesetzt werden muss.

## Weitere Optionen

### Vercel

- Framework Preset: Next.js; Environment Variables siehe oben; Build `npm run build`,
  Start `npm start`; nach dem ersten Deploy `npx prisma migrate deploy` gegen die
  Produktions-DB ausführen.

### Railway / Fly.io / Render

- Build-Typ: **Dockerfile** (im Repo enthalten); PostgreSQL-Addon anlegen,
  `DATABASE_URL` in die App-Umgebung eintragen; Migrationen beim Deploy ausführen.

## Produktions-Hinweise

- **Demo-Zugangsdaten zwingend ändern** (`admin/admin123` u. a., siehe README).
- Sessions sind DB-gestützt (`Session`-Tabelle) und funktionieren multi-instance.
- Echtzeit (SSE) nutzt einen In-Process-Event-Bus – für horizontale Skalierung
  auf mehreren Nodes greift der 20-s-Polling-Fallback; ein externer Pub/Sub
  (Redis) wäre die Skalierungsoption.
- HTTPS stellt der Host; Cookies werden in Production automatisch mit `Secure` gesendet.
- Falls ein Deployment externe Zugangsdaten erfordert, die nicht vorhanden sind:
  werden keine erfundenen Zugangsdaten erzeugt – stattdessen hier eintragen.