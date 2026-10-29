import type { Difficulty, QuestionType } from "@/types/contracts";

const TYPE_LABEL: Record<QuestionType, string> = {
  behavioral: "BEHAVIORAL",
  technical: "TECHNICAL",
  system_design: "SYSTEM DESIGN",
  coding: "CODING",
};

export function TypeChip({ type }: { type: QuestionType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line-bright px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.18em] text-mist">
      {TYPE_LABEL[type]}
    </span>
  );
}

export function DifficultyMeter({ value }: { value: Difficulty }) {
  return (
    <span
      role="img"
      aria-label={`Difficulty ${value} of 5`}
      className="inline-flex items-center gap-[3px]"
      title={`Difficulty ${value}/5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-3 w-[3px] rounded-full ${
            n <= value ? "bg-accent" : "bg-line-bright"
          }`}
        />
      ))}
    </span>
  );
}

export function WeightedTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.14em] text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning animate-[pulse-dot_2s_ease-in-out_infinite]" />
      FROM YOUR WEAK SPOT
    </span>
  );
}
