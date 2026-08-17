"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, Roles } from "@/lib/roles";
import { emitOrderEvent } from "@/lib/realtime";
import { orderSubmitSchema, paymentSchema, idSchema } from "@/lib/validation";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";
import { formatMoney } from "@/lib/money";

export type ActionResult = { ok: false; error: string } | { ok: true };

type OrderResult = { ok: true; orderNumber: string } | { ok: false; error: string };

/**
 * Bestellung aus dem Warenkorb entgegennehmen.
 * – Preise & Verfügbarkeit werden NUR serverseitig geprüft (nie aus dem Client übernommen)
 * – cartToken verhindert doppelte Übermittlung derselben Bestellung (Unique-Constraint)
 */
export async function submitOrder(input: {
  cartToken: string;
  lines: { kind: "product" | "menu"; id: string; quantity: number }[];
}): Promise<OrderResult> {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const parsed = orderSubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Bestelldaten." };
  const { cartToken, lines } = parsed.data;

  const productIds = [...new Set(lines.filter((l) => l.kind === "product").map((l) => l.id))];
  const menuIds = [...new Set(lines.filter((l) => l.kind === "menu").map((l) => l.id))];
  const [products, menus] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true, name: true, priceCents: true } })
      : [],
    menuIds.length
      ? prisma.menu.findMany({ where: { id: { in: menuIds }, active: true }, select: { id: true, name: true, priceCents: true } })
      : [],
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const menuById = new Map(menus.map((m) => [m.id, m]));

  let totalCents = 0;
  const rows: { productId: string | null; menuId: string | null; productName: string; unitPriceCents: number; quantity: number }[] = [];
  for (const line of lines) {
    if (line.kind === "product") {
      const p = productById.get(line.id);
      if (!p) return { ok: false, error: "Ein Produkt ist nicht mehr verfügbar." };
      rows.push({ productId: p.id, menuId: null, productName: p.name, unitPriceCents: p.priceCents, quantity: line.quantity });
      totalCents += p.priceCents * line.quantity;
    } else {
      const m = menuById.get(line.id);
      if (!m) return { ok: false, error: "Ein Menü ist nicht mehr verfügbar." };
      rows.push({ productId: null, menuId: m.id, productName: `${m.name} (Menü)`, unitPriceCents: m.priceCents, quantity: line.quantity });
      totalCents += m.priceCents * line.quantity;
    }
  }
  if (rows.length === 0 || totalCents <= 0) return { ok: false, error: "Die Bestellung ist leer." };

  try {
    const order = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.order.findUnique({ where: { employeeId_cartToken: { employeeId: user.id, cartToken } } });
      if (duplicate) return { number: duplicate.number, duplicate: true };
      const created = await tx.order.create({
        data: { cartToken, employeeId: user.id, status: "PENDING", totalCents, items: { create: rows } },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ORDER_CREATED",
          entity: "Order",
          entityId: created.id,
          details: `${FORMATTED_ORDER_NUMBER(created.number)} · ${formatMoney(totalCents)}`,
        },
      });
      return { number: created.number, duplicate: false };
    });
    if (!order.duplicate) emitOrderEvent({ type: "order.created", at: Date.now() });
    return { ok: true, orderNumber: FORMATTED_ORDER_NUMBER(order.number) };
  } catch {
    return { ok: false, error: "Bestellung konnte nicht gespeichert werden." };
  }
}

/**
 * Bezahlung & Ausgabe einer READY-Bestellung. Läuft in EINER Transaktion:
 * Statuswechsel + Beträge + Trinkgeldverbuchung + Audit. Race-sicher durch
 * optimistisches updateMany (WHERE status=READY) und den Unique-Constraint
 * auf TipTransaction.orderId.
 */
export async function completeOrderWithPayment(input: {
  orderId: string;
  givenCents: number;
  tipCents: number;
}): Promise<{ ok: true; changeCents: number; tipCents: number; orderNumber: string } | { ok: false; error: string }> {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Zahlungsdaten." };
  const { orderId, givenCents, tipCents } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("order-not-found");
      if (order.status !== "READY") throw new Error("order-not-ready");
      if (givenCents < order.totalCents + tipCents) throw new Error("given-too-low");
      const changeCents = givenCents - order.totalCents - tipCents;

      const updated = await tx.order.updateMany({
        where: { id: orderId, status: "READY" },
        data: { status: "COMPLETED", givenCents, changeCents, tipCents, completedAt: new Date() },
      });
      if (updated.count !== 1) throw new Error("order-race");

      if (tipCents > 0) {
        await tx.tipTransaction.create({ data: { orderId, employeeId: user.id, amountCents: tipCents } });
        await tx.auditLog.create({
          data: { actorId: user.id, action: "TIP_BOOKED", entity: "Order", entityId: orderId, details: `${FORMATTED_ORDER_NUMBER(order.number)} · ${user.firstName} ${user.lastName} · +${formatMoney(tipCents)}` },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ORDER_COMPLETED",
          entity: "Order",
          entityId: orderId,
          details: `${FORMATTED_ORDER_NUMBER(order.number)} · gegeben ${formatMoney(givenCents)} · Rückgeld ${formatMoney(changeCents)} · Trinkgeld ${formatMoney(tipCents)}`,
        },
      });
      return { changeCents, tipCents, number: order.number };
    });

    emitOrderEvent({ type: "order.completed", at: Date.now() });
    return { ok: true, changeCents: result.changeCents, tipCents: result.tipCents, orderNumber: FORMATTED_ORDER_NUMBER(result.number) };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const errors: Record<string, string> = {
      "order-not-found": "Bestellung nicht gefunden.",
      "order-not-ready": "Diese Bestellung ist noch nicht bereit zur Ausgabe.",
      "given-too-low": "Der gegebene Betrag ist zu niedrig.",
      "order-race": "Diese Bestellung wurde bereits abgeschlossen.",
    };
    return { ok: false, error: errors[code] ?? "Abschluss fehlgeschlagen." };
  }
}

/** Küche: Bestellung übernehmen (PENDING → PREPARING). */
export async function acceptOrder(orderId: string): Promise<ActionResult> {
  const user = await requireRole([Roles.KITCHEN, Roles.ADMIN]);
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Ungültige Bestell-ID." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: parsed.data } });
      if (!order) throw new Error("order-not-found");
      const updated = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "PREPARING", preparingAt: new Date() } });
      if (updated.count !== 1) throw new Error("order-race");
      await tx.auditLog.create({ data: { actorId: user.id, action: "ORDER_PREPARING", entity: "Order", entityId: orderId, details: FORMATTED_ORDER_NUMBER(order.number) } });
    });
    emitOrderEvent({ type: "order.preparing", at: Date.now() });
    return { ok: true };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "order-not-found") return { ok: false, error: "Bestellung nicht gefunden." };
    return { ok: false, error: "Bestellung konnte nicht übernommen werden." };
  }
}

/** Küche: Bestellung fertig (PREPARING → READY). */
export async function markOrderReady(orderId: string): Promise<ActionResult> {
  const user = await requireRole([Roles.KITCHEN, Roles.ADMIN]);
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Ungültige Bestell-ID." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("order-not-found");
      const updated = await tx.order.updateMany({ where: { id: orderId, status: "PREPARING" }, data: { status: "READY", readyAt: new Date() } });
      if (updated.count !== 1) throw new Error("order-race");
      await tx.auditLog.create({ data: { actorId: user.id, action: "ORDER_READY", entity: "Order", entityId: orderId, details: FORMATTED_ORDER_NUMBER(order.number) } });
    });
    emitOrderEvent({ type: "order.ready", at: Date.now() });
    return { ok: true };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "order-not-found") return { ok: false, error: "Bestellung nicht gefunden." };
    return { ok: false, error: "Bestellung konnte nicht als fertig markiert werden." };
  }
}