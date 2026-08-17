"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Bestellungen" },
  { href: "/admin/balance", label: "Tagesbilanz" },
  { href: "/admin/products", label: "Produkte" },
  { href: "/admin/categories", label: "Kategorien" },
  { href: "/admin/menus", label: "Menüs" },
  { href: "/admin/employees", label: "Mitarbeiter" },
  { href: "/admin/tips", label: "Trinkgeld" },
  { href: "/admin/audit", label: "Audit-Log" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="w-52 shrink-0 border-r border-coal-700 bg-coal-900/60 p-3">
      <nav className="sticky top-3 flex flex-col gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(`${l.href}/`));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                active ? "bg-ember-500 text-coal-950" : "text-ink-dim hover:bg-coal-800 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}