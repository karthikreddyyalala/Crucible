import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { forwardRef } from "react";
import { api } from "@/lib/api";
import type { PublicProblem } from "@/lib/coding/types";
import type { RunOutcome } from "@/lib/coding/types";
import type { PlannedQuestion } from "@/types/contracts";
import { useSessionStore } from "@/stores/sessionStore";
import { Interview } from "./Interview";

const runner = vi.hoisted(() => ({
  status: "ready",
  progress: "",
  error: null,
  load: vi.fn(),
  run: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/hooks/usePythonRunner", () => ({ usePythonRunner: () => runner }));
vi.mock("@/hooks/useElevenLabsTTS", () => ({
  useElevenLabsTTS: () => ({ speak: vi.fn(), cancel: vi.fn(), unlock: vi.fn(), speaking: false, available: false }),
}));
vi.mock("@/hooks/useSpeechSynthesis", () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false, supported: false }),
}));
vi.mock("@/hooks/useSpeechInput", () => ({
  useSpeechInput: () => ({ supported: false, listening: false, transcript: "", start: vi.fn(), stop: vi.fn() }),
}));
vi.mock("@/hooks/useTavus", () => ({
  useTavus: () => ({
    activate: vi.fn(), deactivate: vi.fn(), speak: vi.fn(), status: "idle", ready: false, speaking: false, videoTrack: null,
  }),
}));
// CodeMirror needs layout APIs jsdom lacks; a textarea stands in for it.
vi.mock("@/components/coding/CodeEditor", () => ({
  CodeEditor: forwardRef<unknown, { initialValue: string; onChange: (code: string) => void }>(function FakeEditor(
    { initialValue, onChange },
    _ref,
  ) {
    return <textarea aria-label="Python code editor" defaultValue={initialValue} onChange={(e) => onChange(e.target.value)} />;
  }),
}));

const problem = {
  id: "code-two-sum",
  title: "Two Sum",
  difficulty: "easy",
  topics: ["array", "hash map"],
  statement: "Find two numbers that add up to `target`.",
  signature: "def two_sum(nums, target):",
  starterCode: "def two_sum(nums, target):\n    pass\n",
  functionName: "two_sum",
  kind: "function",
  compare: "exact",
  visibleTestCount: 1,
  examples: [{ input: "nums = [3, 8], target = 11", output: "[0, 1]", explanation: "" }],
  tests: [{ args: [[3, 8], 11], expected: [0, 1] }],
} as PublicProblem;

const coding: PlannedQuestion = {
  id: "q1", type: "coding", prompt: "Let's do a coding problem.", targetDifficulty: 2, weightedFromWeakness: false,
  exemplarId: "code-two-sum",
};
const behavioral: PlannedQuestion = {
  id: "q1", type: "behavioral", prompt: "Tell me about a conflict.", targetDifficulty: 2, weightedFromWeakness: false,
};

const recordRun = vi.fn();
const setCode = vi.fn();

function setScreen(wide: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("min-width") ? wide : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function start(question: PlannedQuestion, extra: Partial<ReturnType<typeof useSessionStore.getState>> = {}) {
  useSessionStore.setState({
    status: "live",
    phase: "question",
    plan: { sessionId: "s1", questions: [question] },
    currentIdx: 0,
    followUpCount: 0,
    messages: [{ id: "m1", speaker: "interviewer", kind: "question", text: question.prompt, questionId: question.id }],
    codingStage: "approach",
    codeByQuestion: {},
    checkinSent: {},
    justRestored: false,
    turnError: null,
    useVideo: false,
    recordRun,
    setCode,
    ...extra,
  });
  return render(
    <MemoryRouter>
      <Interview />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(api, "getProblem").mockResolvedValue(problem);
});

describe("Interview", () => {
  it("opens the coding workspace for a coding question on a wide screen", async () => {
    setScreen(true);
    start(coding);
    expect(await screen.findByRole("heading", { name: "Two Sum" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Run/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Submit/ })).toBeInTheDocument();
    expect(screen.getByText("Stage 1 of 3: Approach")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
    expect(screen.getByText("Let's do a coding problem.")).toBeInTheDocument();
  });

  it("seeds the editor from saved code without counting it as an edit, and saves real edits", async () => {
    setScreen(true);
    start(coding, { codeByQuestion: { q1: "def two_sum(nums, target):\n    return [0, 1]\n" } });
    const editor = (await screen.findByRole("textbox", { name: "Python code editor" })) as HTMLTextAreaElement;
    expect(editor.value).toContain("return [0, 1]");
    expect(setCode).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: "x = 1" } });
    expect(setCode).toHaveBeenCalledWith("q1", "x = 1");
  });

  it("runs the examples, then submits every test", async () => {
    setScreen(true);
    const outcome: RunOutcome = {
      kind: "results",
      results: [{ index: 0, passed: true, got: [0, 1], expected: [0, 1], error: null, stdout: "", ms: 0 }],
    };
    runner.run.mockResolvedValue(outcome);
    start(coding);
    await screen.findByRole("textbox", { name: "Python code editor" });

    fireEvent.click(screen.getByRole("button", { name: /^Run/ }));
    await waitFor(() => expect(recordRun).toHaveBeenCalledWith("q1", outcome, "run", 1));
    expect(runner.run).toHaveBeenLastCalledWith(problem.starterCode, problem, true);
    expect(await screen.findByText("1 of 1 examples passed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Submit/ }));
    await waitFor(() => expect(recordRun).toHaveBeenCalledWith("q1", outcome, "submit", 1));
    expect(runner.run).toHaveBeenLastCalledWith(problem.starterCode, problem, false);
  });

  it("shows the problem and a calm notice instead of the editor on a small screen", async () => {
    setScreen(false);
    start(coding);
    expect(await screen.findByRole("heading", { name: "Two Sum" })).toBeInTheDocument();
    expect(
      screen.getByText("The code editor needs a larger screen. You can still talk through your solution with Marcus."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Run/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeInTheDocument();
  });

  it("keeps the composer open while Marcus handles a check-in or Submit", async () => {
    setScreen(true);
    start(coding, { status: "thinking", eventInFlight: true });
    const composer = await screen.findByRole("textbox", { name: "Your answer" });
    expect(composer).toBeEnabled();
    expect(composer).toHaveAttribute("placeholder", "Marcus is looking at your run. You can keep typing.");
  });

  it("locks the composer while Marcus answers the candidate's own message", async () => {
    setScreen(true);
    start(coding, { status: "thinking", eventInFlight: false });
    const composer = await screen.findByRole("textbox", { name: "Your answer" });
    expect(composer).toBeDisabled();
    expect(composer).toHaveAttribute("placeholder", "Interviewer is thinking…");
  });

  it("tells the store whether the editor is on screen, so Marcus knows to talk it through", async () => {
    setScreen(false);
    const view = start(coding, { editorShown: true });
    await screen.findByText(/The code editor needs a larger screen/);
    expect(useSessionStore.getState().editorShown).toBe(false);
    view.unmount();

    setScreen(true);
    start(coding, { editorShown: false });
    await screen.findByRole("button", { name: /^Run/ });
    expect(useSessionStore.getState().editorShown).toBe(true);
  });

  it("keeps the classic chat for other questions", () => {
    setScreen(true);
    start(behavioral);
    expect(screen.getByText("BEHAVIORAL")).toBeInTheDocument();
    expect(screen.getByText("Tell me about a conflict.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Run/ })).toBeNull();
    expect(screen.queryByText(/Stage \d of 3/)).toBeNull();
    expect(api.getProblem).not.toHaveBeenCalled();
  });

  describe("answer length", () => {
    const type = (text: string) =>
      fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: text } });

    it("stays quiet under 5,000 characters, then shows a counter", () => {
      setScreen(true);
      start(behavioral);
      type("a".repeat(5000));
      expect(screen.queryByText(/\/ 6,000$/)).toBeNull();
      type("a".repeat(5412));
      expect(screen.getByText("5,412 / 6,000")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send answer" })).toBeEnabled();
    });

    it("won't send an answer over 6,000 characters, and says why", () => {
      setScreen(true);
      const submitAnswer = vi.fn().mockResolvedValue(true);
      start(behavioral, { submitAnswer });
      type("a".repeat(6001));
      expect(screen.getByText("Keep each answer under 6,000 characters.")).toBeInTheDocument();
      expect(screen.getByText("6,001 / 6,000")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Your answer" }), { key: "Enter", metaKey: true });
      expect(submitAnswer).not.toHaveBeenCalled();
    });

    it("sends an answer right at the limit", () => {
      setScreen(true);
      const submitAnswer = vi.fn().mockResolvedValue(true);
      start(behavioral, { submitAnswer });
      type("a".repeat(6000));
      fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
      expect(submitAnswer).toHaveBeenCalledWith("a".repeat(6000));
    });
  });
});
