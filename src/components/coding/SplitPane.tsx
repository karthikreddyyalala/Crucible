import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

interface Props {
  /** "x": panes side by side with a vertical divider; "y": stacked with a horizontal one. */
  axis: "x" | "y";
  storageKey: string;
  defaultPct: number;
  /** Minimum sizes in px. */
  minFirst: number;
  minSecond: number;
  label: string;
  first: ReactNode;
  second: ReactNode;
  className?: string;
}

const STEP = 5;
const DRAG_THRESHOLD = 3; // px of movement before a press becomes a drag (keeps double-click still)

/** The first pane's share in %, kept so both panes stay above their minimum size. */
export function clampPct(pct: number, size: number, minFirst: number, minSecond: number): number {
  if (size <= 0) return Math.min(Math.max(pct, 0), 100);
  const lo = (minFirst / size) * 100;
  const hi = Math.max(lo, 100 - (minSecond / size) * 100);
  return Math.min(Math.max(pct, lo), hi);
}

function readPct(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return value > 0 && value < 100 ? value : fallback;
  } catch {
    return fallback;
  }
}

function savePct(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* private mode or full storage: the size just isn't remembered */
  }
}

export function SplitPane({ axis, storageKey, defaultPct, minFirst, minSecond, label, first, second, className = "" }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ origin: number; startPct: number; moved: boolean } | null>(null);
  const [pct, setPct] = useState(() => readPct(storageKey, defaultPct));
  const [dragging, setDragging] = useState(false);
  const firstId = useId();
  const across = axis === "x";

  const boxSize = () => {
    const rect = boxRef.current?.getBoundingClientRect();
    return rect ? (across ? rect.width : rect.height) : 0;
  };
  const place = (next: number) => Math.round(clampPct(next, boxSize(), minFirst, minSecond) * 10) / 10;
  const commit = (next: number) => {
    const value = place(next);
    setPct(value);
    savePct(storageKey, value);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const back = across ? "ArrowLeft" : "ArrowUp";
    const forward = across ? "ArrowRight" : "ArrowDown";
    if (e.key !== back && e.key !== forward) return;
    e.preventDefault();
    commit(pct + (e.key === forward ? STEP : -STEP));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { origin: across ? e.clientX : e.clientY, startPct: pct, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = (across ? e.clientX : e.clientY) - d.origin;
    if (!d.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    if (!d.moved) setDragging(true);
    d.moved = true;
    const size = boxSize();
    if (size > 0) setPct(place(d.startPct + (delta / size) * 100));
  };
  const onPointerUp = () => {
    if (drag.current?.moved) savePct(storageKey, pct);
    drag.current = null;
    setDragging(false);
  };

  const minKey = across ? "minWidth" : "minHeight";
  const lit = dragging ? "bg-accent" : "bg-line-bright group-hover:bg-accent/70 group-focus-visible:bg-accent";

  return (
    <div ref={boxRef} className={`flex min-h-0 min-w-0 ${across ? "flex-row" : "flex-col"} ${className}`}>
      <div id={firstId} className="flex min-h-0 min-w-0 flex-col" style={{ flex: `0 1 ${pct}%`, [minKey]: minFirst }}>
        {first}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-controls={firstId}
        aria-orientation={across ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`${label} — drag, or use the arrow keys. Double-click to reset.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => commit(defaultPct)}
        className={`group relative z-10 shrink-0 touch-none select-none outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
          across ? "-mx-1 w-[9px] cursor-col-resize" : "-my-1 h-[9px] cursor-row-resize"
        }`}
      >
        <span aria-hidden className={`absolute transition-colors ${lit} ${across ? "inset-y-0 left-1 w-px" : "inset-x-0 top-1 h-px"}`} />
        <span
          aria-hidden
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
            dragging ? "bg-accent" : "bg-fog group-hover:bg-accent group-focus-visible:bg-accent"
          } ${across ? "h-6 w-[3px]" : "h-[3px] w-6"}`}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col" style={{ [minKey]: minSecond }}>
        {second}
      </div>
    </div>
  );
}
