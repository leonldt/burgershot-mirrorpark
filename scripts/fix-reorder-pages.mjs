import fs from "node:fs";

// ── Produkte-Seite ──
const f1 = "app/admin/products/page.tsx";
let t1 = fs.readFileSync(f1, "utf8");

t1 = t1.split(
  "import { createProduct, updateProduct, toggleProduct, deleteProduct, reorderProducts } from \"@/actions/admin/products\";"
).join("import { createProduct, updateProduct, toggleProduct, deleteProduct } from \"@/actions/admin/products\";");

const oldProductsReorder = `<ReorderList
                  items={cat.products.map((p) => ({ id: p.id, label: \`${p.name} · ${formatMoney(p.priceCents)}\` }))}
                  onReorder={async (ids) => {
                    const res = await reorderProducts({ productIds: ids });
                    if (res.ok) {
                      // Seite wird im Hintergrund neu aufgebaut
                      window.location.reload?.();
                    }
                    return res;
                  }}
                />`;

const newProductsReorder = `<ReorderList
                  kind="products"
                  items={cat.products.map((p) => ({ id: p.id, label: \`${p.name} · ${formatMoney(p.priceCents)}\` }))}
                />`;

if (!t1.includes(oldProductsReorder)) {
  console.error("Produkte-Reorder-Block nicht gefunden");
  process.exit(1);
}
t1 = t1.split(oldProductsReorder).join(newProductsReorder);
fs.writeFileSync(f1, t1);

// ── Kategorien-Seite ──
const f2 = "app/admin/categories/page.tsx";
let t2 = fs.readFileSync(f2, "utf8");

t2 = t2.split(
  "import { createCategory, updateCategory, toggleCategory, deleteCategory, reorderCategories } from \"@/actions/admin/categories\";"
).join("import { createCategory, updateCategory, toggleCategory, deleteCategory } from \"@/actions/admin/categories\";");

const oldCategoriesReorder = `<ReorderList
          items={categories.map((c) => ({ id: c.id, label: c.name }))}
          onReorder={async (ids) => {
            const res = await reorderCategories({ categoryIds: ids });
            if (res.ok) window.location.reload?.();
            return res;
          }}
        />`;

const newCategoriesReorder = `<ReorderList
          kind="categories"
          items={categories.map((c) => ({ id: c.id, label: c.name }))}
        />`;

if (!t2.includes(oldCategoriesReorder)) {
  console.error("Kategorien-Reorder-Block nicht gefunden");
  process.exit(1);
}
t2 = t2.split(oldCategoriesReorder).join(newCategoriesReorder);
fs.writeFileSync(f2, t2);

console.log("ok");