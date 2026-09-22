import fs from "node:fs";

function edit(file, from, to, label) {
  let t = fs.readFileSync(file, "utf8");
  if (!t.includes(from)) {
    console.error(`NICHT GEFUNDEN [${label}] in ${file}`);
    process.exit(1);
  }
  fs.writeFileSync(file, t.split(from).join(to));
  console.log(`ok: ${label}`);
}

// ── Form-Wrapper fürs Admin-Panel ──
{
  const f = "actions/orders.ts";
  let t = fs.readFileSync(f, "utf8");
  if (!t.includes("export async function cancelOrderForm")) {
    t = t.trimEnd() + '\n/** Formular-Wrapper für die Admin-Listen (ActionForm übergibt die ID in FormData). */\nexport async function cancelOrderForm(formData: FormData): Promise<ActionResult> {\n  return cancelOrder(String(formData.get("id") ?? ""));\n}\n';
    fs.writeFileSync(f, t);
    console.log("ok: cancelOrderForm");
  }
}

// ── ui.tsx: Status-Badge für CANCELLED ──
edit(
  "components/ui.tsx",
  '  READY: { label: "Bereit zur Ausgabe", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },',
  '  READY: { label: "Bereit zur Ausgabe", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },\n  CANCELLED: { label: "Storniert", cls: "bg-red-500/10 text-red-400 border-red-500/30", dot: "bg-red-400" },',
  "ui: CANCELLED-Badge"
);

// ── PosClient ──
edit(
  "components/pos/PosClient.tsx",
  'import { submitOrder, completeOrderWithPayment } from "@/actions/orders";',
  'import { submitOrder, completeOrderWithPayment, cancelOrder } from "@/actions/orders";',
  "pos: Import"
);
edit(
  "components/pos/PosClient.tsx",
  'if (data.type === "order.ready" || data.type === "order.completed") refreshReady();',
  'if (data.type === "order.ready" || data.type === "order.completed" || data.type === "order.cancelled") refreshReady();',
  "pos: SSE"
);
edit(
  "components/pos/PosClient.tsx",
  '  const openCheckout = (order: ReadyOrderDto) => {',
  '  const cancelWithConfirm = async (order: ReadyOrderDto) => {\n    if (!window.confirm(`Bestellung ${order.number} wirklich stornieren?`)) return;\n    const res = await cancelOrder(order.id);\n    if (res.ok) {\n      setReadyOrders((prev) => prev.filter((o) => o.id !== order.id));\n      flashNote({ tone: "ok", text: `Bestellung ${order.number} storniert.` });\n    } else {\n      flashNote({ tone: "error", text: res.error });\n    }\n  };\n\n  const openCheckout = (order: ReadyOrderDto) => {',
  "pos: Storno-Handler"
);

const oldReadyMap = '{readyOrders.map((o) => (\n                <button\n                  key={o.id}\n                  onClick={() => openCheckout(o)}\n                  className="cursor-pointer rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/10"\n                >\n                  <div className="flex items-center justify-between">\n                    <span className="text-lg font-black text-emerald-300">{o.number}</span>\n                    <span className="text-xs text-ink-dim">{formatTime(new Date(o.createdAtIso))}</span>\n                  </div>\n                  <div className="mt-1 line-clamp-2 text-sm text-ink-dim">\n                    {o.items.map((i) => ` + "`${i.qty}× ${i.name}`" + `).join(" · ")}\n                  </div>\n                  <div className="mt-1.5 flex items-center justify-between">\n                    <span className="text-sm font-bold">{formatMoney(o.totalCents)}</span>\n                    <span className="rounded-lg bg-ember-500 px-2.5 py-1 text-xs font-bold text-coal-950">RAUS GEBEN</span>\n                  </div>\n                </button>\n              ))}';

const newReadyMap = '{readyOrders.map((o) => (\n                <div key={o.id} className="flex flex-col rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 transition hover:border-emerald-400 hover:bg-emerald-500/10">\n                  <button onClick={() => openCheckout(o)} className="w-full text-left">\n                    <div className="flex items-center justify-between">\n                      <span className="text-lg font-black text-emerald-300">{o.number}</span>\n                      <span className="text-xs text-ink-dim">{formatTime(new Date(o.createdAtIso))}</span>\n                    </div>\n                    <div className="mt-1 line-clamp-2 text-sm text-ink-dim">\n                      {o.items.map((i) => ` + "`${i.qty}× ${i.name}`" + `).join(" · ")}\n                    </div>\n                    <div className="mt-1.5 text-sm font-bold">{formatMoney(o.totalCents)}</div>\n                  </button>\n                  <div className="mt-2 flex gap-2">\n                    <button onClick={() => openCheckout(o)} className="touch flex-1 cursor-pointer rounded-lg bg-ember-500 px-2.5 py-2 text-xs font-black text-coal-950 transition hover:bg-ember-400">\n                      RAUS GEBEN\n                    </button>\n                    <button\n                      onClick={() => cancelWithConfirm(o)}\n                      className="touch cursor-pointer rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/25"\n                    >\n                      Storno\n                    </button>\n                  </div>\n                </div>\n              ))}';

edit("components/pos/PosClient.tsx", oldReadyMap, newReadyMap, "pos: Bereit-Karten");

// ── KitchenClient ──
edit(
  "components/kitchen/KitchenClient.tsx",
  'import { acceptOrder, markOrderReady } from "@/actions/orders";',
  'import { acceptOrder, markOrderReady, cancelOrder } from "@/actions/orders";',
  "kitchen: Import"
);
edit(
  "components/kitchen/KitchenClient.tsx",
  '["order.created", "order.preparing", "order.ready", "order.completed"].includes(data.type ?? "")',
  '["order.created", "order.preparing", "order.ready", "order.completed", "order.cancelled"].includes(data.type ?? "")',
  "kitchen: SSE"
);
edit(
  "components/kitchen/KitchenClient.tsx",
  '  const act = async (orderId: string, fn: (id: string) => Promise<{ ok: boolean }>, thenRefresh: boolean) => {',
  '  const cancelWithConfirm = async (o: KitchenOrderDto) => {\n    if (!window.confirm(`Bestellung ${o.number} wirklich stornieren?`)) return;\n    await cancelOrder(o.id);\n    refresh();\n  };\n\n  const act = async (orderId: string, fn: (id: string) => Promise<{ ok: boolean }>, thenRefresh: boolean) => {',
  "kitchen: Storno-Handler"
);

const kitchenFooterOld =
  '                  <button\n                    onClick={() => action(o.id)}\n                    disabled={busyId === o.id}\n                    className={`touch mt-3 w-full cursor-pointer rounded-xl px-4 py-3.5 text-base font-black transition disabled:cursor-wait disabled:opacity-60 ${\n                      actionReady\n                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"\n                        : "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400"\n                    }`}\n                  >\n                    {busyId === o.id ? "…" : actionLabel}\n                  </button>';

const kitchenFooterNew =
  '                  <div className="mt-3 flex gap-2">\n                    <button\n                      onClick={() => action(o.id)}\n                      disabled={busyId === o.id}\n                      className={`touch flex-1 cursor-pointer rounded-xl px-4 py-3.5 text-base font-black transition disabled:cursor-wait disabled:opacity-60 ${\n                        actionReady\n                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"\n                          : "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400"\n                      }`}\n                    >\n                      {busyId === o.id ? "…" : actionLabel}\n                    </button>\n                    <button\n                      onClick={() => cancelWithConfirm(o)}\n                      disabled={busyId === o.id}\n                      className="touch cursor-pointer rounded-xl bg-red-500/15 px-3.5 text-sm font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"\n                    >\n                      Storno\n                    </button>\n                  </div>';

edit("components/kitchen/KitchenClient.tsx", kitchenFooterOld, kitchenFooterNew, "kitchen: Karten-Footer");

// ── Admin Bestellliste ──
edit(
  "app/admin/orders/page.tsx",
  'import { Card, inputCls, StatusBadge } from "@/components/ui";',
  'import { Card, inputCls, StatusBadge } from "@/components/ui";\nimport ActionForm from "@/components/admin/ActionForm";\nimport { cancelOrderForm } from "@/actions/orders";',
  "orders: Imports"
);
edit(
  "app/admin/orders/page.tsx",
  '<option value="READY">Bereit</option>',
  '<option value="READY">Bereit</option>\n              <option value="CANCELLED">Storniert</option>',
  "orders: Filter"
);
edit(
  "app/admin/orders/page.tsx",
  '<th className="px-5 py-2.5 text-right">Trinkgeld</th>',
  '<th className="px-5 py-2.5 text-right">Trinkgeld</th>\n                <th className="px-5 py-2.5 text-right">Aktion</th>',
  "orders: Th"
);
edit(
  "app/admin/orders/page.tsx",
  '<td className="px-5 py-2.5 text-right tabular-nums text-ember-400">{o.tipCents ? formatMoney(o.tipCents) : "–"}</td>\n                </tr>',
  '<td className="px-5 py-2.5 text-right tabular-nums text-ember-400">{o.tipCents ? formatMoney(o.tipCents) : "–"}</td>\n                  <td className="px-5 py-2.5 text-right">\n                    {o.status !== "COMPLETED" && o.status !== "CANCELLED" ? (\n                      <ActionForm\n                        action={cancelOrderForm}\n                        fields={{ id: o.id }}\n                        buttonLabel="Storno"\n                        tone="danger"\n                        confirmText={`Bestellung ${FORMATTED_ORDER_NUMBER(o.number)} wirklich stornieren?`}\n                      />\n                    ) : (\n                      "–"\n                    )}\n                  </td>\n                </tr>',
  "orders: Aktion-Zelle"
);

// ── Admin Bestelldetail ──
edit(
  "app/admin/orders/[id]/page.tsx",
  'import { Card, StatusBadge } from "@/components/ui";',
  'import { Card, StatusBadge } from "@/components/ui";\nimport ActionForm from "@/components/admin/ActionForm";\nimport { cancelOrderForm } from "@/actions/orders";',
  "detail: Imports"
);
edit(
  "app/admin/orders/[id]/page.tsx",
  '        <StatusBadge status={order.status} />\n      </div>',
  '        <div className="flex items-center gap-2">\n          <StatusBadge status={order.status} />\n          {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (\n            <ActionForm\n              action={cancelOrderForm}\n              fields={{ id: order.id }}\n              buttonLabel="Storno"\n              tone="danger"\n              confirmText={`Bestellung ${FORMATTED_ORDER_NUMBER(order.number)} wirklich stornieren?`}\n            />\n          )}\n        </div>\n      </div>',
  "detail: Storno-Button"
);
edit(
  "app/admin/orders/[id]/page.tsx",
  '    { key: "READY", label: "Bereit", at: order.readyAt },\n    { key: "COMPLETED", label: "Abgeschlossen", at: order.completedAt },\n  ];',
  '    { key: "READY", label: "Bereit", at: order.readyAt },\n    ...(order.status === "CANCELLED"\n      ? [{ key: "CANCELLED", label: "Storniert", at: order.cancelledAt ?? null }]\n      : [{ key: "COMPLETED", label: "Abgeschlossen", at: order.completedAt }]),\n  ];',
  "detail: Timeline"
);

console.log("FERTIG");