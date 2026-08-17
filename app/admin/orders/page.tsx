import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, inputCls, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; employeeId?: string; from?: string; to?: string; q?: string }> }) {
  const sp = await searchParams;
  const employees = await prisma.user.findMany({ where: { OR: [{ role: "EMPLOYEE" }, { role: "ADMIN" }] }, orderBy: { firstName: "asc" } });

  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.employeeId) where.employeeId = sp.employeeId;
  if (sp.from || sp.to) {
    where.createdAt = { ...(sp.from ? { gte: new Date(`${sp.from}T00:00:00.000Z`) } : {}), ...(sp.to ? { lt: new Date(`${sp.to}T23:59:59.999Z`) } : {}) };
  }
  const qNum = Number((sp.q ?? "").replace(/\D/g, ""));
  if (qNum > 0) where.number = qNum;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      number: true,
      status: true,
      totalCents: true,
      tipCents: true,
      createdAt: true,
      employee: { select: { firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
  });

  const totalRevenue = orders.reduce((s, o) => s + (o.status === "COMPLETED" ? o.totalCents : 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bestellungen</h1>
          <p className="text-sm text-ink-dim">
            {orders.length} Treffer · Summe (abgeschlossen, Treffer): <span className="font-bold text-ember-400">{formatMoney(totalRevenue)}</span>
          </p>
        </div>
      </div>

      <Card className="p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="GET">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-dim">Nummer</span>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="#1042" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-dim">Status</span>
            <select name="status" defaultValue={sp.status ?? ""} className={inputCls}>
              <option value="">Alle</option>
              <option value="PENDING">Wartet</option>
              <option value="PREPARING">In Zubereitung</option>
              <option value="READY">Bereit</option>
              <option value="COMPLETED">Abgeschlossen</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-dim">Mitarbeiter</span>
            <select name="employeeId" defaultValue={sp.employeeId ?? ""} className={inputCls}>
              <option value="">Alle</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-dim">Von</span>
            <input name="from" type="date" defaultValue={sp.from ?? ""} className={inputCls} />
          </label>
          <div className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-[11px] font-medium text-ink-dim">Bis</span>
              <input name="to" type="date" defaultValue={sp.to ?? ""} className={inputCls} />
            </label>
            <button className="touch cursor-pointer rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-bold text-coal-950 hover:bg-ember-400">Filtern</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-5 py-2.5">Nr.</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Mitarbeiter</th>
                <th className="px-5 py-2.5">Zeit</th>
                <th className="px-5 py-2.5">Artikel</th>
                <th className="px-5 py-2.5 text-right">Summe</th>
                <th className="px-5 py-2.5 text-right">Trinkgeld</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-coal-700/60 last:border-0 hover:bg-coal-800/50">
                  <td className="px-5 py-2.5 font-bold">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-ember-400">
                      {FORMATTED_ORDER_NUMBER(o.number)}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-2.5 text-ink-dim">{o.employee ? `${o.employee.firstName} ${o.employee.lastName}` : "–"}</td>
                  <td className="px-5 py-2.5 text-ink-dim">{formatDateTime(o.createdAt)}</td>
                  <td className="px-5 py-2.5 text-ink-dim">{o._count.items} Positionen</td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">{formatMoney(o.totalCents)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-ember-400">{o.tipCents ? formatMoney(o.tipCents) : "–"}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-dim">
                    Keine Bestellungen gefunden.
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