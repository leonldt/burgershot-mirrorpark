import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      employee: { select: { firstName: true, lastName: true } },
      tipTransaction: { include: { employee: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!order) notFound();
  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: "Order", entityId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, action: true, details: true, actor: { select: { username: true } } },
  });

  const statusSteps = [
    { key: "PENDING", label: "Wartet", at: order.createdAt },
    { key: "PREPARING", label: "In Zubereitung", at: order.preparingAt },
    { key: "READY", label: "Bereit", at: order.readyAt },
    { key: "COMPLETED", label: "Abgeschlossen", at: order.completedAt },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bestellung {FORMATTED_ORDER_NUMBER(order.number)}</h1>
          <p className="text-sm text-ink-dim">
            {order.employee ? `${order.employee.firstName} ${order.employee.lastName}` : "–"} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Timeline</h2>
          <ol className="space-y-2.5">
            {statusSteps.map((s, i) => (
              <li key={s.key} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coal-700 text-[10px] font-black">
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-bold capitalize">{s.label}</div>
                  {s.at ? <div className="text-xs text-ink-dim">{formatDateTime(s.at)}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Artikel (Momentaufnahmen)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-4 py-2">Artikel</th>
                <th className="px-4 py-2 text-right">Stückpreis</th>
                <th className="px-4 py-2 text-right">Menge</th>
                <th className="px-4 py-2 text-right">Summe</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-coal-700/60 last:border-0">
                  <td className="px-4 py-2">{it.productName}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(it.unitPriceCents)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{formatMoney(it.unitPriceCents * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-between border-t border-coal-700 pt-3 text-base font-black tabular-nums">
            <span>Gesamtbetrag</span>
            <span>{formatMoney(order.totalCents)}</span>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Zahlung</h2>
          <dl className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <dt className="text-ink-dim">Gegeben</dt>
              <dd className="tabular-nums font-semibold">{order.givenCents !== null ? formatMoney(order.givenCents) : "–"}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-ink-dim">Rückgeld</dt>
              <dd className="tabular-nums font-semibold">
                {order.changeCents !== null ? formatMoney(order.changeCents) : "–"}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-ink-dim">Trinkgeld</dt>
              <dd className="tabular-nums font-semibold text-ember-400">
                {order.tipCents !== null ? formatMoney(order.tipCents) : "–"}
              </dd>
            </div>
          </dl>
          {order.tipTransaction && (
            <p className="mt-2 text-xs text-ink-dim">
              Trinkgeld verbucht zu {order.tipTransaction.employee.firstName} {" "}
              {order.tipTransaction.employee.lastName} ({formatDateTime(order.tipTransaction.createdAt)})
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Vorgänge</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-4 py-2">Zeitpunkt</th>
                <th className="px-4 py-2">Benutzer</th>
                <th className="px-4 py-2">Aktion</th>
                <th className="px-4 py-2 w-1/3">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((a) => (
                <tr key={a.id} className="border-b border-coal-700/60 align-top last:border-0">
                  <td className="px-4 py-2 text-ink-dim">{formatDateTime(a.createdAt)}</td>
                  <td className="px-4 py-2 text-ink-dim">{a.actor.username}</td>
                  <td className="px-4 py-2 font-semibold">{ACTION_LABELS[a.action] ?? a.action}</td>
                  <td className="px-4 py-2 text-xs text-ink-dim break-all">{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Anmeldung",
  LOGOUT: "Abmeldung",
  ORDER_CREATED: "Bestellung erstellt",
  ORDER_PREPARING: "Küche übernommen",
  ORDER_READY: "Bestellung bereit",
  ORDER_COMPLETED: "Bestellung abgeschlossen",
  TIP_BOOKED: "Trinkgeld verbucht",
  TIP_PAID_OUT: "Trinkgeld ausgezahlt",
  PRODUCT_CREATED: "Produkt erstellt",
  PRODUCT_UPDATED: "Produkt aktualisiert",
  PRODUCT_PRICE_CHANGED: "Preis geändert",
  PRODUCT_DELETED: "Produkt gelöscht",
  PRODUCT_ACTIVATED: "Produkt aktiviert",
  PRODUCT_DEACTIVATED: "Produkt deaktiviert",
  PRODUCTS_REORDERED: "Produkte sortiert",
};