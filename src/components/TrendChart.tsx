import { motion, useReducedMotion } from "motion/react";
import type { TrendPoint } from "@/types/contracts";

function trendLabel(points: TrendPoint[]): string {
  const scores = points.map((p) => p.avgScore.toFixed(1)).join(", ");
  return `Average score by session, oldest first, out of 5: ${scores}`;
}

// Hand-built SVG so it matches the technical aesthetic instead of a generic
// chart library. The line draws itself on mount to show direction of travel,
// unless the user prefers reduced motion.
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const reduced = useReducedMotion();

  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-line px-4 text-center text-sm text-mist">
        Your trend line starts after your first session.
      </div>
    );
  }

  const w = 560;
  const h = 180;
  const pad = 28;
  const maxScore = 5;
  const xs = (i: number) =>
    points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1);
  const ys = (v: number) => h - pad - (v / maxScore) * (h - pad * 2);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(p.avgScore)}`).join(" ");
  const areaPath = `${linePath} L ${xs(points.length - 1)} ${h - pad} L ${xs(0)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={trendLabel(points)}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4, 5].map((g) => (
        <g key={g}>
          <line x1={pad} y1={ys(g)} x2={w - pad} y2={ys(g)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={8} y={ys(g) + 3} fill="var(--color-mist)" fontSize="10" fontFamily="JetBrains Mono">
            {g}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <motion.path
          d={areaPath}
          fill="url(#trendFill)"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        />
      )}

      <motion.path
        d={linePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />

      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={xs(i)}
          cy={ys(p.avgScore)}
          r="4"
          fill="var(--color-void)"
          stroke="var(--color-accent)"
          strokeWidth="2"
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 300, damping: 18 }}
        />
      ))}
    </svg>
  );
}
