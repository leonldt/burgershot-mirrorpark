import { Card, inputCls, StatusBadge, ROLE_LABEL } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { createEmployee, updateEmployee, toggleEmployee, resetPassword } from "@/actions/admin/employees";
import ActionForm from "@/components/admin/ActionForm";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [users, tipsEarned, tipsPaid] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { orders: true, tipTransactions: true } } },
    }),
    prisma.tipTransaction.groupBy({ by: ["employeeId"], _sum: { amountCents: true } }),
    prisma.tipPayout.groupBy({ by: ["employeeId"], _sum: { amountCents: true } }),
  ]);
  const earnedMap = new Map(tipsEarned.map((t) => [t.employeeId, t._sum.amountCents ?? 0]));
  const paidMap = new Map(tipsPaid.map((p) => [p.employeeId, p._sum.amountCents ?? 0]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mitarbeiter</h1>
        <p className="text-sm text-ink-dim">Zugänge, Rollen und Konten verwalten</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest">Neuer Mitarbeiter</h2>
        <ActionForm action={createEmployee} fields={{}} buttonLabel="Mitarbeiter anlegen" tone="primary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Vorname *</span>
            <input name="firstName" required className={inputCls} placeholder="Max" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Nachname *</span>
            <input name="lastName" required className={inputCls} placeholder="Mustermann" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Benutzername *</span>
            <input name="username" required className={inputCls} placeholder="max" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Rolle *</span>
            <select name="role" defaultValue="EMPLOYEE" className={inputCls}>
              {(["EMPLOYEE", "KITCHEN", "ADMIN"] as const).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Passwort * (min. 6)</span>
            <input name="password" type="password" required minLength={6} className={inputCls} placeholder="••••••" />
          </label>
        </ActionForm>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {users.map((u) => {
          const balance = (earnedMap.get(u.id) ?? 0) - (paidMap.get(u.id) ?? 0);
          return (
            <Card key={u.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold">
                      {u.firstName} {u.lastName}
                    </span>
                    <StatusBadge status={u.active ? "READY" : "COMPLETED"} />
                  </div>
                  <div className="text-sm text-ink-dim">
                    @{u.username} · {ROLE_LABEL[u.role]}
                  </div>
                  <div className="mt-1 text-xs text-ink-dim/70">
                    {u._count.orders} Bestellungen · {u._count.tipTransactions} Trinkgeldbuchungen · seit {formatDateTime(u.createdAt)}
                  </div>
                </div>
                <div className="rounded-xl bg-coal-800 px-3.5 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">Trinkgeld aktuell</div>
                  <div className="text-lg font-black tabular-nums text-ember-400">{formatMoney(balance)}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={toggleEmployee} fields={{ id: u.id }} buttonLabel={u.active ? "Deaktivieren" : "Aktivieren"} tone="dark" />
                <details>
                  <summary className="cursor-pointer rounded-lg border border-coal-600 px-3 py-1.5 text-xs font-bold text-ink-dim transition hover:bg-coal-800 hover:text-ink">
                    Bearbeiten
                  </summary>
                  <div className="mt-2 space-y-3 rounded-xl border border-coal-700 bg-coal-800 p-3">
                    <ActionForm action={updateEmployee} fields={{ id: u.id }} buttonLabel="Speichern" tone="primary" className="grid gap-2.5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-ink-dim">Vorname</span>
                        <input name="firstName" defaultValue={u.firstName} required className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-ink-dim">Nachname</span>
                        <input name="lastName" defaultValue={u.lastName} required className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-ink-dim">Benutzername</span>
                        <input name="username" defaultValue={u.username} required className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-ink-dim">Rolle</span>
                        <select name="role" defaultValue={u.role} className={inputCls}>
                          {(["EMPLOYEE", "KITCHEN", "ADMIN"] as const).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </ActionForm>
                    <div className="border-t border-coal-700 pt-2">
                      <div className="mb-1.5 text-[11px] font-medium text-ink-dim">Passwort zurücksetzen</div>
                      <ActionForm action={resetPassword} fields={{ id: u.id }} buttonLabel="Passwort setzen" tone="dark" className="flex items-end gap-2">
                        <input name="password" type="password" required minLength={6} className={inputCls} placeholder="Neues Passwort" />
                      </ActionForm>
                    </div>
                  </div>
                </details>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}