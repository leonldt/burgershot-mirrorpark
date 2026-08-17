"use client";

import { useActionState, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/actions/admin/products";

/**
 * Formular-Wrapper um eine Server Action mit versteckten Feldern.
 * Zeigt Fehler-/Erfolgsmeldung inline, optional mit Bestätigungsdialog.
 */
export default function ActionForm({
  action,
  fields,
  buttonLabel,
  tone = "dark",
  confirmText,
  children,
  className = "",
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  fields: Record<string, string>;
  buttonLabel: ReactNode;
  tone?: "primary" | "dark" | "danger";
  confirmText?: string;
  children?: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => action(fd),
    null
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (confirmText && typeof window !== "undefined" && !window.confirm(confirmText)) {
      e.preventDefault();
    }
  };

  const toneCls = {
    primary: "bg-ember-500 text-coal-950 hover:bg-ember-400",
    dark: "bg-coal-800 text-ink hover:bg-coal-700 border border-coal-600",
    danger: "bg-red-600/90 text-white hover:bg-red-500",
  }[tone];

  return (
    <form action={formAction} onSubmit={onSubmit} className={className}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={`touch inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50 ${toneCls}`}
      >
        {pending ? "…" : buttonLabel}
      </button>
      {state && !state.ok && <p className="mt-1.5 text-xs font-medium text-red-400">{state.error}</p>}
    </form>
  );
}