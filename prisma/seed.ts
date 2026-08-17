import { PrismaClient } from "../lib/generated/prisma/client";
import { Role, OrderStatus } from "../lib/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/** Deterministischer PRNG (LCG) – reproduzierbare Demo-Daten. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = ["Burger", "Menüs", "Beilagen", "Getränke", "Desserts"];

const PRODUCTS = [
  { name: "Classic Burger", description: "Rindfleisch-Patty, Salat, Tomate, Haus-Sauce", priceCents: 490, category: "Burger" },
  { name: "Cheeseburger", description: "Classic Burger mit geschmolzenem Cheddar", priceCents: 590, category: "Burger" },
  { name: "Double Cheeseburger", description: "Doppeltes Patty, doppelter Cheddar", priceCents: 790, category: "Burger" },
  { name: "Chicken Burger", description: "Knuspriges Hähnchenfilet, Burger-Sauce", priceCents: 650, category: "Burger" },
  { name: "Bacon Burger", description: "Classic Burger mit knusprigem Bacon", priceCents: 850, category: "Burger" },
  { name: "Pommes", description: "Portion goldgelber Pommes mit Salz", priceCents: 350, category: "Beilagen" },
  { name: "Chicken Nuggets (6)", description: "6 Stück, mit Dip-Sauce", priceCents: 450, category: "Beilagen" },
  { name: "Onion Rings (6)", description: "6 knusprig panierte Zwiebelringe", priceCents: 400, category: "Beilagen" },
  { name: "Cola 0,4l", description: "Eisgekühlt aus der Zapfanlage", priceCents: 290, category: "Getränke" },
  { name: "Wasser 0,5l", description: "Still oder Sprudel", priceCents: 220, category: "Getränke" },
  { name: "Milkshake Vanille", description: "Cremiger Milkshake mit Sahne", priceCents: 490, category: "Getränke" },
  { name: "Apple Pie", description: "Warm serviert, mit Zimt-Zucker", priceCents: 380, category: "Desserts" },
  { name: "Eisbecher", description: "Drei Kugeln, Sahne, Schoko-Sauce", priceCents: 550, category: "Desserts" },
];

const MENUS = [
  { name: "Cheeseburger Menü", description: "1× Cheeseburger, 1× Pommes, 1× Cola", priceCents: 890, category: "Menüs", items: [{ p: "Cheeseburger", q: 1 }, { p: "Pommes", q: 1 }, { p: "Cola 0,4l", q: 1 }] },
  { name: "Classic Menü", description: "1× Classic Burger, 1× Pommes, 1× Cola", priceCents: 850, category: "Menüs", items: [{ p: "Classic Burger", q: 1 }, { p: "Pommes", q: 1 }, { p: "Cola 0,4l", q: 1 }] },
  { name: "Chicken Menü", description: "1× Chicken Burger, 1× Pommes, 1× Cola", priceCents: 990, category: "Menüs", items: [{ p: "Chicken Burger", q: 1 }, { p: "Pommes", q: 1 }, { p: "Cola 0,4l", q: 1 }] },
  { name: "Double Menü", description: "1× Double Cheeseburger, 1× Pommes, 1× Milkshake", priceCents: 1190, category: "Menüs", items: [{ p: "Double Cheeseburger", q: 1 }, { p: "Pommes", q: 1 }, { p: "Milkshake Vanille", q: 1 }] },
];

async function main() {
  console.log("🌱 Seed: Burgershot Mirrorpark POS");

  // ── Benutzer ────────────────────────────────────────────────────────────────
  const users = [
    { username: "admin", firstName: "Admin", lastName: "Burgershot", role: Role.ADMIN, plain: "admin123" },
    { username: "max", firstName: "Max", lastName: "Mustermann", role: Role.EMPLOYEE, plain: "demo123" },
    { username: "john", firstName: "John", lastName: "Doe", role: Role.EMPLOYEE, plain: "demo123" },
    { username: "sarah", firstName: "Sarah", lastName: "Meyer", role: Role.EMPLOYEE, plain: "demo123" },
    { username: "koch", firstName: "Küchen", lastName: "Team", role: Role.KITCHEN, plain: "kueche123" },
  ];
  const userIdByName: Record<string, string> = {};
  for (const u of users) {
    const passwordHash = await hash(u.plain, 12);
    const saved = await prisma.user.upsert({
      where: { username: u.username },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role, active: true, passwordHash },
      create: { username: u.username, firstName: u.firstName, lastName: u.lastName, role: u.role, active: true, passwordHash },
    });
    userIdByName[u.username] = saved.id;
    console.log(`  User ${u.username.padEnd(6)} (${u.role}) – Passwort: ${u.plain} (Demo)`);
  }

  // ── Kategorien ──────────────────────────────────────────────────────────────
  const categoryIdByName: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = await prisma.category.upsert({
      where: { name: CATEGORIES[i] },
      update: { sortOrder: i, active: true },
      create: { name: CATEGORIES[i], sortOrder: i, active: true },
    });
    categoryIdByName[c.name] = c.id;
  }

  // ── Produkte ────────────────────────────────────────────────────────────────
  const productIdByName: Record<string, string> = {};
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const existing = await prisma.product.findFirst({ where: { name: p.name, categoryId: categoryIdByName[p.category] } });
    const prod = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: { description: p.description, priceCents: p.priceCents, sortOrder: i, active: true } })
      : await prisma.product.create({ data: { name: p.name, description: p.description, priceCents: p.priceCents, categoryId: categoryIdByName[p.category], sortOrder: i, active: true } });
    productIdByName[p.name] = prod.id;
  }

  // ── Menüs ───────────────────────────────────────────────────────────────────
  for (let i = 0; i < MENUS.length; i++) {
    const m = MENUS[i];
    const existing = await prisma.menu.findFirst({ where: { name: m.name, categoryId: categoryIdByName[m.category] } });
    const menu = existing
      ? await prisma.menu.update({ where: { id: existing.id }, data: { description: m.description, priceCents: m.priceCents, sortOrder: i, active: true } })
      : await prisma.menu.create({ data: { name: m.name, description: m.description, priceCents: m.priceCents, categoryId: categoryIdByName[m.category], sortOrder: i, active: true } });
    for (const item of m.items) {
      const productId = productIdByName[item.p];
      const key = { menuId_productId: { menuId: menu.id, productId } };
      const existingItem = await prisma.menuItem.findUnique({ where: key });
      if (existingItem) await prisma.menuItem.update({ where: { id: existingItem.id }, data: { quantity: item.q } });
      else await prisma.menuItem.create({ data: { menuId: menu.id, productId, quantity: item.q } });
    }
    console.log(`  Menü ${m.name} – ${(m.priceCents / 100).toFixed(2)} $`);
  }

  // ── Demo-Bestellhistorie (nur wenn noch keine Bestellungen existieren) ──────
  const orderCount = await prisma.order.count();
  if (orderCount > 0 && process.env.SEED_RESET !== "1") {
    console.log("Bestellungen vorhanden – Historie wird nicht überschrieben.");
    return;
  }
  if (process.env.SEED_RESET === "1") {
    await prisma.orderItem.deleteMany();
    await prisma.tipPayout.deleteMany();
    await prisma.tipTransaction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.auditLog.deleteMany();
    console.log("Bestell-/Trinkgelddaten zurückgesetzt (SEED_RESET).");
  }

  const rand = mulberry32(42);
  const employees = [userIdByName.max, userIdByName.john, userIdByName.sarah];
  const products = await prisma.product.findMany();
  const menus = await prisma.menu.findMany();
  const now = new Date();
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  let dayOffset = 3;
  while (dayOffset >= 1) {
    const ordersToday = 25 + Math.floor(rand() * 15);
    for (let k = 0; k < ordersToday; k++) {
      const employeeId = pick(employees);
      const at = new Date(now.getTime() - dayOffset * 86_400_000);
      at.setHours(10 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);

      type Line = { productId?: string; menuId?: string; name: string; unitPriceCents: number; quantity: number };
      const lines: Line[] = [];
      let totalCents = 0;
      const lineCount = 1 + Math.floor(rand() * 3);
      for (let li = 0; li < lineCount; li++) {
        if (rand() > 0.45 && menus.length) {
          const menu = pick(menus);
          const q = 1 + Math.floor(rand() * 2);
          lines.push({ menuId: menu.id, name: menu.name, unitPriceCents: menu.priceCents, quantity: q });
          totalCents += menu.priceCents * q;
        } else {
          const product = pick(products);
          const q = 1 + Math.floor(rand() * 3);
          lines.push({ productId: product.id, name: product.name, unitPriceCents: product.priceCents, quantity: q });
          totalCents += product.priceCents * q;
        }
      }

      const status = OrderStatus.COMPLETED;
      const tipCents = rand() > 0.55 ? Math.round(rand() * 500) + 100 : 0;
      const givenCents = totalCents + tipCents;
      const changeCents = 0;
      const complete = true;

      const order = await prisma.order.create({
        data: {
          status,
          employeeId,
          totalCents,
          givenCents,
          changeCents,
          tipCents,
          createdAt: at,
          preparingAt: complete && rand() > 0.1 ? new Date(at.getTime() + 2 * 60_000) : null,
          readyAt: complete && rand() > 0.1 ? new Date(at.getTime() + 4 * 60_000) : null,
          completedAt: complete ? new Date(at.getTime() + 6 * 60_000) : null,
          items: { create: lines.map((l) => ({ productId: l.productId ?? null, menuId: l.menuId ?? null, productName: l.name, unitPriceCents: l.unitPriceCents, quantity: l.quantity })) },
        },
      });

      if (tipCents > 0 && status === OrderStatus.COMPLETED) {
        await prisma.tipTransaction.create({ data: { orderId: order.id, employeeId, amountCents: tipCents, createdAt: at } });
      }
    }
    dayOffset--;
  }
  console.log("Demo-Bestellhistorie für 3 Tage erzeugt (ca. 100 Bestellungen).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });