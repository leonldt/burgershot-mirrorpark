import Header from "@/components/Header";
import { requireRole, Roles } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { Card } from "@/components/ui";
import ActionForm from "@/components/admin/ActionForm";
import { confirmDelivered } from "@/actions/supplier";

export const dynamic = "force-dynamic";

export default async function SupplierPage() {
  const user = await requireRole([Roles.SUPPLIER, Roles.ADMIN]);
  const lists = await prisma.purchaseList.findMany({
    where: { supplierId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { items: true },
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header user={user} area="Lieferantenbereich" />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Einkaufslisten</h1>
        <p className="mb-5 text-sm text-ink-dim">
          Übermittelte Bestellungen aus dem Restaurant – inklusive Einkaufs- und Verkaufswerten.
        </p>

        {lists.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-dim">Noch keine Einkaufslisten übermittelt.</Card>
        ) : (
          <div className="space-y-4">
            {lists.map((l) => {
              const gesamtMenge = l.items.reduce((s, i) => s + i.menge, 0);
              const ek = l.items.reduce((s, i) => s + i.menge * i.einkaufspreisCents, 0);
              const vk = l.items.reduce((s, i) => s + i.menge * i.verkaufspreisCents, 0);
              const diff = vk - ek;
              const offen = l.status === "OFFEN";
              return (
                <Card key={l.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold">{formatDateTime(l.createdAt)}</span>
                      <span className="ml-3 text-sm text-ink-dim">
                        {l.items.length} Positionen · {gesamtMenge} Stück
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        offen ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${offen ? "bg-amber-400" : "bg-emerald-400"}`} />
                      {offen ? "Offen" : "Geliefert"}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                          <th className="px-4 py-2">Produkt</th>
                          <th className="px-4 py-2 text-right">Menge</th>
                          <th className="px-4 py-2 text-right">EK-Preis</th>
                          <th className="px-4 py-2 text-right">VK-Preis</th>
                          <th className="px-4 py-2 text-right">EK-Wert</th>
                          <th className="px-4 py-2 text-right">VK-Wert</th>
                          <th className="px-4 py-2 text-right">Differenz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {l.items.map((i) => (
                          <tr key={i.id} className="border-b border-coal-700/60 last:border-0">
                            <td className="px-4 py-2 font-semibold">{i.productName}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{i.menge}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(i.einkaufspreisCents)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(i.verkaufspreisCents)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(i.menge * i.einkaufspreisCents)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(i.menge * i.verkaufspreisCents)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {formatMoney(i.menge * (i.verkaufspreisCents - i.einkaufspreisCents))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-coal-700 pt-3">
                    <div className="flex gap-4 text-sm">
                      <span className="text-ink-dim">
                        EK <span className="font-bold text-ink">{formatMoney(ek)}</span>
                      </span>
                      <span className="text-ink-dim">
                        VK <span className="font-bold text-ink">{formatMoney(vk)}</span>
                      </span>
                      <span className="text-ink-dim">
                        Differenz{" "}
                        <span className={`font-bold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(diff)}</span>
                      </span>
                    </div>
                    {offen && (
                      <ActionForm action={confirmDelivered} fields={{ id: l.id }} buttonLabel="Lieferung bestätigen" tone="success" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}