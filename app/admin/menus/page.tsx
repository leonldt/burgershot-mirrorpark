import { Card, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { createMenu, updateMenu, deleteMenu, toggleMenu } from "@/actions/admin/menus";
import ActionForm from "@/components/admin/ActionForm";
import MenuForm from "@/components/admin/MenuForm";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  const [menus, categories, products] = await Promise.all([
    prisma.menu.findMany({ orderBy: { sortOrder: "asc" }, include: { items: { include: { product: { select: { id: true, name: true, priceCents: true } } } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Menüs</h1>
        <p className="text-sm text-ink-dim">Kombi-Angebote mit enthaltenen Produkten</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest">Neues Menü</h2>
        <MenuForm action={createMenu as typeof createMenu} categories={categories} products={products} />
      </Card>

      <div className="space-y-4">
        {menus.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold">{m.name}</h3>
                  <StatusBadge status={m.active ? "READY" : "COMPLETED"} />
                </div>
                {m.description && <p className="mt-0.5 text-sm text-ink-dim">{m.description}</p>}
                <p className="mt-1 text-sm font-black text-ember-400">{formatMoney(m.priceCents)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={toggleMenu} fields={{ id: m.id }} buttonLabel={m.active ? "Deaktivieren" : "Aktivieren"} tone="dark" />
                <ActionForm action={deleteMenu} fields={{ id: m.id }} buttonLabel="Löschen" tone="danger" confirmText={`Menü „${m.name}“ wirklich löschen?`} />
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-coal-800 px-4 py-2.5 text-sm">
              {m.items.map((it) => (
                <div key={it.id} className="flex justify-between gap-2">
                  <span>
                    <span className="font-bold">{it.quantity}×</span> {it.product.name}
                  </span>
                  <span className="text-ink-dim">{formatMoney(it.product.priceCents * it.quantity)}</span>
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer rounded-lg bg-coal-800 px-3 py-2 text-xs font-bold text-ink-dim transition hover:bg-coal-700 hover:text-ink">
                Menü bearbeiten
              </summary>
              <div className="mt-3 border-t border-coal-700 pt-3">
                <MenuForm
                  action={updateMenu as typeof createMenu}
                  categories={categories}
                  products={products}
                  defaults={{
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    priceCents: m.priceCents,
                    categoryId: m.categoryId,
                    active: m.active,
                    items: m.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
                  }}
                />
              </div>
            </details>
          </Card>
        ))}
        {menus.length === 0 && <p className="text-center text-sm text-ink-dim">Noch keine Menüs angelegt.</p>}
      </div>
    </div>
  );
}