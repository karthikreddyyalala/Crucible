import { memo } from "react";
import { motion } from "motion/react";

export type AvatarState = "idle" | "speaking" | "listening";

interface InterviewerAvatarProps {
  state: AvatarState;
  size?: number;
}

// Isolated, memoized presence for the interviewer. Self-contained animation so
// it never re-renders the page. This is the seam where a Tavus streaming video
// avatar drops in later — swap the inner disc for the <video> element and keep
// the same state-driven ring/labelling.
function InterviewerAvatarBase({ state, size = 96 }: InterviewerAvatarProps) {
  const tone =
    state === "speaking"
      ? "var(--color-accent)"
      : state === "listening"
      ? "var(--color-survive)"
      : "var(--color-fog)";

  return (
    <div aria-hidden className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* breathing halo */}
      <motion.span
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: tone, opacity: 0.18 }}
        animate={{ scale: state === "idle" ? [1, 1.06, 1] : [1, 1.18, 1] }}
        transition={{ duration: state === "speaking" ? 0.9 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* listening ring */}
      {state === "listening" && (
        <motion.span
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: "var(--color-survive)" }}
          animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* disc */}
      <div
        className="relative grid place-items-center rounded-full border border-line-bright bg-ink"
        style={{ width: size * 0.82, height: size * 0.82, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)` }}
      >
        <VoiceBars state={state} tone={tone} />
      </div>
    </div>
  );
}

function VoiceBars({ state, tone }: { state: AvatarState; tone: string }) {
  if (state === "listening") {
    return (
      <motion.span
        className="h-3 w-3 rounded-full"
        style={{ background: tone }}
        animate={{ scale: [1, 0.6, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  const bars = [0, 1, 2, 3, 4];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 22 }}>
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: tone, originY: 1 }}
          animate={
            state === "speaking"
              ? { scaleY: [0.3, 1, 0.5, 0.9, 0.3], height: 22 }
              : { scaleY: 0.22, height: 22 }
          }
          transition={
            state === "speaking"
              ? { duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.09 }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
}

export const InterviewerAvatar = memo(InterviewerAvatarBase);
