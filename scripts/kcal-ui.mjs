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

const f = "components/pos/PosClient.tsx";

// CartLine um Beschreibung erweitern
edit(
  f,
  'type CartLine = { key: string; kind: "product" | "menu"; id: string; name: string; priceCents: number; qty: number };',
  'type CartLine = { key: string; kind: "product" | "menu"; id: string; name: string; priceCents: number; qty: number; description: string | null };',
  "CartLine-Typ"
);

// loadCart: Beschreibung aus dem Katalog wiederherstellen
edit(
  f,
  "const meta = new Map<string, { name: string; priceCents: number }>();\n    for (const c of catalog) {\n      for (const p of c.products) meta.set(`product:${p.id}`, { name: p.name, priceCents: p.priceCents });\n      for (const m of c.menus) meta.set(`menu:${m.id}`, { name: m.name, priceCents: m.priceCents });\n    }",
  "const meta = new Map<string, { name: string; priceCents: number; description: string | null }>();\n    for (const c of catalog) {\n      for (const p of c.products) meta.set(`product:${p.id}`, { name: p.name, priceCents: p.priceCents, description: p.description });\n      for (const m of c.menus) meta.set(`menu:${m.id}`, { name: m.name, priceCents: m.priceCents, description: m.description });\n    }",
  "loadCart-Meta"
);
edit(
  f,
  "return { key: `${s.kind}:${s.id}`, kind: s.kind, id: s.id, name: m.name, priceCents: m.priceCents, qty: Math.max(1, Math.min(99, s.qty)) };",
  "return { key: `${s.kind}:${s.id}`, kind: s.kind, id: s.id, name: m.name, priceCents: m.priceCents, description: m.description, qty: Math.max(1, Math.min(99, s.qty)) };",
  "loadCart-Rückgabewert"
);

// addItem: Beschreibung mitführen
edit(
  f,
  "const addItem = (kind: \"product\" | \"menu\", id: string, name: string, priceCents: number) => {",
  "const addItem = (kind: \"product\" | \"menu\", id: string, name: string, priceCents: number, description: string | null) => {",
  "addItem-Signatur"
);
edit(
  f,
  "return [...prev, { key, kind, id, name, priceCents, qty: 1 }];",
  "return [...prev, { key, kind, id, name, priceCents, description, qty: 1 }];",
  "addItem-Eintrag"
);

// Aufrufe: Beschreibung übergeben
edit(
  f,
  'imageUrl={m.imageUrl} onClick={() => addItem("menu", m.id, m.name, m.priceCents)} />',
  'imageUrl={m.imageUrl} description={m.description} onClick={() => addItem("menu", m.id, m.name, m.priceCents, m.description)} />',
  "Menü-Aufruf"
);
edit(
  f,
  'imageUrl={p.imageUrl} onClick={() => addItem("product", p.id, p.name, p.priceCents)} />',
  'imageUrl={p.imageUrl} description={p.description} onClick={() => addItem("product", p.id, p.name, p.priceCents, p.description)} />',
  "Produkt-Aufruf"
);

// ItemButton: Props + Beschreibungszeile
edit(
  f,
  "  accent = false,\n  imageUrl,\n  onClick,\n}: {\n  name: string;\n  priceCents: number;\n  sub?: string;\n  accent?: boolean;\n  imageUrl?: string | null;\n  onClick: () => void;\n}) {",
  "  accent = false,\n  imageUrl,\n  description,\n  onClick,\n}: {\n  name: string;\n  priceCents: number;\n  sub?: string;\n  accent?: boolean;\n  imageUrl?: string | null;\n  description?: string | null;\n  onClick: () => void;\n}) {",
  "ItemButton-Props"
);
edit(
  f,
  '<div className="text-[15px] font-bold leading-snug">{name}</div>\n          {sub && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ember-400">{sub}</div>}',
  '<div className="text-[15px] font-bold leading-snug">{name}</div>\n          {description ? <div className="mt-0.5 text-xs text-ink-dim">{description}</div> : null}\n          {sub && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ember-400">{sub}</div>}',
  "ItemButton-Beschreibung"
);

// Warenkorb-Zeile: Beschreibung anzeigen
edit(
  f,
  '<div className="truncate text-sm font-semibold">{l.name}</div>\n                    <div className="text-xs text-ink-dim">\n                      {formatMoney(l.priceCents)} / Stk\n                    </div>',
  '<div className="truncate text-sm font-semibold">{l.name}</div>\n                    {l.description ? <div className="text-xs text-ink-dim">{l.description}</div> : null}\n                    <div className="text-xs text-ink-dim">\n                      {formatMoney(l.priceCents)} / Stk\n                    </div>',
  "Warenkorb-Beschreibung"
);

console.log("FERTIG");