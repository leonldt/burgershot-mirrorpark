import Link from "next/link";
import { Card } from "@/components/ui";
import { getBalanceReport } from "@/lib/stats";
import { formatMoney } from "@/lib/money";
import { periodRange } from "@/lib/date";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "today", label: "Heute" },
  { key: "yesterday", label: "Gestern" },
  { key: "week", label: "Diese Woche" },
  { key: "month", label: "Dieser Monat" },
  { key: "custom", label: "Benutzerdefiniert" },
];

export default async function BalancePage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "today";
  const report = await getBalanceReport(periodRange(period, sp.from, sp.to));

  const cards = [
    { label: "Umsatz", value: formatMoney(report.revenueCents), accent: true },
    { label: "Bestellungen", value: String(report.orderCount) },
    { label: "Ø Bestellwert", value: report.orderCount > 0 ? formatMoney(report.avgOrderCents) : "–" },
    { label: "Trinkgeld", value: formatMoney(report.tipCents) },
    { label: "Offene Bestellungen", value: String(report.openCount) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Tagesbilanz</h1>
        <p className="text-sm text-ink-dim">Auswertung für {PERIODS.find((p) => p.key === period)?.label.toLowerCase() ?? period}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/balance?period=${p.key}`}
            className={`touch cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition ${
              period === p.key ? "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20" : "bg-coal-800 text-ink-dim hover:bg-coal-700 hover:text-ink"
            }`}
          >
            {p.label}
          </Link>
        ))}
        {period === "custom" && (
          <form method="GET" className="flex items-end gap-2">
            <input type="hidden" name="period" value="custom" />
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-ink-dim">Von</span>
              <input name="from" type="date" defaultValue={sp.from ?? ""} required className="rounded-xl border border-coal-600 bg-coal-800 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-ink-dim">Bis</span>
              <input name="to" type="date" defaultValue={sp.to ?? ""} required className="rounded-xl border border-coal-600 bg-coal-800 px-3 py-2 text-sm" />
            </label>
            <button className="touch cursor-pointer rounded-xl bg-ember-500 px-4 py-2 text-sm font-bold text-coal-950 hover:bg-ember-400">Anzeigen</button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">{c.label}</div>
            <div className={`mt-1.5 text-2xl font-black tabular-nums ${c.accent ? "text-ember-400" : ""}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-coal-700 px-5 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Umsatz pro Mitarbeiter</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-5 py-2.5">Mitarbeiter</th>
                <th className="px-5 py-2.5 text-right">Bestellungen</th>
                <th className="px-5 py-2.5 text-right">Umsatz</th>
                <th className="px-5 py-2.5 text-right">Trinkgeld</th>
              </tr>
            </thead>
            <tbody>
              {report.perEmployee.map((e) => (
                <tr key={e.employeeId} className="border-b border-coal-700/60 last:border-0">
                  <td className="px-5 py-2.5 font-bold">{e.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{e.orders}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(e.revenueCents)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-ember-400">{formatMoney(e.tipCents)}</td>
                </tr>
              ))}
              {report.perEmployee.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-ink-dim">
                    Keine abgeschlossenen Bestellungen im Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="border-b border-coal-700 px-5 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Meistverkaufte Produkte</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          {report.topProducts.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="w-6 text-right text-xs font-bold text-ink-dim">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-coal-700">
                  <div
                    className="h-full rounded-full bg-ember-500"
                    style={{ width: `${report.topProducts[0].quantity > 0 ? (p.quantity / report.topProducts[0].quantity) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-black tabular-nums">{p.quantity}×</span>
            </div>
          ))}
          {report.topProducts.length === 0 && <p className="text-sm text-ink-dim">Keine Verkäufe im Zeitraum.</p>}
        </div>
      </Card>
    </div>
  );
}