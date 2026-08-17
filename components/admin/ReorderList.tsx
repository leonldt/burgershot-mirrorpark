"use client";

import { useRef, useState } from "react";
import type { ActionResult } from "@/actions/admin/products";

/**
 * Liste mit Drag & Drop (+ alternativen ↑/↓-Buttons) zum Neusortieren.
 * Ruft onReorder mit der neuen Reihenfolge auf und zeigt das Ergebnis an.
 */
export default function ReorderList({
  items,
  onReorder,
}: {
  items: { id: string; label: string }[];
  onReorder: (ids: string[]) => Promise<ActionResult>;
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const dragIndex = useRef<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setOrder(next);
  };

  const persist = async () => {
    setNote(null);
    const res = await onReorder(order);
    setNote(res.ok ? { ok: true, text: "Sortierung gespeichert." } : { ok: false, text: res.error });
  };

  return (
    <div className="space-y-1.5">
      {order.map((id, index) => {
        const item = items.find((i) => i.id === id);
        if (!item) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex.current !== null && dragIndex.current !== index) {
                move(dragIndex.current, index);
                dragIndex.current = index;
              }
            }}
            onDragEnd={() => (dragIndex.current = null)}
            className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-coal-600 bg-coal-800 px-3 py-2 active:cursor-grabbing"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="text-ink-dim">⋮⋮</span> {item.label}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="rounded-md bg-coal-700 px-2 py-1 text-xs text-ink-dim hover:bg-coal-600 disabled:opacity-30"
                aria-label="Nach oben"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === order.length - 1}
                className="rounded-md bg-coal-700 px-2 py-1 text-xs text-ink-dim hover:bg-coal-600 disabled:opacity-30"
                aria-label="Nach unten"
              >
                ↓
              </button>
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={persist}
          className="touch cursor-pointer rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold text-coal-950 hover:bg-ember-400"
        >
          Sortierung speichern
        </button>
        {note && <span className={`text-xs ${note.ok ? "text-emerald-400" : "text-red-400"}`}>{note.text}</span>}
      </div>
    </div>
  );
}