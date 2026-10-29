import type { AnswerEvaluation, PlannedQuestion } from "@/types/contracts";
import { humanizeTag } from "@/lib/humanize";

export interface Takeaway {
  headline: string; // "You held up on 3 of 5 answers."
  next: string; // the single next thing to work on
}

function mostCommon(items: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = 0;
  // Ties keep the first one seen (Map keeps insertion order).
  for (const [k, n] of counts) {
    if (n > bestCount) {
      best = k;
      bestCount = n;
    }
  }
  return best;
}

// One plain-language takeaway for a session's report. Expects at least one evaluation.
export function takeaway(evaluations: AnswerEvaluation[], questions: PlannedQuestion[]): Takeaway {
  const survived = evaluations.filter((e) => e.wouldSurviveRealInterview).length;
  const total = evaluations.length;
  const headline = `You held up on ${survived} of ${total} answer${total === 1 ? "" : "s"}.`;

  const tag = mostCommon(evaluations.flatMap((e) => e.weaknessTags));
  if (tag) return { headline, next: `${humanizeTag(tag)} is the next thing to work on.` };

  const slipped = evaluations
    .filter((e) => !e.wouldSurviveRealInterview)
    .flatMap((e) => questions.find((q) => q.id === e.questionId)?.type ?? []);
  const type = mostCommon(slipped);
  if (type) return { headline, next: `Your ${humanizeTag(type).toLowerCase()} answers are the next thing to work on.` };

  return { headline, next: "Every answer held up. Keep that depth next time." };
}
