import { motion } from "motion/react";
import { humanizeTag } from "@/lib/humanize";

interface RubricBarProps {
  label: string;
  value: number;
  index: number;
}

export function RubricBar({ label, value, index }: RubricBarProps) {
  const pct = (value / 5) * 100;
  const tone =
    value >= 4 ? "var(--color-survive)" : value >= 3 ? "var(--color-accent)" : "var(--color-fail)";
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3 py-2.5">
      <span className="text-xs text-mist">{humanizeTag(label)}</span>
      <span aria-hidden className="relative h-[6px] w-full overflow-hidden rounded-full bg-surface-2">
        <motion.span
          className="absolute inset-y-0 left-0 origin-left rounded-full"
          style={{ background: tone, width: `${pct}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
      <span className="font-mono text-xs tabular-nums" style={{ color: tone }}>
        {value.toFixed(1)}
        <span className="text-fog"> / 5</span>
      </span>
    </div>
  );
}
