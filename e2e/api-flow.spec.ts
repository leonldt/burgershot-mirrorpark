import { expect, test, type APIRequest } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

/**
 * Browserlose End-to-End-Tests gegen den echten Server (SSR + Middleware + DB + SSE).
 * Läuft lokal ohne Browser-Abhängigkeiten und in CI. Die Testdatenbank wird direkt
 * via SQL vorbereitet – ohne Abhängigkeit von Demo-/Seed-Daten: nur der Admin
 * existiert (aus dem Seed), Produkte und Mitarbeiter legt der Test selbst an.
 */
const BASE = "http://localhost:3000";
const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/burgershot_test";

function db() {
  return new pg.Client({ connectionString: TEST_URL });
}

test.beforeEach(async () => {
  const client = db();
  await client.connect();
  await client.query(
    `TRUNCATE TABLE "OrderItem", "Order", "TipTransaction", "TipPayout", "AuditLog",
       "MenuItem", "Menu", "Product", "Category", "Session" CASCADE`
  );
  await client.query(`DELETE FROM "User" WHERE username <> 'admin'`);
  await client.query(
    `INSERT INTO "Category" (id, name, "sortOrder", active, "createdAt", "updatedAt")
     VALUES ('e2e-cat-burger', 'Burger', 0, true, now(), now())`
  );
  await client.query(
    `INSERT INTO "Product" (id, name, description, "priceCents", "sortOrder", active, "categoryId", "createdAt", "updatedAt")
     VALUES ('e2e-prod-burger', 'Classic Burger', NULL, 500, 0, true, 'e2e-cat-burger', now(), now())`
  );
  await client.query(
    `INSERT INTO "User" (id, username, "passwordHash", "firstName", "lastName", role, active, "createdAt", "updatedAt")
     VALUES ('e2e-user-max', 'max', 'x', 'Max', 'Mustermann', 'EMPLOYEE', true, now(), now())
     ON CONFLICT (username) DO NOTHING`
  );
  await client.end();
});

/** Legt eine echte Session in der DB an (wie beim Login) und liefert das Cookie-Token. */
async function loginAs(username: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const idHash = createHash("sha256").update(token).digest("hex");
  const client = db();
  await client.connect();
  await client.query(`DELETE FROM "Session" WHERE id = $1`, [idHash]);
  await client.query(
    `INSERT INTO "Session" (id, "userId", "createdAt", "expiresAt") SELECT $1, id, now(), now() + interval '4 hours' FROM "User" WHERE username = $2`,
    [idHash, username]
  );
  await client.end();
  return token;
}

async function sessionFor(username: string, token: string) {
  const idHash = createHash("sha256").update(token).digest("hex");
  const client = db();
  await client.connect();
  await client.query(`DELETE FROM "Session" WHERE id = $1`, [idHash]);
  await client.query(
    `INSERT INTO "Session" (id, "userId", "createdAt", "expiresAt") SELECT $1, id, now(), now() + interval '1 hour' FROM "User" WHERE username = $2`,
    [idHash, username]
  );
  await client.end();
}

function authedContext(request: APIRequest, token: string) {
  return request.newContext({
    storageState: {
      cookies: [
        {
          name: "bs_session",
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 3600,
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    },
  });
}

test("Ohne Session werden geschützte Bereiche zum Login umgeleitet", async ({ request }) => {
  const admin = await request.get("/admin", { maxRedirects: 0 });
  expect([301, 302, 307]).toContain(admin.status());
  const pos = await request.get("/pos", { maxRedirects: 0 });
  expect([301, 302, 307]).toContain(pos.status());
});

test("Login-Seite rendert", async ({ request }) => {
  const r = await request.get("/login");
  expect(r.ok()).toBeTruthy();
  expect(await r.text()).toContain("Kassensystem · Mitarbeiter-Login");
});

test("kompletter Lauf: Auth + alle Bereiche + Rollen + Echtzeit-SSE", async ({ playwright }) => {
  const token = await loginAs("admin");
  const adminCtx = await authedContext(playwright.request, token);

  const [root, kitchen, me, orders, balance, tips, audit] = await Promise.all([
    adminCtx.get("/"),
    adminCtx.get("/kitchen"),
    adminCtx.get("/me"),
    adminCtx.get("/admin/orders"),
    adminCtx.get("/admin/balance"),
    adminCtx.get("/admin/tips"),
    adminCtx.get("/admin/audit"),
  ]);

  // GET / leitet für ADMINS zum Dashboard weiter (Rolle)
  expect([307, 200]).toContain(root.status());
  const dashboardResp = root.status() === 307 ? await adminCtx.get("/admin") : root;
  const dashboard = await dashboardResp.text();
  expect(dashboard).toContain("Admin Dashboard");

  expect(await kitchen.text()).toContain("Küchenansicht");

  const meText = await me.text();
  expect(meText).toContain("Aktuelles Trinkgeld");
  expect(meText).toContain("Trinkgeld-Historie");

  const productsText = await (await adminCtx.get("/admin/products")).text();
  expect(productsText).toContain("Classic Burger");

  expect(await orders.text()).toContain("Bestellungen");

  const balanceText = await balance.text();
  expect(balanceText).toContain("Tagesbilanz");
  expect(balanceText).toContain("Umsatz pro Mitarbeiter");

  const tipsText = await tips.text();
  expect(tipsText).toContain("Auszahlungshistorie");
  expect(tipsText).toContain("Max Mustermann");

  expect(await audit.text()).toContain("Audit-Log");

  // ── POS als Mitarbeiter: Katalog & Preise aus der DB ───────────────
  await sessionFor("max", "emp-token-1");
  const empCtx = await authedContext(playwright.request, "emp-token-1");
  const pos = await empCtx.get("/pos");
  expect(pos.status()).toBe(200);
  const posText = await pos.text();
  expect(posText).toContain("Kassenterminal");
  expect(posText).toContain("$5"); // Classic Burger aus dem Test-Setup (ganzer Dollar)

  // ── Küche als Mitarbeiter; Mitarbeiter darf KEIN Admin-Panel ────────
  await sessionFor("max", "emp-token-2");
  const employeeCtx = await authedContext(playwright.request, "emp-token-2");
  const kitchenAsEmployee = await employeeCtx.get("/kitchen");
  expect(kitchenAsEmployee.status()).toBe(200);
  expect(await kitchenAsEmployee.text()).toContain("In Zubereitung");

  const forbidden = await employeeCtx.get("/admin", { maxRedirects: 0 });
  expect([301, 302, 307]).toContain(forbidden.status()); // Rollen-Umleitung (Mitarbeiter → /pos)

  // ── SSE (Realtime): erster Chunk muss "connected" liefern ──────────────────
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const es = await fetch(`${BASE}/api/events`, { headers: { Cookie: `bs_session=${token}` }, signal: ctrl.signal });
    expect(es.status).toBe(200);
    const reader = es.body!.getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    expect(chunk).toContain('"type":"connected"');
    await reader.cancel();
  } finally {
    clearTimeout(timer);
  }

  // Session-Cleanup
  for (const t of [token, "emp-token-1", "emp-token-2"]) {
    const client = db();
    await client.connect();
    await client.query(`DELETE FROM "Session" WHERE id = $1`, [createHash("sha256").update(t).digest("hex")]);
    await client.end();
  }
  await adminCtx.dispose();
  await empCtx.dispose();
  await employeeCtx.dispose();
});