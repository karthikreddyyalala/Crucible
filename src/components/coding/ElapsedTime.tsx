import { useEffect, useState } from "react";
import { Timer } from "@phosphor-icons/react";

const CLOCK_KEY = "crucible.coding.clock";

// One saved clock (the current problem's), so a refresh doesn't restart it.
function startedAt(clockId: string): number {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOCK_KEY) ?? "null") as { id?: unknown; start?: unknown } | null;
    if (saved?.id === clockId && typeof saved.start === "number") return saved.start;
  } catch {
    /* unreadable: start fresh */
  }
  const start = Date.now();
  try {
    localStorage.setItem(CLOCK_KEY, JSON.stringify({ id: clockId, start }));
  } catch {
    /* not remembered across a refresh */
  }
  return start;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(total % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Time on the current problem. Ticks in isolation so nothing else re-renders. */
export function ElapsedTime({ clockId }: { clockId: string }) {
  const [start] = useState(() => startedAt(clockId));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-mist" title="Time on this problem">
      <Timer size={13} aria-hidden />
      <span className="sr-only">Time on this problem:</span>
      <span role="timer">{formatElapsed(now - start)}</span>
    </span>
  );
}
