"use client";

import { useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel, className = "" }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`touch inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-semibold text-coal-950 shadow-lg shadow-ember-500/15 transition hover:bg-ember-400 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-coal-600 bg-coal-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-coal-700 px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-dim transition hover:bg-coal-700 hover:text-ink" aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** Kleine, schnelle Inline-Statusmeldung (Erfolg/Fehler). */
export function Note({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  const cls = {
    error: "border-red-500/40 bg-red-500/10 text-red-300",
    ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  }[tone];
  return <div className={`rounded-xl border px-3.5 py-2.5 text-sm ${cls}`}>{children}</div>;
}