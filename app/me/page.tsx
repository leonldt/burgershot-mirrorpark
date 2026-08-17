import Header from "@/components/Header";
import { requireRole, Roles } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { FORMATTED_ORDER_NUMBER } from "@/lib/constants";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyTipsPage() {
  const user = await requireRole([Roles.EMPLOYEE, Roles.ADMIN]);
  const [earned, paidOut, tipHistory, payoutHistory] = await Promise.all([
    prisma.tipTransaction.aggregate({ where: { employeeId: user.id }, _sum: { amountCents: true } }),
    prisma.tipPayout.aggregate({ where: { employeeId: user.id }, _sum: { amountCents: true } }),
    prisma.tipTransaction.findMany({
      where: { employeeId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amountCents: true, createdAt: true, order: { select: { number: true } } },
    }),
    prisma.tipPayout.findMany({
      where: { employeeId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amountCents: true, createdAt: true },
    }),
  ]);

  const balance = (earned._sum.amountCents ?? 0) - (paidOut._sum.amountCents ?? 0);
  const totalEarned = earned._sum.amountCents ?? 0;
  const totalPaidOut = paidOut._sum.amountCents ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        user={user}
        area="Mitarbeiterbereich"
        tabs={[
          { href: "/pos", label: "Kasse" },
          { href: "/me", label: "Mein Trinkgeld", active: true },
        ]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Aktuelles Trinkgeld</div>
            <div className="mt-1 text-3xl font-black tabular-nums text-ember-400">{formatMoney(balance)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Gesamt verdient</div>
            <div className="mt-1 text-3xl font-black tabular-nums">{formatMoney(totalEarned)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Bereits ausgezahlt</div>
            <div className="mt-1 text-3xl font-black tabular-nums text-ink-dim">{formatMoney(totalPaidOut)}</div>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink">Trinkgeld-Historie</h2>
          {tipHistory.length === 0 ? (
            <p className="text-sm text-ink-dim">Noch kein Trinkgeld verbucht.</p>
          ) : (
            <ul className="divide-y divide-coal-700">
              {tipHistory.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-bold">{FORMATTED_ORDER_NUMBER(t.order.number)}</div>
                    <div className="text-xs text-ink-dim">{formatDateTime(t.createdAt)}</div>
                  </div>
                  <span className="text-base font-black text-emerald-400">+{formatMoney(t.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="mt-6 p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink">Auszahlungen</h2>
          {payoutHistory.length === 0 ? (
            <p className="text-sm text-ink-dim">Noch keine Auszahlung.</p>
          ) : (
            <ul className="divide-y divide-coal-700">
              {payoutHistory.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-ink-dim">{formatDateTime(p.createdAt)}</span>
                  <span className="text-base font-black text-red-400">−{formatMoney(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}