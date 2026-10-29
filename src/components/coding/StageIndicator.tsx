import type { CodingStep } from "@/stores/sessionStore";

const STEPS: { id: CodingStep; label: string }[] = [
  { id: "approach", label: "Approach" },
  { id: "coding", label: "Code" },
  { id: "review", label: "Review" },
];

/** Approach, Code, Review. Reflects the interview as plain text; the candidate doesn't navigate it. */
export function StageIndicator({ stage }: { stage: CodingStep }) {
  const at = Math.max(0, STEPS.findIndex((s) => s.id === stage));
  return (
    <span className="whitespace-nowrap font-mono text-[11px] tracking-wide text-mist">
      Step {at + 1} of {STEPS.length}: <span className="text-chalk">{STEPS[at].label}</span>
    </span>
  );
}
