import { describe, it, expect } from "vitest";
import { takeaway } from "./takeaway";
import type { AnswerEvaluation, PlannedQuestion } from "@/types/contracts";

const q = (id: string, type: PlannedQuestion["type"]): PlannedQuestion =>
  ({ id, type, prompt: "p", targetDifficulty: 3, weightedFromWeakness: false });
const ev = (questionId: string, survives: boolean, weaknessTags: string[] = []): AnswerEvaluation => ({
  questionId, transcript: "t", rubricScores: {}, weaknessTags, followUpCount: 0,
  wouldSurviveRealInterview: survives, survivalReasoning: "r",
});

describe("takeaway", () => {
  it("counts answers that held up and names the most common weak spot, humanized", () => {
    const t = takeaway(
      [ev("a", true), ev("b", false, ["no-edge-cases", "vague-impact"]), ev("c", false, ["vague-impact"])],
      [q("a", "behavioral"), q("b", "technical"), q("c", "behavioral")],
    );
    expect(t.headline).toBe("You held up on 1 of 3 answers.");
    expect(t.next).toBe("Vague impact is the next thing to work on.");
  });

  it("falls back to the question type that slipped most when there are no tags", () => {
    const t = takeaway([ev("a", false), ev("b", true)], [q("a", "system_design"), q("b", "behavioral")]);
    expect(t.headline).toBe("You held up on 1 of 2 answers.");
    expect(t.next).toBe("Your system design answers are the next thing to work on.");
  });

  it("says so when everything held up", () => {
    const t = takeaway([ev("a", true)], [q("a", "coding")]);
    expect(t.headline).toBe("You held up on 1 of 1 answer.");
    expect(t.next).toMatch(/^Every answer held up/);
  });
});
