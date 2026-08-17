# 🍔 Burgershot Mirrorpark – Kassensystem (POS)

Internes POS-/Kassensystem für das fiktive Fastfood-Restaurant **Burgershot Mirrorpark**:
Bestellaufnahme an der Kasse, Echtzeit-Übertragung an die Küche, Bezahlung inkl. Trinkgeld,
Tagesbilanz, Mitarbeiterkonten und vollständiges Audit-Log.

**Produktionsnah:** echte Datenbank-Persistenz (PostgreSQL), serverseitige Rollen- und
Preisvalidierung, Race-Condition-Schutz (Transaktionen + Unique-Constraints), keine
Client-seitige Business-Logik, kein LocalStorage.

---

## Features

| Bereich | Funktionen |
| --- | --- |
| **Kasse** | Touch-optimiertes Terminal, Kategorien, Produkte & Menüs, Warenkorb (Mengen ±, entfernen, leeren), Bestellung abschicken (serverseitig validiert, Duplikat-sicher), „Bereit zur Ausgabe"-Panel mit Bezahl-Dialog (Gegeben / Rückgeld / Trinkgeld), Bestellung herausgeben |
| **Küche** | Echtzeit-Ansicht (SSE), Bestellkarten mit Zeiten, Übernehmen → Zubereiten → „ZUBEREITET" |
| **Echtzeit** | Server-Sent Events (Kasse ↔ Küche) mit Polling-Fallback – kein manueller Reload |
| **Admin** | Dashboard (Umsatz, Bestellungen, Trinkgeld, Ø-Bestellwert, offene Bestellungen), Produkte (CRUD, Preis, Aktiv/Inaktiv, Drag-&-Drop-Sortierung), Kategorien, Menüs (mit enthaltenen Produkten), Mitarbeiter (Rollen, Passwort-Reset, Deaktivieren), Bestellhistorie mit Detail-Ansicht, Tagesbilanz (Heute/Gestern/Woche/Monat/benutzerdefiniert, pro Mitarbeiter, Top-Produkte), Trinkgeld-Auszahlung mit Historie, Audit-Log |
| **Mitarbeiter** | „Mein Trinkgeld": aktueller Saldo, Trinkgeld-Historie, Auszahlungshistorie |
| **Sicherheit** | bcrypt-Passwort-Hashes, Session-Tokens (nur SHA-256-Hash in der DB), serverseitige Rollenprüfung (Middleware + jede Aktion), zod-Validierung, Geld als Ganzzahlen in **Cent** (keine Floats), historische Preise in OrderItems, keine Secrets im Frontend |
| **Audit** | Login/Logout, Bestellungen (erstellt/übernommen/bereit/abgeschlossen), Trinkgeld (verbucht/ausgezahlt), Produkt-/Menü-/Kategorie-Änderungen, Preisänderungen, Mitarbeiteraktionen – mit Benutzer, Zeitpunkt, Entität und Details |

## Tech Stack

- **Next.js 16** (App Router, Server Actions, Server Components)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM 7** (Driver Adapter `@prisma/adapter-pg`)
- **Server-Sent Events** für Echtzeit (In-Process-Event-Bus)
- **bcryptjs** (Passwort-Hashing), **zod** (Validierung)
- **Vitest** (Unit-Tests), **Playwright** (End-to-End-Tests), **GitHub Actions** (CI)

---

## Installation

### Voraussetzungen

- Node.js ≥ 20.19
- PostgreSQL 15+ (oder die eingebaute embedded PostgreSQL für lokale Entwicklung – siehe unten)

### Setup

```bash
git clone <repo-url>
cd burgershot-mirrorpark
npm install
```

### Umgebung

```bash
cp .env.example .env
```

| Variable | Bedeutung |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `TEST_DATABASE_URL` | nur für End-to-End-Tests |
| `AUTH_SESSION_TTL_HOURS` | Sitzungsdauer in Stunden (Standard: 12) |
| `APP_TIMEZONE` | Zeitzone für Tagesbilanz/Statistik (Standard: `Europe/Berlin`) |
| `NEXT_PUBLIC_APP_URL` | öffentliche App-URL (für Deployments) |

### Datenbank

**Option A – Docker (empfohlen):**

```bash
docker compose up -d db
```

**Option B – eingebaute embedded PostgreSQL** (kein Docker nötig; nutzt echte
PostgreSQL-Binaries aus dem npm-Paket):

```bash
npm run db:start
```

**Option C – eigenes PostgreSQL** – `DATABASE_URL` im `.env` entsprechend setzen.

Danach Schema anlegen und Seed ausführen:

```bash
npm run db:migrate      # prisma migrate dev
npm run db:seed         # Demo-Daten
```

> Hinweis: `postinstall` erzeugt den Prisma-Client automatisch; manuell via
> `npx prisma generate`.

### Entwicklung

```bash
npm run dev
```

Dann im Browser: <http://localhost:3000>

### Production Build

```bash
npm run build
npm run start
```

---

## Demo-Zugangsdaten

> ⚠️ Nur für Entwicklung/Demo – im Produktivbetrieb unbedingt ändern!

| Rolle | Benutzername | Passwort |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Mitarbeiter | `max` | `demo123` |
| Mitarbeiter | `john` | `demo123` |
| Mitarbeiter | `sarah` | `demo123` |
| Küche | `koch` | `kueche123` |

---

## Ablauf (End-to-End)

```
Login (admin/max/koch)
 → Kasse: Produkt antippen → BESTELLUNG ABSCHICKEN
 → Küche: ÜBERNEHMEN → ZUBEREITET
 → Kasse: „Bereit zur Ausgabe" → Betrag erfassen (Gegeben + optional Trinkgeld)
 → BEZAHLT · BESTELLUNG RAUS GEBEN
 → Trinkgeld dem Mitarbeiter gutgeschrieben
 → Admin: Dashboard / Tagesbilanz / Trinkgeld auszahlen (Saldo → $0.00)
```

## Tests

```bash
npm run test       # Unit-Tests (Vitest)
npm run test:e2e   # End-to-End-Tests (Playwright, legt Test-Datenbank an)
```

CI (GitHub Actions) prüft bei jedem Push: `lint` → `typecheck` → `build` sowie
End-to-End-Tests gegen eine Postgres-Service-Datenbank.

## Projektstruktur (Auszug)

```
actions/          # Server Actions (Bestellungen, Admin-CRUD, Auth)
app/              # Next.js App Router (pos, kitchen, me, admin/*, login, api/events)
components/       # UI-Komponenten (POS, Küche, Admin)
lib/              # prisma, session, money, validation, stats, realtime …
prisma/           # Schema, Migrationen, Seed
e2e/              # Playwright-Tests
scripts/          # db.mjs (embedded PostgreSQL), prepare-test-db.mjs
```

## Deployment

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) – das Projekt ist für Vercel, Railway,
Fly.io & Co. vorbereitet (inkl. Dockerfile / docker-compose).