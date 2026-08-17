"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { payoutTips } from "@/actions/admin/tips";

export default function TipsPayButton({ employeeId, balanceCents, name }: { employeeId: string; balanceCents: number; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const disabled = balanceCents <= 0;

  const pay = async () => {
    if (disabled) return;
    if (!window.confirm(`Trinkgeld von ${name} wirklich auszahlen?`)) return;
    setBusy(true);
    setError(null);
    const res = await payoutTips(employeeId);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  return (
    <div>
      <button
        onClick={pay}
        disabled={disabled || busy}
        className={`touch w-full cursor-pointer rounded-xl px-4 py-3 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
          disabled ? "bg-coal-800 text-ink-dim" : "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/20 hover:bg-ember-400"
        }`}
      >
        {busy ? "Wird ausgezahlt …" : "TRINKGELD AUSZAHLEN"}
      </button>
      {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
    </div>
  );
}