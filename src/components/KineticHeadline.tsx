import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

interface KineticHeadlineProps {
  lines: ReactNode[];
  className?: string;
  stagger?: number;
}

// Each line sits inside an overflow-hidden mask and slides up on mount —
// the classic editorial clip-reveal. Parent + children live in one tree so
// the stagger stays deterministic. Static under reduced motion.
export function KineticHeadline({ lines, className = "", stagger = 0.09 }: KineticHeadlineProps) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className}>
      {lines.map((line, i) => (
        <span key={i} className="clip-line">
          <motion.span
            className="block"
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.9,
              delay: 0.15 + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
