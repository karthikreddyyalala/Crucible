import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Results } from "./Results";
import { useSessionStore } from "@/stores/sessionStore";
import type { AnswerEvaluation, MemoryProfile, QuestionPlan } from "@/types/contracts";

// jsdom has no IntersectionObserver; motion's in-view animations need one.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

// Captures what each card is given (the card itself has its own tests).
const cardProps = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("@/components/VerdictCard", () => ({
  SURVIVE_HINT: "hint",
  VerdictCard: (props: Record<string, unknown>) => {
    cardProps.push(props);
    return null;
  },
}));

const PLAN: QuestionPlan = {
  sessionId: "s",
  questions: [{ id: "q1", type: "behavioral", prompt: "Tell me about a hard bug.", targetDifficulty: 3, weightedFromWeakness: false }],
};
const MEMORY: MemoryProfile = { candidateId: "c", recurringWeaknesses: [], improvementTrend: [], strongAreas: [] };
const EVAL: AnswerEvaluation = {
  questionId: "q1", transcript: "t", rubricScores: { structure: 2 }, weaknessTags: [], followUpCount: 0,
  wouldSurviveRealInterview: false, survivalReasoning: "Too vague.",
};
const CONDUCT_NOTE = "This session ended early because of the conduct of the conversation.";

function show(evaluations: AnswerEvaluation[], endedForConduct: boolean, updatedMemory: MemoryProfile = MEMORY) {
  useSessionStore.setState({ plan: PLAN, evaluations, endedForConduct, updatedMemory });
  render(<MemoryRouter><Results /></MemoryRouter>);
}

describe("Results after a conduct end", () => {
  it("with no scored answers: says it ended early and shows no score", () => {
    show([], true, { ...MEMORY, improvementTrend: [{ sessionDate: "2026-10-28", avgScore: 3.2 }] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Interview ended early.");
    expect(screen.getByText(CONDUCT_NOTE)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Average score [\d.]+/);
    expect(screen.queryByText("Answer-by-answer")).not.toBeInTheDocument();
  });

  it("with scored answers: keeps the verdict and adds the note", () => {
    show([EVAL], true);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("You held up on 0 of 1 answer.");
    expect(screen.getByText(CONDUCT_NOTE)).toBeInTheDocument();
    expect(screen.getByText("Answer-by-answer")).toBeInTheDocument();
  });

  it("a normal session has no note", () => {
    show([EVAL], false);
    expect(screen.queryByText(CONDUCT_NOTE)).not.toBeInTheDocument();
  });
});

describe("Results takeaway", () => {
  it("leads with how many answers held up and the one next thing to work on", () => {
    show([EVAL, { ...EVAL, questionId: "q1", wouldSurviveRealInterview: true, weaknessTags: ["no-edge-cases"] }], false,
      { ...MEMORY, improvementTrend: [{ sessionDate: "2026-10-28", avgScore: 3.2 }] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("You held up on 1 of 2 answers.");
    expect(screen.getByText("No edge cases is the next thing to work on.")).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Average score 3\.20 \/ 5/);
  });

  it("lists remembered weak spots in plain words under Next to work on", () => {
    useSessionStore.setState({
      plan: PLAN, evaluations: [EVAL], endedForConduct: false,
      updatedMemory: { ...MEMORY, recurringWeaknesses: [{ tag: "vague-impact", frequency: 3, lastSeen: "2026-10-28" }] },
    });
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Next to work on" })).toBeInTheDocument();
    expect(screen.getByText("Vague impact")).toBeInTheDocument();
    expect(screen.getByText("Came up 3 times")).toBeInTheDocument();
    expect(screen.queryByText("vague-impact")).not.toBeInTheDocument();
  });
});

describe("Results coach context", () => {
  it("gives a coding answer's card the session id and the final code", () => {
    const codingPlan: QuestionPlan = {
      sessionId: "s9",
      questions: [{ id: "c1", type: "coding", prompt: "Two sum.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum" }],
    };
    useSessionStore.setState({
      plan: codingPlan, evaluations: [{ ...EVAL, questionId: "c1" }], endedForConduct: false, updatedMemory: MEMORY,
      codeByQuestion: { c1: "def two_sum(): pass" },
    });
    cardProps.length = 0;
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(cardProps.at(-1)).toMatchObject({ sessionId: "s9", code: "def two_sum(): pass", language: "python" });
  });

  it("gives the JavaScript draft and language when the candidate coded in JavaScript", () => {
    const codingPlan: QuestionPlan = {
      sessionId: "s9",
      questions: [{ id: "c1", type: "coding", prompt: "Two sum.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum" }],
    };
    useSessionStore.setState({
      plan: codingPlan, evaluations: [{ ...EVAL, questionId: "c1" }], endedForConduct: false, updatedMemory: MEMORY,
      codeByQuestion: { c1: "def two_sum(): pass", "c1:javascript": "function twoSum() {}" }, codingLanguage: "javascript",
    });
    cardProps.length = 0;
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(cardProps.at(-1)).toMatchObject({ code: "function twoSum() {}", language: "javascript" });
    useSessionStore.setState({ codingLanguage: "python" });
  });

  it("gives each question the language it was solved in", () => {
    const coding = (id: string) =>
      ({ id, type: "coding", prompt: "Code.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum" }) as const;
    useSessionStore.setState({
      plan: { sessionId: "s9", questions: [coding("c1"), coding("c2")] },
      evaluations: [{ ...EVAL, questionId: "c1" }, { ...EVAL, questionId: "c2" }], endedForConduct: false, updatedMemory: MEMORY,
      codeByQuestion: { c1: "def a(): pass", "c1:javascript": "function a() {}", c2: "def b(): pass", "c2:javascript": "function b() {}" },
      languageByQuestion: { c1: "python", c2: "javascript" }, codingLanguage: "javascript",
    });
    cardProps.length = 0;
    render(<MemoryRouter><Results /></MemoryRouter>);
    expect(cardProps.slice(-2)).toMatchObject([
      { code: "def a(): pass", language: "python" },
      { code: "function b() {}", language: "javascript" },
    ]);
    useSessionStore.setState({ codingLanguage: "python", languageByQuestion: {} });
  });
});
