import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

type AuditSearch = { action?: string };
export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditSearch> }) {
  const sp = await searchParams;
  const where = sp.action ? { action: sp.action } : {};
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      createdAt: true,
      actor: { select: { username: true } },
      action: true,
      entity: true,
      entityId: true,
      details: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Audit-Log</h1>
        <p className="text-sm text-ink-dim">Sicherheitsrelevante Aktionen</p>
      </div>

      <Card className="p-4">
        <form className="flex gap-3" method="GET">
          <select name="action" defaultValue={sp.action ?? ""} className="rounded-xl border border-coal-600 bg-coal-800 px-3 py-2 text-sm">
            <option value="">Alle Aktionen</option>
            {Object.entries(ACTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="touch cursor-pointer rounded-xl bg-ember-500 px-4 py-2 text-sm font-bold text-coal-950 hover:bg-ember-400">
            Filtern
          </button>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                <th className="px-5 py-2.5">Zeitpunkt</th>
                <th className="px-5 py-2.5">Benutzer</th>
                <th className="px-5 py-2.5">Aktion</th>
                <th className="px-5 py-2.5">Entität</th>
                <th className="px-5 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-coal-700/60 align-top last:border-0">
                  <td className="px-5 py-2.5 whitespace-nowrap text-ink-dim">{formatDateTime(l.createdAt)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">{l.actor.username}</td>
                  <td className="px-5 py-2.5 font-semibold">{ACTIONS[l.action] ?? l.action}</td>
                  <td className="px-5 py-2.5 text-ink-dim">
                    {l.entity}
                    {l.entityId && <span className="font-mono text-xs">· {l.entityId}</span>}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-ink-dim break-all">{l.details ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const ACTIONS: Record<string, string> = {
  LOGIN: "Anmeldung",
  LOGOUT: "Abmeldung",
  ORDER_CREATED: "Bestellung erstellt",
  ORDER_PREPARING: "Küche übernimmt",
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
  CATEGORY_CREATED: "Kategorie erstellt",
  CATEGORY_UPDATED: "Kategorie aktualisiert",
  CATEGORY_DELETED: "Kategorie gelöscht",
  CATEGORY_ACTIVATED: "Kategorie aktiviert",
  CATEGORY_DEACTIVATED: "Kategorie deaktiviert",
  CATEGORIES_REORDERED: "Kategorien sortiert",
  MENU_CREATED: "Menü erstellt",
  MENU_UPDATED: "Menü aktualisiert",
  MENU_DELETED: "Menü gelöscht",
  MENU_ACTIVATED: "Menü aktiviert",
  MENU_DEACTIVATED: "Menü deaktiviert",
  MENUS_REORDERED: "Menüs sortiert",
  EMPLOYEE_CREATED: "Mitarbeiter erstellt",
  EMPLOYEE_UPDATED: "Mitarbeiter aktualisiert",
  PASSWORD_RESET: "Passwort zurückgesetzt",
  EMPLOYEE_ACTIVATED: "Mitarbeiter aktiviert",
  EMPLOYEE_DEACTIVATED: "Mitarbeiter deaktiviert",
};