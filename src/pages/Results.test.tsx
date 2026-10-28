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

function show(evaluations: AnswerEvaluation[], endedForConduct: boolean) {
  useSessionStore.setState({ plan: PLAN, evaluations, endedForConduct, updatedMemory: MEMORY });
  render(<MemoryRouter><Results /></MemoryRouter>);
}

describe("Results after a conduct end", () => {
  it("with no scored answers: says it ended early and shows no score", () => {
    show([], true);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Interview ended early.");
    expect(screen.getByText(CONDUCT_NOTE)).toBeInTheDocument();
    expect(screen.queryByText("SESSION AVG")).not.toBeInTheDocument();
    expect(screen.queryByText(/Strong run/)).not.toBeInTheDocument();
    expect(screen.queryByText("Answer-by-answer")).not.toBeInTheDocument();
  });

  it("with scored answers: keeps the verdict and adds the note", () => {
    show([EVAL], true);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This wouldn't survive yet.");
    expect(screen.getByText(CONDUCT_NOTE)).toBeInTheDocument();
    expect(screen.getByText("Answer-by-answer")).toBeInTheDocument();
  });

  it("a normal session has no note", () => {
    show([EVAL], false);
    expect(screen.queryByText(CONDUCT_NOTE)).not.toBeInTheDocument();
  });
});
