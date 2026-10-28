import type { CodingStep } from "@/stores/sessionStore";

const STEPS: { id: CodingStep; label: string }[] = [
  { id: "approach", label: "Approach" },
  { id: "coding", label: "Code" },
  { id: "review", label: "Review" },
];

/** Approach → Code → Review. Reflects the interview; the candidate doesn't navigate it. */
export function StageIndicator({ stage }: { stage: CodingStep }) {
  const at = Math.max(0, STEPS.findIndex((s) => s.id === stage));
  return (
    <div className="relative">
      <span className="sr-only">{`Stage ${at + 1} of ${STEPS.length}: ${STEPS[at].label}`}</span>
      <ol aria-hidden className="grid grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={`px-2.5 pb-2 pt-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-200 ${
              i === at ? "text-accent" : i < at ? "text-chalk/80" : "text-mist"
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" />
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] w-1/3 bg-accent transition-transform duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${at * 100}%)` }}
      />
    </div>
  );
}
