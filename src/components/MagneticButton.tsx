import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "solid" | "outline";
  className?: string;
  /** Renders a single link instead of a button (never a button nested in a link). */
  to?: string;
  "aria-describedby"?: string;
}

const MotionLink = motion.create(Link);

// Magnetic pull driven entirely by motion values (off the React render path)
// to keep it 60fps on mobile, per the perf rules. Off under reduced motion.
export function MagneticButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "solid",
  className = "",
  to,
  "aria-describedby": describedBy,
}: MagneticButtonProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 160, damping: 15 });
  const sy = useSpring(y, { stiffness: 160, damping: 15 });

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.28);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.32);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const base =
    "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:opacity-40 disabled:pointer-events-none";
  const skin =
    variant === "solid"
      ? "bg-accent text-void shadow-[0_10px_30px_-10px_rgba(74,124,255,0.6)] hover:shadow-[0_14px_36px_-8px_rgba(74,124,255,0.75)]"
      : "border border-line-bright text-chalk hover:border-fog hover:bg-surface";
  const shared = {
    onMouseMove: handleMove,
    onMouseLeave: reset,
    style: { x: sx, y: sy },
    className: `${base} ${skin} ${className}`,
  };

  if (to) {
    return (
      <MotionLink to={to} {...shared}>
        {children}
      </MotionLink>
    );
  }
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled} aria-describedby={describedBy} {...shared}>
      {children}
    </motion.button>
  );
}
