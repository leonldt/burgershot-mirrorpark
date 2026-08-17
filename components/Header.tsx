import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/lib/session";
import { ROLE_LABEL } from "@/components/ui";

export default function Header({
  user,
  area,
  tabs = [],
}: {
  user: SessionUser;
  area: string;
  tabs?: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-coal-700 bg-coal-900/80 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-500 text-sm font-black text-coal-950">BM</div>
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight">BURGERSHOT MIRRORPARK</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ember-500">{area}</div>
        </div>
      </div>
      {tabs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                t.active ? "bg-coal-700 text-ink shadow-inner" : "text-ink-dim hover:bg-coal-800 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-ink-dim sm:block">
          {user.firstName} {user.lastName} <span className="text-ink-dim/60">· {ROLE_LABEL[user.role] ?? user.role}</span>
        </span>
        <form action={logoutAction}>
          <button className="cursor-pointer rounded-lg border border-coal-600 px-3 py-1.5 text-xs font-semibold text-ink-dim transition hover:bg-coal-800 hover:text-ink">
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}