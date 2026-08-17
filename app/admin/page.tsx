import Link from "next/link";
import { getDashboardStats } from "@/lib/stats";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";
import { Card, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Umsatz heute", value: formatMoney(stats.revenueCents), accent: true },
    { label: "Bestellungen heute", value: String(stats.orderCount) },
    { label: "Trinkgeld heute", value: formatMoney(stats.tipCents) },
    { label: "Ø Bestellwert", value: formatMoney(stats.avgOrderCents) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-ink-dim">Live-Übersicht aus der Datenbank</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">{c.label}</div>
            <div className={`mt-1.5 text-2xl font-black tabular-nums ${c.accent ? "text-ember-400" : ""}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Offene Bestellungen</div>
          <div className="mt-1 text-3xl font-black">{stats.openCounts.PENDING + stats.openCounts.PREPARING + stats.openCounts.READY}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">In Zubereitung</div>
          <div className="mt-1 text-3xl font-black">{stats.openCounts.PREPARING}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Bereit zur Ausgabe</div>
          <div className="mt-1 text-3xl font-black">{stats.openCounts.READY}</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-coal-700 px-5 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Letzte Bestellungen</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-ember-400 hover:text-ember-300">
            Alle Bestellungen →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-5 py-2.5">Nr.</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Mitarbeiter</th>
                <th className="px-5 py-2.5">Zeit</th>
                <th className="px-5 py-2.5 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-coal-700/60 last:border-0 hover:bg-coal-800/50">
                  <td className="px-5 py-2.5 font-bold">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-ember-400">
                      {FORMATTED_ORDER_NUMBER(o.number)}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-2.5 text-ink-dim">{o.employeeName}</td>
                  <td className="px-5 py-2.5 text-ink-dim">{formatDateTime(o.createdAt)}</td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">{formatMoney(o.totalCents)}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-ink-dim">
                    Noch keine Bestellungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}