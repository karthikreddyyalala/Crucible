import { describe, it, expect } from "vitest";
import { mockEngine } from "./mockEngine";
import problems from "./coding/problems.public.json";
import type { TurnInput } from "./api";
import type { PlannedQuestion } from "@/types/contracts";

const coding = (id = "q0"): PlannedQuestion => ({
  id, type: "coding", prompt: "Let's do a coding problem: find two numbers that add up to a target.",
  targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum",
});
const next: PlannedQuestion = {
  id: "q1", type: "technical", prompt: "Prompt for q1.", targetDifficulty: 3, weightedFromWeakness: false,
};

const turn = (over: Partial<TurnInput>): TurnInput => ({
  question: coding(), answer: "", followUpCount: 0, isLast: false, phase: "question", nextQuestion: next,
  candidateName: "Karthik", mode: "coding", level: "mid", profile: null, companyStyle: "general", strikes: 0,
  codingStage: "approach", ...over,
});

const difficultyOf = (id: string | null | undefined) => problems.find((p) => p.id === id)?.difficulty;

describe("mockEngine.buildSession — coding", () => {
  it.each([
    ["junior", ["easy", "easy"]],
    ["mid", ["easy", "medium"]],
    ["senior", ["medium", "hard"]],
  ] as const)("sizes a %s coding round from real problems", (level, expected) => {
    const { plan } = mockEngine.buildSession("sde", "coding", level);
    expect(plan.questions.map((q) => q.type)).toEqual(["coding", "coding"]);
    expect(plan.questions.map((q) => difficultyOf(q.exemplarId))).toEqual(expected);
    expect(new Set(plan.questions.map((q) => q.exemplarId)).size).toBe(2);
    expect(plan.questions.every((q) => q.prompt.startsWith("Let's do a coding problem:"))).toBe(true);
  });

  it.each(["sde", "ai_engineer"])("builds a %s full mock as behavioral, coding, technical, system design", (role) => {
    const { plan } = mockEngine.buildSession(role, "full", "junior");
    expect(plan.questions.map((q) => q.type)).toEqual(["behavioral", "coding", "technical", "system_design"]);
    expect(difficultyOf(plan.questions[1].exemplarId)).toBe("easy");
    expect(new Set(plan.questions.map((q) => q.id)).size).toBe(plan.questions.length);
  });

  it("leaves focused non-coding modes without coding problems", () => {
    const { plan } = mockEngine.buildSession("sde", "behavioral", "mid");
    expect(plan.questions.every((q) => q.type === "behavioral")).toBe(true);
  });
});

describe("mockEngine.decide — coding stages", () => {
  it("asks for the plan's complexity once in the approach stage, then says to code it", () => {
    const first = mockEngine.decide(turn({ answer: "I'd use a hash map from value to index and scan once." }));
    expect(first.action).toBe("follow_up");
    expect(first.say).toMatch(/complexity/i);

    const second = mockEngine.decide(turn({ answer: `Q: ${first.say}\nA: O(n) time and O(n) space.`, followUpCount: 1 }));
    expect(second.action).toBe("clarify");
    expect(second.say).toBe("Sounds good — go ahead and code it.");
  });

  it("checks in with one short line", () => {
    const d = mockEngine.decide(turn({ codingStage: "coding", event: "checkin" }));
    expect(d.action).toBe("clarify");
    expect(d.say).toBe("How's it going — want to talk me through where you are?");
  });

  it("starts the review when the candidate submits", () => {
    const d = mockEngine.decide(turn({
      event: "submit", codingStage: "review",
      testResults: "Examples: 1/2 passed (example 2 failed: expected [1, 2], got [2, 1]).",
    }));
    expect(d.action).toBe("follow_up");
    expect(d.say).toMatch(/example 2/i);
  });

  it("on a re-submit with the same failure, asks for a fix instead of repeating itself", () => {
    const summary = "Examples: 1/2 passed (example 2 failed: expected [1, 2], got [2, 1]).";
    const first = mockEngine.decide(turn({ event: "submit", codingStage: "review", testResults: summary, answer: "Q: Talk me through it.\nA: Hash map." }));
    const again = mockEngine.decide(turn({
      event: "submit", codingStage: "review", testResults: summary,
      answer: `Q: Talk me through it.\nA: Hash map.\nQ: ${first.say}`,
    }));
    expect(again.action).toBe("clarify");
    expect(again.say).toMatch(/submit again/i);
  });

  it("treats a thread that ends with Marcus's line as no new reply", () => {
    const d = mockEngine.decide(turn({ event: "checkin", codingStage: "coding", answer: "Q: Go ahead.\nA: ok\nQ: Go ahead and code it." }));
    expect(d.say).toBe("How's it going — want to talk me through where you are?");
  });

  it("opens a coding question by asking for the approach", () => {
    const d = mockEngine.decide(turn({
      question: next, nextQuestion: coding("q2"), codingStage: "",
      answer: "I'd profile the hot path first. ".repeat(10) + "It cut p99 from 900ms to 120ms.",
    }));
    expect(d.action).toBe("advance");
    expect(d.say).toMatch(/Before you start coding, talk me through your approach\.$/);
  });

  it("stays quiet while the candidate codes", () => {
    const d = mockEngine.decide(turn({ codingStage: "coding", answer: "Now I'm writing the loop." }));
    expect(d.action).toBe("clarify");
  });

  it("asks about the first failing example in review", () => {
    const d = mockEngine.decide(turn({
      codingStage: "review", answer: "I submitted it.",
      testResults: "Examples: 2/3 passed (example 3 failed: expected [0, 1], got [1, 0]). Hidden tests: 8/10 passed.",
    }));
    expect(d.action).toBe("follow_up");
    expect(d.say).toMatch(/example 3/i);
  });

  it("asks about failing hidden tests when the examples pass", () => {
    const d = mockEngine.decide(turn({
      codingStage: "review", answer: "Done.", testResults: "Examples: 3/3 passed. Hidden tests: 8/10 passed.",
    }));
    expect(d.action).toBe("follow_up");
    expect(d.say).toMatch(/hidden/i);
  });

  it("walks a passing solution through complexity, then edge cases, then moves on", () => {
    const passing = "Examples: 3/3 passed. Hidden tests: 10/10 passed.";
    const c = mockEngine.decide(turn({ codingStage: "review", answer: "Submitted.", testResults: passing }));
    expect(c.say).toMatch(/What's the time and space complexity\?/);

    const e = mockEngine.decide(turn({
      codingStage: "review", testResults: passing, followUpCount: 2,
      answer: `Q: ${c.say}\nA: O(n) time, O(n) space.`,
    }));
    expect(e.say).toMatch(/What edge cases would you test\?/);

    const done = mockEngine.decide(turn({
      codingStage: "review", testResults: passing, followUpCount: 3,
      answer: `Q: ${c.say}\nA: O(n).\nQ: ${e.say}\nA: Empty list, duplicates, negatives.`,
    }));
    expect(done.action).toBe("advance");
    expect(done.say).toContain("Prompt for q1.");
  });
});

describe("mockEngine.turn — conduct", () => {
  it("passes ordinary answers through with the same strike count", () => {
    const r = mockEngine.turn(turn({ answer: "Damn, I forgot the base case.", strikes: 1 }));
    expect(r.strikes).toBe(1);
  });

  it("warns, then warns harder, then ends — restating the question", () => {
    const one = mockEngine.turn(turn({ phase: "warmup", answer: "shut up, bot" }));
    expect(one.strikes).toBe(1);
    expect(one.decision.action).toBe("clarify");
    expect(one.decision.say).toBe("Let's keep this professional. So — how are you doing today?");

    const two = mockEngine.turn(turn({ answer: "Q: x\nA: you're an idiot", strikes: 1 }));
    expect(two.strikes).toBe(2);
    expect(two.decision.say).toMatch(/^I'll be straightforward: if that happens again, I'll have to end the interview\./);
    expect(two.decision.say).toMatch(new RegExp(`So, back to the question: ${coding().prompt}$`));

    const three = mockEngine.turn(turn({ answer: "fuck you", strikes: 2 }));
    expect(three.strikes).toBe(3);
    expect(three.decision.action).toBe("end");
    expect(three.decision.say).toBe("I'm going to end the interview here. Take care.");
  });

  it("screens everything after Marcus's last line, and nothing when the thread ends with his line", () => {
    expect(mockEngine.turn(turn({ answer: "Q: x\nA: Fine.\nA: stfu" })).strikes).toBe(1);
    expect(mockEngine.turn(turn({ answer: "Q: x\nA: stfu\nQ: Let's keep this professional.", event: "checkin" })).strikes).toBe(0);
  });

  it("only screens the latest reply, not earlier lines in the thread", () => {
    const r = mockEngine.turn(turn({ answer: "Q: x\nA: stfu\nQ: y\nA: Sorry. I'd sort first.", strikes: 1 }));
    expect(r.strikes).toBe(1);
  });
});

describe("mockEngine — names and coding evaluation", () => {
  it("won't speak an empty or abusive name", () => {
    expect(mockEngine.nameUsable("Karthik")).toBe(true);
    expect(mockEngine.nameUsable("  ")).toBe(false);
    expect(mockEngine.nameUsable("fuck you")).toBe(false);
  });

  it("fails survival when the submitted code fails tests", () => {
    const transcript = "I'd use a hash map. ".repeat(20) + "It runs in O(n) over 10 elements.";
    const failing = mockEngine.evaluate(coding(), transcript, 1, "Examples: 2/3 passed (example 3 failed: expected [0, 1], got [1, 0]).");
    expect(failing.wouldSurviveRealInterview).toBe(false);
    expect(failing.weaknessTags).toContain("failing-tests");
    expect(Object.keys(failing.rubricScores).sort()).toEqual(["code_quality", "communication", "correctness", "efficiency"]);

    const passing = mockEngine.evaluate(coding(), transcript, 1, "Examples: 3/3 passed. Hidden tests: 10/10 passed.");
    expect(passing.weaknessTags).not.toContain("failing-tests");
    expect(passing.rubricScores.correctness).toBeGreaterThan(failing.rubricScores.correctness);
  });
});

describe("mockEngine.aggregate", () => {
  it("leaves memory unchanged when nothing was scored (a session ended early)", () => {
    const prior = {
      candidateId: "c", recurringWeaknesses: [{ tag: "rambling", frequency: 2, lastSeen: "2026-10-01" }],
      improvementTrend: [{ sessionDate: "2026-10-01", avgScore: 2.5 }], strongAreas: ["depth"],
    };
    expect(mockEngine.aggregate([], "2026-10-28", prior)).toEqual(prior);
  });
});
