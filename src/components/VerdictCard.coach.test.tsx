import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VerdictCard } from "./VerdictCard";
import type { AnswerEvaluation, CoachResponse, PlannedQuestion } from "@/types/contracts";

vi.mock("@/lib/api", () => ({ api: { coachAnswer: vi.fn() } }));
// jsdom has no IntersectionObserver; motion's in-view animations need one.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

const question: PlannedQuestion = {
  id: "q1", type: "coding", prompt: "Two sum.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum",
};
const evaluation: AnswerEvaluation = {
  questionId: "q1", transcript: "Q: Two sum.\nA: Hash map.", rubricScores: { correctness: 2 }, weaknessTags: ["failing-tests"],
  followUpCount: 1, wouldSurviveRealInterview: false, survivalReasoning: "Fails example 2.",
};
const SOLUTION = "def two_sum(nums, target):\n    seen = {}\n    return []";

async function openCoach(response: CoachResponse) {
  const { api } = await import("@/lib/api");
  vi.mocked(api.coachAnswer).mockResolvedValueOnce(response);
  render(<VerdictCard evaluation={evaluation} question={question} index={0} sessionId="s1" code="def two_sum(): pass" />);
  fireEvent.click(screen.getByRole("button", { name: "Show me a strong answer" }));
  await screen.findByText("A clean approach.");
  return api;
}

beforeEach(() => vi.clearAllMocks());

describe("VerdictCard coach panel for a coding answer", () => {
  it("asks with the session id and final code, then shows the clean code with a copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const api = await openCoach({ modelAnswer: "A clean approach.", improvements: [], code: SOLUTION });

    expect(api.coachAnswer).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", code: "def two_sum(): pass" }));
    const block = screen.getByText(/seen = \{\}/);
    expect(block.closest("pre")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SOLUTION));
  });

  it("shows no code block when the coach returns none", async () => {
    await openCoach({ modelAnswer: "A clean approach.", improvements: [] });
    expect(screen.queryByRole("button", { name: "Copy code" })).toBeNull();
    expect(document.querySelector("pre")).toBeNull();
  });
});

describe("VerdictCard key points", () => {
  it("lists what you said under a heading when keyPoints are present", () => {
    render(<VerdictCard evaluation={{ ...evaluation, keyPoints: ["Moved billing to Kafka", "Cut p99 from 900ms to 120ms"] }} question={question} index={0} />);
    expect(screen.getByText("What you said")).toBeTruthy();
    expect(screen.getByText("Moved billing to Kafka")).toBeTruthy();
    expect(screen.getByText("Cut p99 from 900ms to 120ms")).toBeTruthy();
  });

  it("shows no heading for empty or missing keyPoints", () => {
    const { rerender } = render(<VerdictCard evaluation={{ ...evaluation, keyPoints: [] }} question={question} index={0} />);
    expect(screen.queryByText("What you said")).toBeNull();
    rerender(<VerdictCard evaluation={evaluation} question={question} index={0} />);
    expect(screen.queryByText("What you said")).toBeNull();
  });
});

describe("VerdictCard layout", () => {
  it("leads with the verdict and reasoning, and frames tags as next to work on in plain words", () => {
    render(<VerdictCard evaluation={{ ...evaluation, weaknessTags: ["vague-impact", "no_edge_cases"] }} question={question} index={0} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Wouldn't survive a real interview yet");
    expect(screen.getByText("Fails example 2.")).toBeTruthy();
    expect(screen.getByText("Next to work on")).toBeTruthy();
    expect(screen.getByText("Vague impact")).toBeTruthy();
    expect(screen.getByText("No edge cases")).toBeTruthy();
    expect(screen.queryByText("vague-impact")).toBeNull();
  });

  it("keeps scores behind a Details disclosure", () => {
    render(<VerdictCard evaluation={{ ...evaluation, rubricScores: { edge_cases: 2 } }} question={question} index={0} />);
    const details = screen.getByRole("button", { name: "Details" });
    expect(details.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Edge cases")).toBeNull();
    fireEvent.click(details);
    expect(details.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Edge cases")).toBeTruthy();
    expect(screen.getByText(/Follow-up questions asked/)).toBeTruthy();
  });

  it("shows your answer on request", () => {
    render(<VerdictCard evaluation={evaluation} question={question} index={0} />);
    expect(screen.queryByText("Hash map.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Your answer" }));
    expect(screen.getByText("Hash map.")).toBeTruthy();
  });

  it("offers a retry when the strong answer can't be written", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.coachAnswer).mockRejectedValueOnce(new Error("boom"));
    render(<VerdictCard evaluation={evaluation} question={question} index={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Show me a strong answer" }));
    await screen.findByText(/Couldn't write a strong answer just now/);
    expect(screen.queryByText("boom")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
