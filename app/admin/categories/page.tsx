import { Card, inputCls, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { createCategory, updateCategory, toggleCategory, deleteCategory, reorderCategories } from "@/actions/admin/categories";
import ActionForm from "@/components/admin/ActionForm";
import ReorderList from "@/components/admin/ReorderList";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true, menus: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Kategorien</h1>
        <p className="text-sm text-ink-dim">Produktgruppen für das Kassenterminal</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest">Neue Kategorie</h2>
        <ActionForm action={createCategory} fields={{}} buttonLabel="Kategorie anlegen" tone="primary" className="flex flex-wrap items-end gap-3">
          <label className="block flex-1">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Name *</span>
            <input name="name" required placeholder="z. B. Burger" className={inputCls} />
          </label>
        </ActionForm>
      </Card>

      <Card>
        <div className="border-b border-coal-700 px-5 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Kategorien</h2>
        </div>
        <div className="divide-y divide-coal-700/60">
          {categories.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{c.name}</span>
                  <StatusBadge status={c.active ? "READY" : "COMPLETED"} />
                </div>
                <div className="text-xs text-ink-dim">
                  {c._count.products} Produkte · {c._count.menus} Menüs
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionForm action={toggleCategory} fields={{ id: c.id }} buttonLabel={c.active ? "Deaktivieren" : "Aktivieren"} tone="dark" />
                <ActionForm
                  action={deleteCategory}
                  fields={{ id: c.id }}
                  buttonLabel="Löschen"
                  tone="danger"
                  confirmText={`Kategorie „${c.name}“ wirklich löschen?`}
                />
                <details>
                  <summary className="cursor-pointer rounded-lg border border-coal-600 px-3 py-1.5 text-xs font-bold text-ink-dim transition hover:bg-coal-800 hover:text-ink">
                    Umbenennen
                  </summary>
                  <div className="mt-2 rounded-xl border border-coal-700 bg-coal-800 p-3">
                    <ActionForm action={updateCategory} fields={{ id: c.id }} buttonLabel="Speichern" tone="primary" className="flex flex-wrap items-end gap-3">
                      <label className="block flex-1">
                        <span className="mb-1 block text-[11px] font-medium text-ink-dim">Name</span>
                        <input name="name" defaultValue={c.name} required className={inputCls} />
                      </label>
                    </ActionForm>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest">Sortierung (Drag & Drop oder ↑/↓)</h2>
        <ReorderList
          items={categories.map((c) => ({ id: c.id, label: c.name }))}
          onReorder={async (ids) => {
            const res = await reorderCategories({ categoryIds: ids });
            if (res.ok) window.location.reload?.();
            return res;
          }}
        />
      </Card>
    </div>
  );
}