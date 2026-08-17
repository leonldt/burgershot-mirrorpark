import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import TipsPayButton from "@/components/admin/TipsPayButton";

export const dynamic = "force-dynamic";

export default async function TipsPage() {
  const [tipsEarned, tipsPaid, payouts, users] = await Promise.all([
    prisma.tipTransaction.groupBy({ by: ["employeeId"], _sum: { amountCents: true } }),
    prisma.tipPayout.groupBy({ by: ["employeeId"], _sum: { amountCents: true } }),
    prisma.tipPayout.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        paidBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }),
  ]);

  const earnedMap = new Map(tipsEarned.map((t) => [t.employeeId, t._sum.amountCents ?? 0]));
  const paidMap = new Map(tipsPaid.map((p) => [p.employeeId, p._sum.amountCents ?? 0]));

  const employees = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    balanceCents: (earnedMap.get(u.id) ?? 0) - (paidMap.get(u.id) ?? 0),
    earnedCents: earnedMap.get(u.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Trinkgeld</h1>
        <p className="text-sm text-ink-dim">Konten der Mitarbeiter & Auszahlungshistorie</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {employees.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{e.name}</div>
                <div className="text-xs text-ink-dim">Aktuelles Trinkgeld</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black tabular-nums text-ember-400">{formatMoney(e.balanceCents)}</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-dim">Saldo</div>
              </div>
            </div>
            <div className="mt-3">
              <TipsPayButton employeeId={e.id} balanceCents={e.balanceCents} name={e.name} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-coal-700 px-5 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Auszahlungshistorie</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-5 py-2.5">Datum</th>
                <th className="px-5 py-2.5">Mitarbeiter</th>
                <th className="px-5 py-2.5 text-right">Betrag</th>
                <th className="px-5 py-2.5">Ausgezahlt durch</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-coal-700/60 last:border-0">
                  <td className="px-5 py-2.5 whitespace-nowrap text-ink-dim">{formatDateTime(p.createdAt)}</td>
                  <td className="px-5 py-2.5 font-bold">
                    {p.employee.firstName} {p.employee.lastName}
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums text-red-400">−{formatMoney(p.amountCents)}</td>
                  <td className="px-5 py-2.5 text-ink-dim">
                    {p.paidBy.firstName} {p.paidBy.lastName}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-ink-dim">
                    Noch keine Auszahlungen.
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