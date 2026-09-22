import { Card, inputCls, StatusBadge } from "@/components/ui";
import ActionForm from "@/components/admin/ActionForm";
import { prisma } from "@/lib/prisma";
import {
  createSupplier,
  addSupplierProduct,
  upsertSupplierProduct,
  removeSupplierProduct,
  createPurchaseListForm,
} from "@/actions/admin/suppliers";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const [suppliers, products] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPPLIER" },
      orderBy: { firstName: "asc" },
      include: {
        supplierProducts: { include: { product: { select: { id: true, name: true, active: true } } } },
        purchaseLists: { orderBy: { createdAt: "desc" }, take: 6, include: { items: true } },
      },
    }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Lieferanten</h1>
        <p className="text-sm text-ink-dim">
          Sortiment je Lieferant mit Soll-/Ist-Menge und Preisen – die Differenz wird per Knopfdruck als Einkaufsliste übermittelt.
        </p>
      </div>

      {/* Neuer Lieferant */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest">Neuer Lieferant</h2>
        <ActionForm
          action={createSupplier}
          fields={{}}
          buttonLabel="Lieferant anlegen"
          tone="primary"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Vorname *</span>
            <input name="firstName" required className={inputCls} placeholder="Lief" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Nachname *</span>
            <input name="lastName" required className={inputCls} placeholder="Ant" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Benutzername *</span>
            <input name="username" required className={inputCls} placeholder="lief" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Passwort * (min. 6)</span>
            <input name="password" type="password" required minLength={6} className={inputCls} placeholder="••••••" />
          </label>
        </ActionForm>
      </Card>

      {/* Lieferanten */}
      {suppliers.map((s) => {
        const openLists = s.purchaseLists.filter((l) => l.status === "OFFEN").length;
        const assigned = new Set(s.supplierProducts.map((sp) => sp.productId));
        const availableProducts = products.filter((p) => !assigned.has(p.id));
        return (
          <Card key={s.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-coal-700 px-5 py-3">
              <div>
                <span className="text-lg font-extrabold">
                  {s.firstName} {s.lastName}
                </span>
                <span className="ml-2 text-sm text-ink-dim">@{s.username}</span>
                <span className="ml-2">
                  <StatusBadge status={s.active ? "READY" : "COMPLETED"} />
                </span>
                <span className="ml-2 text-xs text-ink-dim">
                  {s.supplierProducts.length} Produkte · {openLists} offene Einkaufsliste{openLists === 1 ? "" : "n"}
                </span>
              </div>
              <ActionForm
                action={createPurchaseListForm}
                fields={{ supplierId: s.id }}
                buttonLabel="Einkaufsliste an Lieferant senden"
                tone="primary"
                confirmText={`Einkaufsliste mit allen Differenzpositionen an ${s.firstName} ${s.lastName} übermitteln?`}
              />
            </div>

            {/* Sortiment */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                    <th className="px-5 py-2.5">Produkt</th>
                    <th className="px-5 py-2.5">Soll</th>
                    <th className="px-5 py-2.5">Ist</th>
                    <th className="px-5 py-2.5">Differenz</th>
                    <th className="px-5 py-2.5">Einkaufspreis</th>
                    <th className="px-5 py-2.5">Verkaufspreis</th>
                    <th className="px-5 py-2.5">Marge/Stk</th>
                    <th className="px-5 py-2.5 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {s.supplierProducts.map((sp) => {
                    const differenz = sp.sollMenge - sp.istMenge;
                    return (
                      <tr key={`${sp.supplierId}:${sp.productId}`} className="border-b border-coal-700/60 align-top last:border-0">
                        <td className="px-5 py-3 font-bold">
                          {sp.product.name}
                          {!sp.product.active && <span className="ml-2 text-xs text-ink-dim">(inaktiv)</span>}
                        </td>
                        <td className="px-5 py-3" colSpan={5}>
                          <ActionForm
                            action={upsertSupplierProduct}
                            fields={{ supplierId: s.id, productId: sp.productId }}
                            buttonLabel="Speichern"
                            tone="dark"
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              name="sollMenge"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={sp.sollMenge}
                              aria-label="Soll-Menge"
                              className={`${inputCls} w-20 text-center`}
                            />
                            <input
                              name="istMenge"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={sp.istMenge}
                              aria-label="Ist-Menge"
                              className={`${inputCls} w-20 text-center`}
                            />
                            <span className={`w-16 text-center font-black ${differenz > 0 ? "text-ember-400" : differenz < 0 ? "text-sky-400" : "text-ink-dim"}`}>
                              {differenz > 0 ? `+${differenz}` : differenz}
                            </span>
                            <input
                              name="einkaufspreisCents"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={sp.einkaufspreisCents / 100}
                              aria-label="Einkaufspreis"
                              className={`${inputCls} w-24 text-right`}
                            />
                            <input
                              name="verkaufspreisCents"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={sp.verkaufspreisCents / 100}
                              aria-label="Verkaufspreis"
                              className={`${inputCls} w-24 text-right`}
                            />
                          </ActionForm>
                        </td>
                        <td className="px-5 py-3">
                          <span className={sp.verkaufspreisCents - sp.einkaufspreisCents >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                            {formatMoney(sp.verkaufspreisCents - sp.einkaufspreisCents)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <ActionForm
                            action={removeSupplierProduct}
                            fields={{ supplierId: s.id, productId: sp.productId }}
                            buttonLabel="Entfernen"
                            tone="danger"
                            confirmText={`${sp.product.name} aus dem Sortiment von ${s.firstName} ${s.lastName} entfernen?`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {s.supplierProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-4 text-center text-ink-dim">
                        Noch keine Produkte zugeordnet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Produkt hinzufügen */}
            <div className="border-t border-coal-700 px-5 py-3">
              <ActionForm
                action={addSupplierProduct}
                fields={{ supplierId: s.id }}
                buttonLabel="Hinzufügen"
                tone="dark"
                className="flex flex-wrap items-end gap-2"
              >
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-dim">Produkt zum Sortiment</span>
                  <select name="productId" className={inputCls} defaultValue="">
                    <option value="" disabled>
                      Produkt wählen …
                    </option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </ActionForm>
            </div>

            {/* Letzte Einkaufslisten */}
            {s.purchaseLists.length > 0 && (
              <div className="border-t border-coal-700 px-5 py-3">
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-dim">Letzte Einkaufslisten</h3>
                <ul className="divide-y divide-coal-700/60">
                  {s.purchaseLists.map((l) => {
                    const ek = l.items.reduce((sum, i) => sum + i.menge * i.einkaufspreisCents, 0);
                    const vk = l.items.reduce((sum, i) => sum + i.menge * i.verkaufspreisCents, 0);
                    return (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <div>
                          <span className="font-semibold">{formatDateTime(l.createdAt)}</span>
                          <span className="ml-3 text-ink-dim">
                            {l.items.length} Pos. · {l.items.reduce((s, i) => s + i.menge, 0)} Stk
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-ink-dim">
                            EK {formatMoney(ek)} · VK {formatMoney(vk)} · Diff{" "}
                            <span className={vk - ek >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                              {formatMoney(vk - ek)}
                            </span>
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            l.status === "OFFEN" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          }`}>{l.status === "OFFEN" ? "Offen" : "Geliefert"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        );
      })}

      {suppliers.length === 0 && (
        <Card className="p-6 text-center text-sm text-ink-dim">Noch keine Lieferanten angelegt.</Card>
      )}
    </div>
  );
}