import fs from "node:fs";

let t = fs.readFileSync("actions/orders.ts", "utf8");

if (t.includes("export async function cancelOrder(")) {
  console.error("cancelOrder existiert bereits");
  process.exit(1);
}

const actionCode = `
/** Bestellung stornieren (PENDING/PREPARING/READY). Abgeschlossene Bestellungen
 *  sind vom Storno ausgenommen (Umsatz bereits verbucht). Race-sicher über den
 *  Status-Guard im updateMany. */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Ungültige Bestell-ID." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: parsed.data } });
      if (!order) throw new Error("order-not-found");
      if (order.status === "COMPLETED") throw new Error("order-completed");
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: { in: ["PENDING", "PREPARING", "READY"] } },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      if (updated.count !== 1) throw new Error("order-race");
      await tx.auditLog.create({
        data: { actorId: user.id, action: "ORDER_CANCELLED", entity: "Order", entityId: orderId, details: FORMATTED_ORDER_NUMBER(order.number) },
      });
    });
    emitOrderEvent({ type: "order.cancelled", at: Date.now() });
    return { ok: true };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "order-not-found") return { ok: false, error: "Bestellung nicht gefunden." };
    if (code === "order-completed") return { ok: false, error: "Abgeschlossene Bestellungen können nicht storniert werden." };
    return { ok: false, error: "Bestellung konnte nicht storniert werden." };
  }
}
`;

fs.writeFileSync("actions/orders.ts", t.trimEnd() + "\n" + actionCode);
console.log("ok: cancelOrder");