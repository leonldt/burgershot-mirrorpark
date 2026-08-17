"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { submitOrder, completeOrderWithPayment } from "@/actions/orders";
import { getReadyOrders, type PosCategory, type ReadyOrderDto } from "@/actions/pos";
import { formatMoney, parseDollarsToCents } from "@/lib/money";
import { Modal, Note } from "@/components/client";
import { formatTime } from "@/lib/date";

type CartLine = { key: string; kind: "product" | "menu"; id: string; name: string; priceCents: number; qty: number };

export default function PosClient({ catalog, readyOrders: initialReady }: { catalog: PosCategory[]; readyOrders: ReadyOrderDto[] }) {
  const [categories] = useState(catalog);
  const firstWithContent = useMemo(
    () => catalog.find((c) => c.products.length > 0 || c.menus.length > 0)?.id ?? catalog[0]?.id ?? "",
    [catalog]
  );
  const [activeCatId, setActiveCatId] = useState(firstWithContent);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyOrderDto[]>(initialReady);
  const [checkout, setCheckout] = useState<ReadyOrderDto | null>(null);
  const [given, setGiven] = useState("");
  const [tip, setTip] = useState(0);
  const [payError, setPayError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const cartToken = useRef(crypto.randomUUID());
  const busyRef = useRef(false);

  const activeCat = categories.find((c) => c.id === activeCatId) ?? categories[0];

  const totalCents = cart.reduce((sum, l) => sum + l.priceCents * l.qty, 0);

  const refreshReady = useCallback(async () => {
    try {
      setReadyOrders(await getReadyOrders());
    } catch {
      /* Session abgelaufen o. Ä. – ignorieren */
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === "order.ready" || data.type === "order.completed") refreshReady();
      } catch {
        /* ignore */
      }
    };
    const poll = setInterval(refreshReady, 20_000); // Polling-Fallback
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [refreshReady]);

  const addItem = (kind: "product" | "menu", id: string, name: string, priceCents: number) => {
    setCart((prev) => {
      const key = `${kind}:${id}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { key, kind, id, name, priceCents, qty: 1 }];
    });
    setNote(null);
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const submit = async () => {
    if (busyRef.current || cart.length === 0) return;
    busyRef.current = true;
    setBusy(true);
    setNote(null);
    try {
      const res = await submitOrder({
        cartToken: cartToken.current,
        lines: cart.map((l) => ({ kind: l.kind, id: l.id, quantity: l.qty })),
      });
      if (res.ok) {
        cartToken.current = crypto.randomUUID();
        setCart([]);
        setNote({ tone: "ok", text: `Bestellung ${res.orderNumber} wurde an die Küche gesendet.` });
      } else {
        setNote({ tone: "error", text: res.error });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const openCheckout = (order: ReadyOrderDto) => {
    setCheckout(order);
    setGiven(formatMoney(order.totalCents).replace("$", ""));
    setTip(0);
    setPayError(null);
  };

  const confirmPayment = async () => {
    if (!checkout || busyRef.current) return;
    let givenCents: number;
    try {
      givenCents = parseDollarsToCents(given);
    } catch (e) {
      setPayError((e as Error).message);
      return;
    }
    if (givenCents < checkout.totalCents + tip) {
      setPayError("Der gegebene Betrag ist zu niedrig.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await completeOrderWithPayment({ orderId: checkout.id, givenCents, tipCents: tip });
      if (res.ok) {
        setReadyOrders((prev) => prev.filter((o) => o.id !== checkout.id));
        setCheckout(null);
        setGiven("");
        setTip(0);
        setNote({
          tone: "ok",
          text: `Bestellung ${res.orderNumber} bezahlt & ausgegeben · Rückgeld ${formatMoney(res.changeCents)}${res.tipCents ? ` · Trinkgeld ${formatMoney(res.tipCents)} verbucht` : ""}`,
        });
      } else {
        setPayError(res.error);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[1fr_400px]">
      {/* ── Links: Kategorien + Produkte ───────────────────────────────────── */}
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCatId(c.id)}
              className={`touch cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activeCat?.id === c.id ? "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20" : "bg-coal-800 text-ink-dim hover:bg-coal-700 hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeCat && (activeCat.menus.length > 0 || activeCat.products.length > 0) ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {activeCat.menus.map((m) => (
                <ItemButton key={`m${m.id}`} name={m.name} priceCents={m.priceCents} sub="Menü" accent onClick={() => addItem("menu", m.id, m.name, m.priceCents)} />
              ))}
              {activeCat.products.map((p) => (
                <ItemButton key={`p${p.id}`} name={p.name} priceCents={p.priceCents} onClick={() => addItem("product", p.id, p.name, p.priceCents)} />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-dim">Keine Artikel in dieser Kategorie.</div>
          )}
        </div>

        {/* Bereit zur Ausgabe */}
        <div className="shrink-0 rounded-2xl border border-emerald-500/25 bg-coal-900 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Bereit zur Ausgabe</h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">{readyOrders.length}</span>
          </div>
          {readyOrders.length === 0 ? (
            <p className="py-2 text-sm text-ink-dim/70">Aktuell keine fertigen Bestellungen.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {readyOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openCheckout(o)}
                  className="cursor-pointer rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-emerald-300">{o.number}</span>
                    <span className="text-xs text-ink-dim">{formatTime(new Date(o.createdAtIso))}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-ink-dim">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold">{formatMoney(o.totalCents)}</span>
                    <span className="rounded-lg bg-ember-500 px-2.5 py-1 text-xs font-bold text-coal-950">RAUS GEBEN</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Rechts: Warenkorb ──────────────────────────────────────────────── */}
      <aside className="flex min-h-0 flex-col rounded-2xl border border-coal-700/70 bg-coal-900">
        <div className="border-b border-coal-700 px-4 py-3">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-ink">Aktuelle Bestellung</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {note && (
            <div className="mb-3">
              <Note tone={note.tone}>{note.text}</Note>
            </div>
          )}
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-dim/70">Tippe links einen Artikel an,<br />um die Bestellung zu beginnen.</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((l) => (
                <li key={l.key} className="flex items-center gap-2 rounded-xl bg-coal-800 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.name}</div>
                    <div className="text-xs text-ink-dim">
                      {formatMoney(l.priceCents)} / Stk
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => changeQty(l.key, -1)}
                      className="touch h-10 w-10 cursor-pointer rounded-lg bg-coal-700 text-lg font-bold text-ink transition hover:bg-coal-600"
                      aria-label="Menge verringern"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-base font-black">{l.qty}</span>
                    <button
                      onClick={() => changeQty(l.key, +1)}
                      className="touch h-10 w-10 cursor-pointer rounded-lg bg-coal-700 text-lg font-bold text-ink transition hover:bg-coal-600"
                      aria-label="Menge erhöhen"
                    >
                      +
                    </button>
                    <button
                      onClick={() => changeQty(l.key, -l.qty)}
                      className="ml-1 cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-red-500/15 hover:text-red-400"
                      aria-label="Artikel entfernen"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-bold">{formatMoney(l.priceCents * l.qty)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-coal-700 px-4 py-3">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm font-extrabold uppercase tracking-widest text-ink-dim">Gesamt</span>
            <span className="text-3xl font-black tabular-nums">{formatMoney(totalCents)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="touch cursor-pointer rounded-xl border border-coal-600 px-4 py-3 text-sm font-semibold text-ink-dim transition hover:bg-coal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Leeren
            </button>
            <button
              onClick={submit}
              disabled={cart.length === 0 || busy}
              className="touch flex-1 cursor-pointer rounded-xl bg-ember-500 px-4 py-3 text-base font-black text-coal-950 shadow-lg shadow-ember-500/20 transition hover:bg-ember-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Wird gesendet …" : "BESTELLUNG ABSCHICKEN"}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Bezahl-Dialog ─────────────────────────────────────────────────── */}
      <Modal open={checkout !== null} onClose={() => setCheckout(null)} title={checkout ? `Bestellung ${checkout.number} ausgeben` : ""}>
        {checkout && (
          <CheckoutBody
            order={checkout}
            given={given}
            setGiven={setGiven}
            tip={tip}
            setTip={setTip}
            payError={payError}
            busy={busy}
            onConfirm={confirmPayment}
          />
        )}
      </Modal>
    </div>
  );
}

function ItemButton({
  name,
  priceCents,
  sub,
  accent = false,
  onClick,
}: {
  name: string;
  priceCents: number;
  sub?: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`touch flex min-h-28 cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${
        accent
          ? "border-ember-500/40 bg-ember-500/10 hover:border-ember-400 hover:bg-ember-500/15"
          : "border-coal-600 bg-coal-800 hover:border-coal-500 hover:bg-coal-700"
      }`}
    >
      <div>
        <div className="text-[15px] font-bold leading-snug">{name}</div>
        {sub && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ember-400">{sub}</div>}
      </div>
      <div className={`mt-2 text-base font-black tabular-nums ${accent ? "text-ember-300" : "text-ink"}`}>{formatMoney(priceCents)}</div>
    </button>
  );
}

function CheckoutBody({
  order,
  given,
  setGiven,
  tip,
  setTip,
  payError,
  busy,
  onConfirm,
}: {
  order: ReadyOrderDto;
  given: string;
  setGiven: (v: string) => void;
  tip: number;
  setTip: (v: number) => void;
  payError: string | null;
  busy: boolean;
  onConfirm: () => void;
}) {
  let givenCents: number | null = null;
  try {
    givenCents = parseDollarsToCents(given);
  } catch {
    givenCents = null;
  }
  const changeCents = givenCents !== null ? givenCents - order.totalCents - tip : null;
  const valid = givenCents !== null && changeCents !== null && changeCents >= 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-coal-800 px-4 py-3 text-sm">
        {order.items.map((i) => (
          <div key={i.name} className="flex justify-between">
            <span>
              {i.qty}× {i.name}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-coal-600 pt-2 text-base font-black">
          <span>Gesamt</span>
          <span>{formatMoney(order.totalCents)}</span>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-dim">Gegeben (USD)</span>
        <input
          value={given}
          onChange={(e) => setGiven(e.target.value)}
          inputMode="decimal"
          autoFocus
          className="w-full rounded-xl border border-coal-600 bg-coal-800 px-4 py-3 text-2xl font-black tabular-nums outline-none focus:border-ember-500"
          placeholder="0.00"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-dim">Trinkgeld (optional – wird NIE automatisch aus dem Rückgeld abgeleitet)</span>
        <div className="flex flex-wrap gap-2">
          <TipButton active={tip === 0} onClick={() => setTip(0)} label="Kein Trinkgeld" />
          <TipButton active={tip === 50} onClick={() => setTip(50)} label="+$0.50" />
          <TipButton active={tip === 100} onClick={() => setTip(100)} label="+$1.00" />
          <TipButton active={tip === 200} onClick={() => setTip(200)} label="+$2.00" />
          {givenCents !== null && givenCents > order.totalCents && (
            <TipButton active={tip === givenCents - order.totalCents} onClick={() => setTip(givenCents - order.totalCents)} label="Rest als Trinkgeld" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-coal-800 p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-dim">Rückgeld</div>
          <div className={`text-2xl font-black tabular-nums ${changeCents !== null && changeCents > 0 ? "text-emerald-400" : "text-ink"}`}>
            {changeCents === null ? "–" : formatMoney(changeCents)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-dim">Trinkgeld</div>
          <div className="text-2xl font-black tabular-nums text-ember-400">{formatMoney(tip)}</div>
        </div>
      </div>

      {payError && <Note tone="error">{payError}</Note>}

      <button
        onClick={onConfirm}
        disabled={!valid || busy}
        className="touch w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Wird abgeschlossen …" : "BEZAHLT · BESTELLUNG RAUS GEBEN"}
      </button>
    </div>
  );
}

function TipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`touch cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
        active ? "border-ember-500 bg-ember-500/20 text-ember-300" : "border-coal-600 bg-coal-800 text-ink-dim hover:bg-coal-700"
      }`}
    >
      {label}
    </button>
  );
}