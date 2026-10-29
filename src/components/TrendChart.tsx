import { motion } from "motion/react";
import type { TrendPoint } from "@/types/contracts";

// Hand-built SVG so it matches the technical aesthetic instead of a generic
// chart library. The line draws itself via pathLength on mount.
export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-line text-sm text-fog">
        First session. Your trend line starts here.
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Score trend across sessions">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 1.25, 2.5, 3.75, 5].map((g) => (
        <g key={g}>
          <line x1={pad} y1={ys(g)} x2={w - pad} y2={ys(g)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={4} y={ys(g) + 3} fill="var(--color-fog)" fontSize="9" fontFamily="JetBrains Mono">
            {g}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <motion.path
          d={areaPath}
          fill="url(#trendFill)"
          initial={{ opacity: 0 }}
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
        initial={{ pathLength: 0 }}
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
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 300, damping: 18 }}
        />
      ))}
    </svg>
  );
}
