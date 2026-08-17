import type { ButtonHTMLAttributes, ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-coal-600 bg-coal-800 px-3.5 py-2.5 text-sm outline-none transition focus:border-ember-500 focus:ring-2 focus:ring-ember-500/25";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "ghost" | "danger" | "success";
};

export function Button({ variant = "primary", className = "", ...props }: BtnProps) {
  const styles: Record<string, string> = {
    primary: "bg-ember-500 text-coal-950 shadow-lg shadow-ember-500/15 hover:bg-ember-400",
    dark: "bg-coal-800 text-ink hover:bg-coal-700 border border-coal-600",
    ghost: "border border-coal-600 text-ink-dim hover:bg-coal-800 hover:text-ink",
    danger: "bg-red-600/90 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  };
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-coal-700/70 bg-coal-900 ${className}`}>{children}</div>;
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Wartet", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  PREPARING: { label: "In Zubereitung", cls: "bg-sky-500/10 text-sky-400 border-sky-500/30", dot: "bg-sky-400" },
  READY: { label: "Bereit zur Ausgabe", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  COMPLETED: { label: "Abgeschlossen", cls: "bg-coal-700/60 text-ink-dim border-coal-600", dot: "bg-coal-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: "bg-coal-700/60 text-ink-dim border-coal-600", dot: "bg-coal-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EMPLOYEE: "Mitarbeiter",
  KITCHEN: "Küche",
};

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-dim">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-dim/70">{hint}</span>}
    </label>
  );
}