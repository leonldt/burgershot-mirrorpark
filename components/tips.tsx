"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addManualTip, removeManualTip } from "@/actions/tips";
import { Note } from "@/components/client";
import { Button, inputCls } from "@/components/ui";

/** Formular: eigenes Trinkgeld eintragen (ganze Dollar). */
export function TipEntryForm() {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  const submit = async (value?: string) => {
    setError(null);
    setOk(false);
    const final = value ?? amount;
    if (!/^\d{1,6}$/.test(final.trim())) {
      setError("Betrag nur in ganzen Dollar angeben (z. B. 5).");
      return;
    }
    const fd = new FormData();
    fd.set("amount", final.trim());
    setBusy(true);
    try {
      const res = await addManualTip(fd);
      if (res.ok) {
        setOk(true);
        setAmount("");
        router.refresh();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md space-y-3">
      {error && <Note tone="error">{error}</Note>}
      {ok && <Note tone="ok">Trinkgeld wurde eingetragen.</Note>}
      <div className="flex flex-wrap gap-2">
        {["1", "2", "5"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => submit(v)}
            disabled={busy}
            className="touch cursor-pointer rounded-lg border border-coal-600 bg-coal-800 px-3 py-2 text-sm font-bold text-ink-dim transition hover:bg-coal-700 disabled:opacity-50"
          >
            +${v}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="Betrag in Dollar (z. B. 5)"
          className={inputCls}
        />
        <Button onClick={() => submit()} disabled={busy || !amount.trim()} variant="primary">
          {busy ? "…" : "Eintragen"}
        </Button>
      </div>
    </div>
  );
}

/** Kleiner Entfernen-Button für eigene manuelle Trinkgeld-Einträge. */
export function TipRemoveButton({ tipId, label }: { tipId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const remove = async () => {
    if (!window.confirm(`${label} wirklich entfernen?`)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await removeManualTip(tipId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={remove}
        disabled={busy}
        className="cursor-pointer rounded-lg bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
      >
        {busy ? "…" : "Entfernen"}
      </button>
    </span>
  );
}