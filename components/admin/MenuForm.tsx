"use client";

import { useState } from "react";
import { createMenu, updateMenu } from "@/actions/admin/menus";
import { inputCls } from "@/components/ui";
import { Note } from "@/components/client";

export type MenuFormProduct = { id: string; name: string; priceCents: number };
export type MenuFormCategory = { id: string; name: string };
export type MenuFormDefaults = {
  id?: string;
  name: string;
  description: string | null;
  priceCents: number;
  categoryId: string;
  active: boolean;
  items: { productId: string; quantity: number }[];
};

export default function MenuForm({
  action,
  categories,
  products,
  defaults,
}: {
  action: typeof createMenu | typeof updateMenu;
  categories: MenuFormCategory[];
  products: MenuFormProduct[];
  defaults?: MenuFormDefaults;
}) {
  const isEdit = Boolean(defaults?.id);
  const [name, setName] = useState(defaults?.name ?? "");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [price, setPrice] = useState(defaults ? (defaults.priceCents / 100).toFixed(2) : "");
  const [categoryId, setCategoryId] = useState(defaults?.categoryId ?? categories[0]?.id ?? "");
  const [active, setActive] = useState(defaults?.active ?? true);
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    defaults?.items.length ? defaults.items : [{ productId: products[0]?.id ?? "", quantity: 1 }]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setError(null);
    setOk(false);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("priceCents", price);
    fd.set("categoryId", categoryId);
    fd.set("active", active ? "on" : "");
    fd.set("items", JSON.stringify(items.filter((i) => i.productId).map((i) => ({ productId: i.productId, quantity: i.quantity }))));
    if (isEdit) fd.set("id", defaults!.id!);
    setBusy(true);
    try {
      const res = await action(fd);
      if (res.ok) {
        setOk(true);
        if (typeof window !== "undefined") window.location.reload();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const total = items.reduce((sum, i) => {
    const p = products.find((x) => x.id === i.productId);
    return sum + (p?.priceCents ?? 0) * i.quantity;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-dim">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Cheeseburger Menü" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-dim">Preis (USD) *</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="8.90" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-dim">Kategorie *</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-dim">Beschreibung</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className={inputCls} />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-dim">Enthaltene Produkte</span>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={item.productId}
                onChange={(e) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, productId: e.target.value } : it)))}
                className={`${inputCls} flex-1`}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.priceCents / 100} $
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={99}
                value={item.quantity}
                onChange={(e) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, Number(e.target.value)) } : it)))}
                className={`${inputCls} w-20 text-center`}
                aria-label="Menge"
              />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                disabled={items.length === 1}
                className="rounded-lg px-2.5 py-2 text-ink-dim transition hover:bg-red-500/15 hover:text-red-400 disabled:opacity-30"
                aria-label="Zeile entfernen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { productId: products[0]?.id ?? "", quantity: 1 }])}
            className="cursor-pointer rounded-lg bg-coal-800 px-3 py-1.5 text-xs font-bold text-ink-dim hover:bg-coal-700 hover:text-ink"
          >
            + Produkt hinzufügen
          </button>
          <span className="text-xs text-ink-dim">
            Summe der Teile: <span className="font-bold text-ink">{total / 100} $</span>
          </span>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-ember-500" />
        <span className="text-xs text-ink-dim">Menü im Kassenterminal aktiv</span>
      </label>

      {error && <Note tone="error">{error}</Note>}
      {ok && <Note tone="ok">Gespeichert.</Note>}

      <button
        onClick={submit}
        disabled={busy || !name.trim() || !price}
        className="touch w-full cursor-pointer rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-black text-coal-950 shadow-lg shadow-ember-500/15 transition hover:bg-ember-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Wird gespeichert …" : isEdit ? "Änderungen speichern" : "Menü anlegen"}
      </button>
    </div>
  );
}