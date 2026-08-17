import { Card, inputCls, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { createProduct, updateProduct, toggleProduct, deleteProduct, reorderProducts } from "@/actions/admin/products";
import ActionForm from "@/components/admin/ActionForm";
import ReorderList from "@/components/admin/ReorderList";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { orderItems: true, menuItems: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Produkte</h1>
        <p className="text-sm text-ink-dim">Preise, Sortierung und Verfügbarkeit verwalten</p>
      </div>

      {/* Neues Produkt */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest">Neues Produkt</h2>
        <ActionForm action={createProduct} fields={{}} buttonLabel="Produkt anlegen" tone="primary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" >
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Name *</span>
            <input name="name" required placeholder="z. B. Classic Burger" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Preis (USD) *</span>
            <input name="priceCents" type="number" required min="0" step="0.01" placeholder="5.90" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Kategorie *</span>
            <select name="categoryId" required className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Beschreibung</span>
            <textarea name="description" rows={3} className={inputCls} placeholder="Optional" />
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input type="checkbox" name="active" defaultChecked className="h-5 w-5 accent-ember-500" />
            <span className="text-sm font-medium text-ink-dim">Aktiv</span>
          </label>
        </ActionForm>
      </Card>

      {/* Produkte je Kategorie */}
      {categories.map((cat) => (
        <Card key={cat.id}>
          <div className="flex items-center justify-between border-b border-coal-700 px-5 py-3">
            <h2 className="text-sm font-extrabold uppercase tracking-widest">{cat.name}</h2>
            <span className="text-xs text-ink-dim">{cat.products.length} Artikel</span>
          </div>
          {cat.products.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-dim">Noch keine Produkte in dieser Kategorie.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coal-700 text-left text-xs uppercase tracking-wider text-ink-dim">
                    <th className="px-5 py-2.5">Produkt</th>
                    <th className="px-5 py-2.5">Preis</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Verwendet</th>
                    <th className="px-5 py-2.5 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.products.map((p) => (
                    <tr key={p.id} className="border-b border-coal-700/60 align-top last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-bold">{p.name}</div>
                        <div className="max-w-60 text-xs text-ink-dim">{p.description || "–"}</div>
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums">{formatMoney(p.priceCents)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.active ? "READY" : "COMPLETED"} />
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-dim">
                        {p._count.orderItems}× in Bestellungen
                        {p._count.menuItems > 0 && <div className="text-amber-400">in {p._count.menuItems} Menü/Position</div>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <ActionForm action={toggleProduct} fields={{ id: p.id }} buttonLabel={p.active ? "Deaktivieren" : "Aktivieren"} tone="dark" />
                          <ActionForm
                            action={deleteProduct}
                            fields={{ id: p.id }}
                            buttonLabel="Löschen"
                            tone="danger"
                            confirmText={`Produkt „${p.name}“ wirklich löschen? Historische Bestellungen bleiben erhalten.`}
                          />
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold text-ink-dim transition hover:bg-coal-800 hover:text-ink">
                            Bearbeiten
                          </summary>
                          <div className="mt-2 rounded-xl border border-coal-700 bg-coal-800 p-3">
                            <ActionForm action={updateProduct} fields={{ id: p.id }} buttonLabel="Speichern" tone="primary" className="grid gap-2.5 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-ink-dim">Name</span>
                                <input name="name" defaultValue={p.name} required className={inputCls} />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-ink-dim">Preis (USD)</span>
                                <input name="priceCents" type="number" min="0" step="0.01" defaultValue={(p.priceCents / 100).toFixed(2)} required className={inputCls} />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="mb-1 block text-[11px] font-medium text-ink-dim">Beschreibung</span>
                                <textarea name="description" rows={2} defaultValue={p.description ?? ""} className={inputCls} />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-medium text-ink-dim">Kategorie</span>
                                <select name="categoryId" defaultValue={p.categoryId} className={inputCls}>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-end gap-2 pb-2">
                                <input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-ember-500" />
                                <span className="text-xs text-ink-dim">Aktiv</span>
                              </label>
                            </ActionForm>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}

      {/* Sortierung */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Sortierung (Drag & Drop oder ↑/↓)</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-400">{cat.name}</h3>
              {cat.products.length > 1 ? (
                <ReorderList
                  items={cat.products.map((p) => ({ id: p.id, label: `${p.name} · ${formatMoney(p.priceCents)}` }))}
                  onReorder={async (ids) => {
                    const res = await reorderProducts({ productIds: ids });
                    if (res.ok) {
                      // Seite wird im Hintergrund neu aufgebaut
                      window.location.reload?.();
                    }
                    return res;
                  }}
                />
              ) : (
                <p className="text-xs text-ink-dim">Mindestens 2 Produkte nötig.</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}