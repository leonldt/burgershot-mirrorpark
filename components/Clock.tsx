"use client";

import { useEffect, useState } from "react";

/** Uhrzeitanzeige (HH:MM:SS) für Kasse & Küche – aktualisiert sich sekündlich. */
export default function Clock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`font-mono text-sm font-bold tabular-nums text-ink-dim ${className}`}>
      {now ? now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–:–:–"}
    </div>
  );
}