import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
// Mutable so tests can drive the voice: what the mic hears, whether Marcus is talking.
const speech = vi.hoisted(() => ({
  supported: false, listening: false, transcript: "", semantic: false,
  start: vi.fn(), stop: vi.fn(), onTurnEnd: undefined as ((text: string) => boolean) | undefined,
}));
vi.mock("@/hooks/useSpeechInput", () => ({
  useSpeechInput: (_terms: readonly string[], onTurnEnd?: (text: string) => boolean) => {
    speech.onTurnEnd = onTurnEnd;
    return speech;
  },
}));
const voice = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), unlock: vi.fn(), speaking: false, available: true }));
vi.mock("@/hooks/useElevenLabsTTS", () => ({ useElevenLabsTTS: () => voice }));
const backchannel = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn() }));
vi.mock("@/hooks/useBackchannel", () => ({ useBackchannel: () => backchannel }));
const browserVoice = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false, supported: false }));
vi.mock("@/hooks/useSpeechSynthesis", () => ({ useSpeechSynthesis: () => browserVoice }));
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
  starterCodeJs: "function twoSum(nums, target) {}\n",
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
    submitAnswer: vi.fn(async () => true),
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
  Object.assign(speech, { supported: false, listening: false, transcript: "", semantic: false, onTurnEnd: undefined });
  Object.assign(voice, { speaking: false, available: true });
  Object.assign(browserVoice, { speaking: false, supported: false });
});

afterEach(() => {
  vi.useRealTimers();
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

  describe("voice turns", () => {
    const rerender = (view: ReturnType<typeof start>) =>
      view.rerender(
        <MemoryRouter>
          <Interview />
        </MemoryRouter>,
      );
    const voiceOn = () => fireEvent.click(screen.getByTitle("Turn voice on"));
    const submitted = () => useSessionStore.getState().submitAnswer as ReturnType<typeof vi.fn>;

    it("on Flux, sends when the candidate finishes and says a quick mm-hm", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      start(behavioral);
      voiceOn();
      act(() => speech.onTurnEnd?.("We used a queue."));
      expect(submitted()).toHaveBeenCalledWith("We used a queue.");
      expect(backchannel.play).toHaveBeenCalledTimes(1);
      expect(backchannel.unlock).toHaveBeenCalled();
    });

    it("on Flux, a pause alone doesn't send", () => {
      vi.useFakeTimers();
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true, listening: true, transcript: "We used a queue." });
      start(behavioral);
      voiceOn();
      act(() => vi.advanceTimersByTime(3000));
      expect(submitted()).not.toHaveBeenCalled();
    });

    it("without Flux, still sends after the candidate pauses", () => {
      vi.useFakeTimers();
      setScreen(true);
      Object.assign(speech, { supported: true, listening: true, transcript: "I'd use a queue." });
      start(behavioral);
      voiceOn();
      act(() => vi.advanceTimersByTime(2900));
      expect(submitted()).toHaveBeenCalledWith("I'd use a queue.");
    });

    it("no mm-hm during the warmup or for a typed answer", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      const view = start(behavioral, { phase: "warmup" });
      voiceOn();
      act(() => speech.onTurnEnd?.("Hi, I'm doing well."));
      expect(submitted()).toHaveBeenCalledWith("Hi, I'm doing well.");
      view.unmount();

      start(behavioral);
      fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: "Typed answer." } });
      fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
      expect(submitted()).toHaveBeenCalledWith("Typed answer.");
      expect(backchannel.play).not.toHaveBeenCalled();
    });

    it("stops Marcus for a real interruption, not for mm-hm", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true, listening: true });
      voice.speaking = true;
      const view = start(behavioral);
      speech.transcript = "mm-hm";
      rerender(view);
      expect(voice.cancel).not.toHaveBeenCalled();
      speech.transcript = "Sorry, can I clarify something?";
      rerender(view);
      expect(voice.cancel).toHaveBeenCalled();
    });

    it("ignores his own voice ending a turn while he's still talking", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      voice.speaking = true;
      start(behavioral);
      voiceOn();
      act(() => {
        expect(speech.onTurnEnd?.("about a conflict")).toBe(true);
      });
      expect(submitted()).not.toHaveBeenCalled();
    });

    it("drops his own voice leaking back even when the turn ends just after he stops", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true, listening: true });
      voice.speaking = true;
      const view = start(behavioral);
      voiceOn();
      speech.transcript = "Tell me about a";
      rerender(view);
      voice.speaking = false;
      rerender(view);
      act(() => {
        expect(speech.onTurnEnd?.("Tell me about a conflict.")).toBe(true);
      });
      expect(submitted()).not.toHaveBeenCalled();
    });

    it("sends a real answer that began while he was finishing", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true, listening: true });
      voice.speaking = true;
      const view = start(behavioral);
      voiceOn();
      speech.transcript = "Sorry, can I clarify";
      rerender(view);
      voice.speaking = false;
      rerender(view);
      act(() => {
        speech.onTurnEnd?.("Sorry, can I clarify the scope first?");
      });
      expect(submitted()).toHaveBeenCalledWith("Sorry, can I clarify the scope first?");
    });

    it("a real interruption that ends while he talks stops him and is sent", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      voice.speaking = true;
      start(behavioral);
      voiceOn();
      act(() => {
        expect(speech.onTurnEnd?.("Sorry, can I clarify the scope first?")).toBe(true);
      });
      expect(voice.cancel).toHaveBeenCalled();
      expect(submitted()).toHaveBeenCalledWith("Sorry, can I clarify the scope first?");
    });

    it("with voice off, an end of turn only fills the draft", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      start(behavioral);
      act(() => {
        expect(speech.onTurnEnd?.("We used a queue.")).toBe(false);
      });
      expect(submitted()).not.toHaveBeenCalled();
    });

    it("keeps the turn while the composer is locked", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      start(behavioral, { status: "thinking", eventInFlight: false });
      voiceOn();
      act(() => {
        expect(speech.onTurnEnd?.("We used a queue.")).toBe(false);
      });
      expect(submitted()).not.toHaveBeenCalled();
    });

    it("doesn't cut off the browser voice: it isn't echo-cancelled", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true, listening: true });
      Object.assign(browserVoice, { speaking: true, supported: true });
      const view = start(behavioral);
      speech.transcript = "Sorry, can I clarify something?";
      rerender(view);
      expect(browserVoice.cancel).not.toHaveBeenCalled();
    });

    it("opens the mic for Flux only when he starts speaking, and normally when he finishes", () => {
      setScreen(true);
      Object.assign(speech, { supported: true, semantic: true });
      const view = start(behavioral);
      voiceOn();
      speech.start.mockClear();
      voice.speaking = true;
      rerender(view);
      expect(speech.start).toHaveBeenLastCalledWith(true);
      voice.speaking = false;
      rerender(view);
      expect(speech.start).toHaveBeenLastCalledWith();
    });

    it("the mic button never passes the click as an argument", () => {
      setScreen(true);
      Object.assign(speech, { supported: true });
      start(behavioral);
      fireEvent.click(screen.getByRole("button", { name: "Speak your answer" }));
      expect(speech.start).toHaveBeenCalledWith();
    });
  });
});
