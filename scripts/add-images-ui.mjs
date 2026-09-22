import fs from "node:fs";

function edit(file, from, to, label) {
  let t = fs.readFileSync(file, "utf8");
  if (!t.includes(from)) {
    console.error(`NICHT GEFUNDEN [${label}] in ${file}`);
    process.exit(1);
  }
  fs.writeFileSync(file, t.split(from).join(to));
  console.log(`ok: ${label}`);
}

// ── actions/pos.ts: imageUrl in DTOs + Selects ──
edit(
  "actions/pos.ts",
  "export type PosProduct = { id: string; name: string; priceCents: number; description: string | null };",
  "export type PosProduct = { id: string; name: string; priceCents: number; description: string | null; imageUrl: string | null };",
  "pos: PosProduct-Typ"
);
edit(
  "actions/pos.ts",
  "export type PosMenu = { id: string; name: string; priceCents: number; description: string | null };",
  "export type PosMenu = { id: string; name: string; priceCents: number; description: string | null; imageUrl: string | null };",
  "pos: PosMenu-Typ"
);
edit(
  "actions/pos.ts",
  "select: { id: true, name: true, priceCents: true, description: true },",
  "select: { id: true, name: true, priceCents: true, description: true, imageUrl: true },",
  "pos: products-select (alle)"
);

// ── PosClient: Image-Import + ItemButton mit Bild ──
edit(
  "components/pos/PosClient.tsx",
  'import Clock from "@/components/Clock";',
  'import Clock from "@/components/Clock";\nimport Image from "next/image";',
  "pos: Image-Import"
);
edit(
  "components/pos/PosClient.tsx",
  'sub="Menü" accent onClick={() => addItem("menu", m.id, m.name, m.priceCents)} />',
  'sub="Menü" accent imageUrl={m.imageUrl} onClick={() => addItem("menu", m.id, m.name, m.priceCents)} />',
  "pos: Menü-ItemButton"
);
edit(
  "components/pos/PosClient.tsx",
  'priceCents={p.priceCents} onClick={() => addItem("product", p.id, p.name, p.priceCents)} />',
  'priceCents={p.priceCents} imageUrl={p.imageUrl} onClick={() => addItem("product", p.id, p.name, p.priceCents)} />',
  "pos: Produkt-ItemButton"
);

/* --- ItemButton: ganze Funktion ersetzen (als single-quoted Strings, Tabs/Zieltexte bleiben unangetastet) --- */
const oldFn1 = "function ItemButton({\n";
const oldFn2 = "  accent = false,\n  onClick,\n}: {\n  name: string;\n  priceCents: number;\n  sub?: string;\n  accent?: boolean;\n  onClick: () => void;\n}) {";
const newFn2 = "  accent = false,\n  imageUrl,\n  onClick,\n}: {\n  name: string;\n  priceCents: number;\n  sub?: string;\n  accent?: boolean;\n  imageUrl?: string | null;\n  onClick: () => void;\n}) {";

let t = fs.readFileSync("components/pos/PosClient.tsx", "utf8");
if (!t.includes(oldFn1) || !t.includes(oldFn2)) {
  console.error("ItemButton-Signatur nicht gefunden");
  process.exit(1);
}
t = t.split(oldFn2).join(newFn2);

// Button-Klasse: Overflow + Padding ans innere Div verlagern
t = t.split(
  "touch flex min-h-28 cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition active:scale-[0.98]"
).join(
  "touch flex min-h-28 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border text-left transition active:scale-[0.98]"
);

// Bild + inneres Layout
t = t.split(
  "      <div>\n        <div className=\"text-[15px] font-bold leading-snug\">{name}</div>"
).join(
  "      {imageUrl ? (\n        <div className=\"relative h-32 w-full shrink-0 bg-coal-700\">\n          <Image src={imageUrl} alt={name} fill sizes=\"(max-width: 1280px) 33vw, 25vw\" className=\"object-cover\" />\n        </div>\n      ) : null}\n      <div className=\"flex min-w-0 flex-1 flex-col justify-between gap-2 p-3.5\">\n        <div>\n          <div className=\"text-[15px] font-bold leading-snug\">{name}</div>"
);

// Preis-Div-Klasse: mt-2 entfällt (gap übernimmt)
t = t.split(
  '<div className={`mt-2 text-base font-black tabular-nums ${accent ? "text-ember-300" : "text-ink"}`}>{formatMoney(priceCents)}</div>'
).join(
  '<div className={`text-base font-black tabular-nums ${accent ? "text-ember-300" : "text-ink"}`}>{formatMoney(priceCents)}</div>'
);

fs.writeFileSync("components/pos/PosClient.tsx", t);
console.log("ok: pos: ItemButton umgebaut");

// ── validation.ts ──
edit(
  "lib/validation.ts",
  'export const productSchema = z.object({\n  name: z.string().trim().min(1, "Name ist erforderlich").max(80),\n  description: z.string().trim().max(500).optional().or(z.literal("")),',
  'export const productSchema = z.object({\n  name: z.string().trim().min(1, "Name ist erforderlich").max(80),\n  description: z.string().trim().max(500).optional().or(z.literal("")),\n  imageUrl: z.string().trim().max(1000).optional().or(z.literal("")),',
  "validation: productSchema imageUrl"
);
edit(
  "lib/validation.ts",
  'export const menuSchema = z.object({\n  name: z.string().trim().min(1, "Name ist erforderlich").max(80),\n  description: z.string().trim().max(500).optional().or(z.literal("")),',
  'export const menuSchema = z.object({\n  name: z.string().trim().min(1, "Name ist erforderlich").max(80),\n  description: z.string().trim().max(500).optional().or(z.literal("")),\n  imageUrl: z.string().trim().max(1000).optional().or(z.literal("")),',
  "validation: menuSchema imageUrl"
);

// ── actions/admin/products.ts ──
edit(
  "actions/admin/products.ts",
  'description: fd.get("description") ?? "",\n    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),',
  'description: fd.get("description") ?? "",\n    imageUrl: fd.get("imageUrl") ?? "",\n    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),',
  "products: parseProductForm"
);
edit(
  "actions/admin/products.ts",
  "data: { name, description: description || null, priceCents, categoryId, active, sortOrder: (max._max.sortOrder ?? -1) + 1 },",
  "data: { name, description: description || null, imageUrl: parsed.imageUrl || null, priceCents, categoryId, active, sortOrder: (max._max.sortOrder ?? -1) + 1 },",
  "products: create data"
);
edit(
  "actions/admin/products.ts",
  "await prisma.product.update({ where: { id }, data: { name, description: description || null, priceCents, categoryId, active } });",
  "await prisma.product.update({ where: { id }, data: { name, description: description || null, imageUrl: parsed.imageUrl || null, priceCents, categoryId, active } });",
  "products: update data"
);

// ── actions/admin/menus.ts ──
edit(
  "actions/admin/menus.ts",
  'description: fd.get("description") ?? "",\n    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),',
  'description: fd.get("description") ?? "",\n    imageUrl: fd.get("imageUrl") ?? "",\n    priceCents: Math.round(parseFloat(String(fd.get("priceCents"))) * 100),',
  "menus: parseMenuForm"
);
edit(
  "actions/admin/menus.ts",
  "name, description: description || null, priceCents, categoryId, active,\n        sortOrder: (max._max.sortOrder ?? -1) + 1,",
  "name, description: description || null, imageUrl: parsed.imageUrl || null, priceCents, categoryId, active,\n        sortOrder: (max._max.sortOrder ?? -1) + 1,",
  "menus: create data"
);
edit(
  "actions/admin/menus.ts",
  "data: { name, description: description || null, priceCents, categoryId, active, items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) } },",
  "data: { name, description: description || null, imageUrl: parsed.imageUrl || null, priceCents, categoryId, active, items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) } },",
  "menus: update data"
);

// ── MenuForm (client) ──
edit(
  "components/admin/MenuForm.tsx",
  "export type MenuFormDefaults = {\n  id?: string;\n  name: string;\n  description: string | null;\n  priceCents: number;",
  "export type MenuFormDefaults = {\n  id?: string;\n  name: string;\n  description: string | null;\n  imageUrl: string | null;\n  priceCents: number;",
  "MenuForm: Typ"
);
edit(
  "components/admin/MenuForm.tsx",
  'const [description, setDescription] = useState(defaults?.description ?? "");',
  'const [description, setDescription] = useState(defaults?.description ?? "");\n  const [imageUrl, setImageUrl] = useState(defaults?.imageUrl ?? "");',
  "MenuForm: state"
);
edit(
  "components/admin/MenuForm.tsx",
  '<label className="block">\n          <span className="mb-1 block text-xs font-medium text-ink-dim">Beschreibung</span>\n          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className={inputCls} />\n        </label>',
  '<label className="block">\n          <span className="mb-1 block text-xs font-medium text-ink-dim">Beschreibung</span>\n          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className={inputCls} />\n        </label>\n        <label className="block sm:col-span-2">\n          <span className="mb-1 block text-xs font-medium text-ink-dim">Bild-URL</span>\n          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… (optional)" className={inputCls} />\n        </label>',
  "MenuForm: Bildfeld"
);
edit(
  "components/admin/MenuForm.tsx",
  'fd.set("description", description);',
  'fd.set("description", description);\n    fd.set("imageUrl", imageUrl);',
  "MenuForm: submit"
);

// ── Admin: Produkte-Seite ──
edit(
  "app/admin/products/page.tsx",
  'import { formatMoney } from "@/lib/money";',
  'import { formatMoney } from "@/lib/money";\nimport Image from "next/image";',
  "products-page: Import"
);
edit(
  "app/admin/products/page.tsx",
  '<label className="block sm:col-span-2">\n            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Beschreibung</span>\n            <textarea name="description" rows={3} className={inputCls} placeholder="Optional" />\n          </label>',
  '<label className="block sm:col-span-2">\n            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Beschreibung</span>\n            <textarea name="description" rows={3} className={inputCls} placeholder="Optional" />\n          </label>\n          <label className="block sm:col-span-2">\n            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Bild-URL (optional)</span>\n            <input name="imageUrl" placeholder="https://…" className={inputCls} />\n          </label>',
  "products-page: Create-Bildfeld"
);
edit(
  "app/admin/products/page.tsx",
  '<label className="block sm:col-span-2">\n                                <span className="mb-1 block text-[11px] font-medium text-ink-dim">Beschreibung</span>\n                                <textarea name="description" rows={2} defaultValue={p.description ?? ""} className={inputCls} />\n                              </label>',
  '<label className="block sm:col-span-2">\n                                <span className="mb-1 block text-[11px] font-medium text-ink-dim">Beschreibung</span>\n                                <textarea name="description" rows={2} defaultValue={p.description ?? ""} className={inputCls} />\n                              </label>\n                              <label className="block sm:col-span-2">\n                                <span className="mb-1 block text-[11px] font-medium text-ink-dim">Bild-URL</span>\n                                <input name="imageUrl" defaultValue={p.imageUrl ?? ""} placeholder="https://…" className={inputCls} />\n                              </label>',
  "products-page: Edit-Bildfeld"
);
edit(
  "app/admin/products/page.tsx",
  '<td className="px-5 py-3">\n                        <div className="font-bold">{p.name}</div>\n                        <div className="max-w-60 text-xs text-ink-dim">{p.description || "–"}</div>\n                      </td>',
  '<td className="px-5 py-3">\n                        <div className="flex items-center gap-3">\n                          {p.imageUrl ? (\n                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-coal-700">\n                              <Image src={p.imageUrl} alt={p.name} fill sizes="48px" className="object-cover" />\n                            </div>\n                          ) : null}\n                          <div>\n                            <div className="font-bold">{p.name}</div>\n                            <div className="max-w-52 text-xs text-ink-dim">{p.description || "–"}</div>\n                          </div>\n                        </div>\n                      </td>',
  "products-page: Thumbnail"
);

// ── Admin: Menüs-Seite ──
edit(
  "app/admin/menus/page.tsx",
  'import { formatMoney } from "@/lib/money";',
  'import { formatMoney } from "@/lib/money";\nimport Image from "next/image";',
  "menus-page: Import"
);
edit(
  "app/admin/menus/page.tsx",
  '<div className="flex flex-wrap items-start justify-between gap-3">\n              <div>\n                <div className="flex items-center gap-2">\n                  <h3 className="text-lg font-extrabold">{m.name}</h3>\n                  <StatusBadge status={m.active ? "READY" : "COMPLETED"} />\n                </div>\n                {m.description && <p className="mt-0.5 text-sm text-ink-dim">{m.description}</p>}\n                <p className="mt-1 text-sm font-black text-ember-400">{formatMoney(m.priceCents)}</p>\n              </div>',
  '<div className="flex flex-wrap items-start justify-between gap-3">\n              <div className="flex items-start gap-3">\n                {m.imageUrl ? (\n                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-coal-700">\n                    <Image src={m.imageUrl} alt={m.name} fill sizes="64px" className="object-cover" />\n                  </div>\n                ) : null}\n                <div>\n                  <div className="flex items-center gap-2">\n                    <h3 className="text-lg font-extrabold">{m.name}</h3>\n                    <StatusBadge status={m.active ? "READY" : "COMPLETED"} />\n                  </div>\n                  {m.description && <p className="mt-0.5 text-sm text-ink-dim">{m.description}</p>}\n                  <p className="mt-1 text-sm font-black text-ember-400">{formatMoney(m.priceCents)}</p>\n                </div>\n              </div>',
  "menus-page: Kopf mit Bild"
);
edit(
  "app/admin/menus/page.tsx",
  "defaults={{\n                    id: m.id,\n                    name: m.name,\n                    description: m.description,\n                    priceCents: m.priceCents,",
  "defaults={{\n                    id: m.id,\n                    name: m.name,\n                    description: m.description,\n                    imageUrl: m.imageUrl,\n                    priceCents: m.priceCents,",
  "menus-page: MenuForm-Defaults"
);

console.log("FERTIG");