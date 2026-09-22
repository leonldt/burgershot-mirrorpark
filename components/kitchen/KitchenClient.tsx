"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acceptOrder, markOrderReady, cancelOrder } from "@/actions/orders";
import { getKitchenOrders, type KitchenOrderDto } from "@/actions/pos";
import { formatTime } from "@/lib/date";

export default function KitchenClient({ initialOrders }: { initialOrders: KitchenOrderDto[] }) {
  const [orders, setOrders] = useState<KitchenOrderDto[]>(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const refresh = useCallback(async () => {
    try {
      setOrders(await getKitchenOrders());
    } catch {
      /* ignore */
    }
  }, []);

  const beep = useCallback((freq = 880, delaySec = 0) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + delaySec;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      /* Audio nicht verfügbar (z. B. Autoplay-Block) – ignorieren */
    }
  }, []);

  /** Signalton bei neu eingetroffener Bestellung (doppelter Piepton). */
  const notifyNewOrder = useCallback(() => {
    if (!soundOn) return;
    beep(880, 0);
    beep(660, 0.28);
  }, [soundOn, beep]);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === "order.created") notifyNewOrder();
        if (["order.created", "order.preparing", "order.ready", "order.completed", "order.cancelled"].includes(data.type ?? "")) refresh();
      } catch {
        /* ignore */
      }
    };
    const poll = setInterval(refresh, 20_000); // Polling-Fallback
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      es.close();
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh, notifyNewOrder]);

  const cancelWithConfirm = async (o: KitchenOrderDto) => {
    if (!window.confirm(`Bestellung ${o.number} wirklich stornieren?`)) return;
    await cancelOrder(o.id);
    refresh();
  };

  const act = async (orderId: string, fn: (id: string) => Promise<{ ok: boolean }>, thenRefresh: boolean) => {
    setBusyId(orderId);
    try {
      await fn(orderId);
      if (thenRefresh) await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const pending = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => o.status === "PREPARING");

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs text-ink-dim">
          Neue Bestellungen erscheinen hier automatisch – kein Neuladen nötig.
        </span>
        <button
          onClick={() => setSoundOn((s) => !s)}
          className={`touch cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            soundOn ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" : "border-coal-600 text-ink-dim hover:bg-coal-800"
          }`}
        >
          Ton bei neuer Bestellung: {soundOn ? "An" : "Aus"}
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-2">
        <KitchenColumn
          title="Wartend"
          tone="amber"
          count={pending.length}
          orders={pending}
          now={now}
          busyId={busyId}
          action={async (id) => act(id, (oid) => acceptOrder(oid), true)}
          actionLabel="ÜBERNEHMEN"
          onCancel={cancelWithConfirm}
        />
        <KitchenColumn
          title="In Zubereitung"
          tone="sky"
          count={preparing.length}
          orders={preparing}
          now={now}
          busyId={busyId}
          action={async (id) => act(id, (oid) => markOrderReady(oid), true)}
          actionLabel="ZUBEREITET"
          actionReady
          onCancel={cancelWithConfirm}
        />
      </div>
    </div>
  );
}

function KitchenColumn({
  title,
  tone,
  count,
  orders,
  now,
  busyId,
  action,
  actionLabel,
  actionReady = false,
  onCancel,
}: {
  title: string;
  tone: "amber" | "sky";
  count: number;
  orders: KitchenOrderDto[];
  now: number;
  busyId: string | null;
  action: (id: string) => Promise<void>;
  actionLabel: string;
  actionReady?: boolean;
  onCancel: (o: KitchenOrderDto) => void;
}) {
  const toneCls = tone === "amber" ? "border-amber-500/30 text-amber-400" : "border-sky-500/30 text-sky-400";
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-coal-700/70 bg-coal-900">
      <div className={`flex items-center justify-between border-b border-coal-700 px-4 py-3 ${toneCls}`}>
        <h2 className="text-sm font-extrabold uppercase tracking-widest">{title}</h2>
        <span className="rounded-full bg-coal-800 px-2.5 py-0.5 text-sm font-black text-ink">{count}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-dim/60">Keine Bestellungen</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {orders.map((o) => {
              const elapsedMin = Math.max(0, Math.floor((now - new Date(o.createdAtIso).getTime()) / 60_000));
              return (
                <div
                  key={o.id}
                  className={`flex flex-col rounded-2xl border p-4 ${
                    tone === "amber" ? "border-amber-500/25 bg-amber-500/5" : "border-sky-500/25 bg-sky-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-2xl font-black tracking-tight">{o.number}</div>
                    <div className="text-right text-xs text-ink-dim">
                      <div>{formatTime(new Date(o.createdAtIso))}</div>
                      <div className={`font-bold ${elapsedMin > 10 ? "text-red-400" : "text-ink-dim"}`}>{elapsedMin} min</div>
                    </div>
                  </div>
                  <ul className="mt-2 flex-1 space-y-1">
                    {o.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-2 text-[15px]">
                        <span>
                          <span className="font-black">{i.qty}×</span> {i.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 text-xs text-ink-dim/70">Aufgenommen von {o.employeeName}</div>
                  <button
                    onClick={() => action(o.id)}
                    disabled={busyId === o.id}
                    className={`touch mt-3 w-full cursor-pointer rounded-xl px-4 py-3.5 text-base font-black transition disabled:cursor-wait disabled:opacity-60 ${
                      actionReady
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
                        : "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400"
                    }`}
                  >
                    {busyId === o.id ? "…" : actionLabel}
                  </button>
                  <button
                    onClick={() => onCancel(o)}
                    disabled={busyId === o.id}
                    className="touch mt-2 w-full cursor-pointer rounded-xl bg-red-500/15 px-3.5 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                  >
                    Storno
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}