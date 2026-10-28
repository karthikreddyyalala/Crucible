import { describe, it, expect } from "vitest";
import { mockEngine } from "./mockEngine";
import type { TurnInput } from "./api";
import type { PlannedQuestion } from "@/types/contracts";

const q = (id: string, type: PlannedQuestion["type"] = "technical"): PlannedQuestion => ({
  id, type, prompt: `Prompt for ${id}.`, targetDifficulty: 3, weightedFromWeakness: false,
});

const turn = (over: Partial<TurnInput>): TurnInput => ({
  question: q("q0"), answer: "", followUpCount: 0, isLast: false, phase: "question",
  nextQuestion: q("q1", "system_design"), candidateName: "Karthik", mode: "full", level: "mid",
  profile: null, ...over,
});

const PRAISE = /\b(good|great|nice|perfect|awesome|excellent)\b/i;

describe("mockEngine.decide — sounds like an interviewer", () => {
  it("answers 'what about you?' in small talk instead of ignoring it", () => {
    const d = mockEngine.decide(turn({ phase: "warmup", answer: "I'm doing great. What about you?", nextQuestion: null }));
    expect(d.action).toBe("advance");
    expect(d.say).toMatch(/thanks for asking/i);
    expect(d.say).toMatch(/background/i);
  });

  it("gives a hint, not praise, when the candidate says 'I don't know'", () => {
    const d = mockEngine.decide(turn({ answer: "I don't know." }));
    expect(d.action).toBe("follow_up");
    expect(d.say).not.toMatch(PRAISE);
    expect(d.say).toMatch(/work through it/i);
  });

  it("moves on honestly after the hints run out, still without praise", () => {
    const d = mockEngine.decide(turn({ answer: "Q: hint\nA: Still no idea, sorry.", followUpCount: 3 }));
    expect(d.action).toBe("advance");
    expect(d.say).not.toMatch(PRAISE);
    expect(d.say).toContain("Prompt for q1.");
  });

  it("re-asks on 'can you repeat that?' without counting a follow-up", () => {
    const d = mockEngine.decide(turn({ answer: "Sorry, can you repeat the question?" }));
    expect(d.action).toBe("clarify");
    expect(d.say).toContain("Prompt for q0.");
  });

  it("asks for the candidate's questions after the last answer, then says goodbye", () => {
    const strong = "I'd profile the hot path first. ".repeat(10) + "It cut p99 from 900ms to 120ms.";
    const last = mockEngine.decide(turn({ answer: strong, isLast: true, nextQuestion: null }));
    expect(last.action).toBe("complete");
    expect(last.say).toMatch(/questions do you have for me/i);

    const bye = mockEngine.decide(turn({ phase: "closing", answer: "No, I think I'm good. Thanks!", nextQuestion: null }));
    expect(bye.action).toBe("complete");
    expect(bye.say).toMatch(/Karthik/);
  });
});

describe("mockEngine.decide — per-type follow-up budget", () => {
  it("allows 6 follow-ups on system design but stops at 3 on behavioral", () => {
    const sd = mockEngine.decide(turn({ question: q("q0", "system_design"), answer: "I don't know.", followUpCount: 5 }));
    expect(sd.action).toBe("follow_up");
    const beh = mockEngine.decide(turn({ question: q("q0", "behavioral"), answer: "I don't know.", followUpCount: 3 }));
    expect(beh.action).not.toBe("follow_up");
  });
});
