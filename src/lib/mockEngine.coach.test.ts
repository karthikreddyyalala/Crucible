import { describe, it, expect } from "vitest";
import { mockEngine } from "./mockEngine";
import type { PlannedQuestion } from "@/types/contracts";

function q(type: PlannedQuestion["type"]): PlannedQuestion {
  return { id: "q1", type, prompt: "prompt", targetDifficulty: 3, weightedFromWeakness: false };
}

describe("mockEngine.coach", () => {
  it("returns a model answer and improvement notes", () => {
    const r = mockEngine.coach(q("behavioral"), ["vague-impact", "no-star-structure"]);
    expect(r.modelAnswer.length).toBeGreaterThan(20);
    expect(r.improvements.length).toBeGreaterThanOrEqual(2);
  });

  it("names the weakness tags in the improvements", () => {
    const r = mockEngine.coach(q("technical"), ["no-edge-cases"]);
    expect(r.improvements.join(" ")).toContain("no-edge-cases");
  });

  it("frames behavioral answers around STAR", () => {
    const r = mockEngine.coach(q("behavioral"), []);
    expect(r.modelAnswer).toMatch(/situation|task|action|result/i);
  });

  it("frames system_design answers around requirements and tradeoffs", () => {
    const r = mockEngine.coach(q("system_design"), []);
    expect(r.modelAnswer.toLowerCase()).toMatch(/requirement|tradeoff|scale/);
  });

  it("keeps code out of a coding coach note (a clean solution comes from the backend after finalize)", () => {
    const r = mockEngine.coach(q("coding"), ["failing-tests"]);
    expect(r.code ?? "").toBe("");
    expect(r.modelAnswer).toMatch(/complexity/i);
    expect(r.modelAnswer).not.toMatch(/def |return /);
    expect(r.improvements.join(" ")).toContain("failing-tests");
  });
});

describe("mockEngine.evaluate keyPoints", () => {
  it("only uses the candidate's lines, never Marcus's", () => {
    const thread = [
      "Q: Tell me about a project you owned under a tight deadline.",
      "A: I rebuilt the checkout retry queue in two weeks. It cut failed payments by 31 percent.",
      "Q: You said the team stayed focused. What did you specifically do?",
      "A: I wrote the idempotency keys myself and ran the load tests.",
    ].join("\n");
    const points = mockEngine.evaluate(q("behavioral"), thread, 1).keyPoints ?? [];
    expect(points.length).toBeGreaterThan(0);
    expect(points.join(" ")).not.toMatch(/Tell me about|You said the team|^Q:|^A:/);
    expect(points[0]).toBe("I rebuilt the checkout retry queue in two weeks");
  });
});
