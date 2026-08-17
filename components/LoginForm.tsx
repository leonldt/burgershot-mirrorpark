"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-dim">Benutzername</span>
        <input
          name="username"
          autoComplete="username"
          required
          autoFocus
          className="w-full rounded-xl border border-coal-600 bg-coal-800 px-4 py-3 text-base outline-none transition focus:border-ember-500 focus:ring-2 focus:ring-ember-500/30"
          placeholder="z. B. max"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-dim">Passwort</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-coal-600 bg-coal-800 px-4 py-3 text-base outline-none transition focus:border-ember-500 focus:ring-2 focus:ring-ember-500/30"
          placeholder="••••••••"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="touch w-full rounded-xl bg-ember-500 px-4 py-3.5 text-base font-bold text-coal-950 shadow-lg shadow-ember-500/20 transition hover:bg-ember-400 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Anmelden …" : "ANMELDEN"}
      </button>
    </form>
  );
}