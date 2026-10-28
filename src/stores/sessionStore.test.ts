import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSessionStore } from "./sessionStore";
import type { TurnResult } from "@/lib/api";
import type { AnswerEvaluation, IntakeProfile, QuestionPlan, InterviewDecision, MemoryProfile } from "@/types/contracts";
import type { TestResult } from "@/lib/coding/types";

// ---- Mocks ----------------------------------------------------------------

vi.mock("@/lib/api", () => ({
  api: {
    submitAnswer: vi.fn(),
    evaluateAnswer: vi.fn(),
    startSession: vi.fn(),
    getMemory: vi.fn(),
    finalizeSession: vi.fn(),
  },
}));

vi.mock("@/lib/identity", () => ({
  getCandidateId: () => "test-candidate-id",
}));

// ---- Fixtures -------------------------------------------------------------

const MOCK_PLAN: QuestionPlan = {
  sessionId: "test-session",
  questions: [
    {
      id: "q1",
      type: "behavioral",
      prompt: "Tell me about a time you had to debug a critical production issue.",
      targetDifficulty: 3,
      weightedFromWeakness: false,
    },
    {
      id: "q2",
      type: "technical",
      prompt: "Walk me through how a hash map works under the hood.",
      targetDifficulty: 3,
      weightedFromWeakness: false,
    },
  ],
};

const FOLLOW_UP_DECISION: InterviewDecision = {
  action: "follow_up",
  followUpPrompt: "What was the measurable impact?",
  currentQuestionId: "q1",
};

const ADVANCE_DECISION: InterviewDecision = {
  action: "advance",
  followUpPrompt: null,
  currentQuestionId: "q1",
};

const COMPLETE_DECISION: InterviewDecision = {
  action: "complete",
  followUpPrompt: null,
  currentQuestionId: "q2",
};

const MOCK_EVALUATION: AnswerEvaluation = {
  questionId: "q2",
  transcript: "My final answer.",
  rubricScores: { structure: 4, specificity: 3, impact: 4, ownership: 3 },
  weaknessTags: [],
  followUpCount: 0,
  wouldSurviveRealInterview: true,
  survivalReasoning: "Concrete example with measurable outcome.",
};

const MOCK_MEMORY: MemoryProfile = {
  candidateId: "test-candidate-id",
  recurringWeaknesses: [],
  improvementTrend: [{ sessionDate: "2026-09-03", avgScore: 3.5 }],
  strongAreas: ["debugging"],
};

function seedLiveSession() {
  useSessionStore.setState({
    status: "live",
    phase: "question",
    pendingEvals: [],
    role: "sde",
    profile: null,
    plan: MOCK_PLAN,
    currentIdx: 0,
    followUpCount: 0,
    messages: [],
    evaluations: [],
    priorMemory: null,
    updatedMemory: null,
    justRestored: false,
    turnError: null,
  });
}

// ---- Tests ----------------------------------------------------------------

describe("sessionStore — turnError", () => {
  beforeEach(async () => {
    // Dynamically import after mocks are registered so vi.mock is applied
    const { api } = await import("@/lib/api");
    vi.mocked(api.submitAnswer).mockReset();
    vi.mocked(api.finalizeSession).mockReset();
    vi.mocked(api.evaluateAnswer).mockReset();
    vi.mocked(api.evaluateAnswer).mockImplementation(async ({ question }) => ({
      evaluation: { ...MOCK_EVALUATION, questionId: question.id },
      costUsd: 0,
    }));

    useSessionStore.setState({
      status: "idle",
      role: "",
      profile: null,
      plan: null,
      currentIdx: 0,
      followUpCount: 0,
      messages: [],
      evaluations: [],
      priorMemory: null,
      updatedMemory: null,
      justRestored: false,
      turnError: null,
    });
  });

  describe("clearTurnError", () => {
    it("sets turnError to null", () => {
      useSessionStore.setState({ turnError: "Something exploded." });
      useSessionStore.getState().clearTurnError();
      expect(useSessionStore.getState().turnError).toBeNull();
    });

    it("is a no-op when turnError is already null", () => {
      useSessionStore.setState({ turnError: null });
      useSessionStore.getState().clearTurnError();
      expect(useSessionStore.getState().turnError).toBeNull();
    });
  });

  describe("submitAnswer — network failure", () => {
    it("sets turnError to the error message when api.submitAnswer throws", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce(
        new Error("Request failed (503)")
      );

      await useSessionStore.getState().submitAnswer("I used a binary search.");

      expect(useSessionStore.getState().turnError).toBe(
        "Request failed (503)"
      );
    });

    it("falls back to a generic message for non-Error throws", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce("just a string error");

      await useSessionStore.getState().submitAnswer("My answer.");

      expect(useSessionStore.getState().turnError).toBe(
        "Request failed — please try again."
      );
    });

    it("restores status to 'live' after a failed turn", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce(new Error("timeout"));

      await useSessionStore.getState().submitAnswer("My answer.");

      expect(useSessionStore.getState().status).toBe("live");
    });

    it("rolls back the optimistically-added candidate message on failure", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce(new Error("network"));

      await useSessionStore.getState().submitAnswer("Some response.");

      // The candidate message should NOT appear — it was rolled back.
      const msgs = useSessionStore.getState().messages;
      expect(msgs.every((m) => m.speaker !== "candidate")).toBe(true);
    });

    it("does not advance the question index on failure", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce(new Error("error"));

      await useSessionStore.getState().submitAnswer("answer");

      expect(useSessionStore.getState().currentIdx).toBe(0);
    });
  });

  describe("submitAnswer — successful turn clears prior error", () => {
    it("sets turnError to null when a subsequent submission succeeds", async () => {
      seedLiveSession();
      useSessionStore.setState({ turnError: "previous error" });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: FOLLOW_UP_DECISION,
        costUsd: 0,
      });

      await useSessionStore.getState().submitAnswer("retried answer");

      expect(useSessionStore.getState().turnError).toBeNull();
    });

    it("clears turnError at the start of a new submission even before the API responds", async () => {
      seedLiveSession();
      useSessionStore.setState({ turnError: "stale error" });
      const { api } = await import("@/lib/api");

      // Resolve on the next tick so we can inspect state mid-flight.
      let resolveCall!: (v: TurnResult) => void;
      vi.mocked(api.submitAnswer).mockReturnValueOnce(
        new Promise<TurnResult>((r) => { resolveCall = r; })
      );

      const submitPromise = useSessionStore.getState().submitAnswer("answer");

      // Immediately after submitAnswer is called, status is "thinking" and
      // turnError should already be cleared.
      expect(useSessionStore.getState().turnError).toBeNull();
      expect(useSessionStore.getState().status).toBe("thinking");

      // Let the API call resolve so we don't leak an unresolved promise.
      resolveCall({ decision: FOLLOW_UP_DECISION, costUsd: 0 });
      await submitPromise;
    });
  });

  describe("submitAnswer — advance action", () => {
    it("increments currentIdx on an advance decision", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: ADVANCE_DECISION,
        costUsd: 0,
      });

      await useSessionStore.getState().submitAnswer("My answer.");

      expect(useSessionStore.getState().currentIdx).toBe(1);
      expect(useSessionStore.getState().status).toBe("live");
    });
  });

  describe("submitAnswer — finalize failure (session/finalize 503, etc.)", () => {
    function seedFinalQuestionSession() {
      useSessionStore.setState({
        status: "live",
        role: "sde",
        mode: "full",
        level: "mid",
        profile: null,
        plan: MOCK_PLAN,
        phase: "closing", // candidate's questions done — the decision below ends the session
        pendingEvals: [],
        currentIdx: 1,
        followUpCount: 0,
        messages: [],
        evaluations: [],
        priorMemory: null,
        updatedMemory: null,
        justRestored: false,
        turnError: null,
      });
    }

    it("surfaces a retryable error instead of leaving the session silently stuck", async () => {
      seedFinalQuestionSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: COMPLETE_DECISION,
        costUsd: 0,
      });
      vi.mocked(api.finalizeSession).mockRejectedValueOnce(new Error("Request failed (503)"));

      // The bug: today nothing catches this rejection, so it either propagates
      // as an unhandled rejection out of submitAnswer, or (once fixed) resolves
      // cleanly with the failure surfaced in state instead.
      await expect(
        useSessionStore.getState().submitAnswer("My final answer.")
      ).resolves.toBeUndefined();

      const s = useSessionStore.getState();
      // Never silently pretend success.
      expect(s.status).not.toBe("complete");
      // The failure must be visible to the user, not swallowed.
      expect(s.turnError).toBe("Request failed (503)");
      // No memory update should be recorded from a failed finalize.
      expect(s.updatedMemory).toBeNull();
    });

    it("falls back to a generic message when finalizeSession rejects with a non-Error", async () => {
      seedFinalQuestionSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: COMPLETE_DECISION,
        costUsd: 0,
      });
      vi.mocked(api.finalizeSession).mockRejectedValueOnce("just a string error");

      await useSessionStore.getState().submitAnswer("My final answer.");

      expect(useSessionStore.getState().turnError).toBe(
        "Request failed — please try again."
      );
    });
  });

  describe("retryFinalize", () => {
    function seedWrappingWithError() {
      useSessionStore.setState({
        status: "wrapping",
        phase: "closing",
        pendingEvals: [],
        role: "sde",
        mode: "full",
        level: "mid",
        profile: null,
        plan: MOCK_PLAN,
        currentIdx: 1,
        followUpCount: 0,
        messages: [],
        evaluations: [MOCK_EVALUATION],
        priorMemory: null,
        updatedMemory: null,
        justRestored: false,
        turnError: "Request failed (503)",
      });
    }

    it("retries finalizeSession and completes the session on success", async () => {
      seedWrappingWithError();
      const { api } = await import("@/lib/api");
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);

      await useSessionStore.getState().retryFinalize();

      const s = useSessionStore.getState();
      expect(s.status).toBe("complete");
      expect(s.turnError).toBeNull();
      expect(s.updatedMemory).toEqual(MOCK_MEMORY);
    });

    it("surfaces the error again if the retry also fails", async () => {
      seedWrappingWithError();
      const { api } = await import("@/lib/api");
      vi.mocked(api.finalizeSession).mockRejectedValueOnce(new Error("still down"));

      await useSessionStore.getState().retryFinalize();

      const s = useSessionStore.getState();
      expect(s.status).not.toBe("complete");
      expect(s.turnError).toBe("still down");
    });

    it("is a no-op when not in the wrapping state", async () => {
      seedFinalQuestionSession(); // status: "live"
      const { api } = await import("@/lib/api");

      await useSessionStore.getState().retryFinalize();

      expect(api.finalizeSession).not.toHaveBeenCalled();
    });

    function seedFinalQuestionSession() {
      useSessionStore.setState({
        status: "live",
        plan: MOCK_PLAN,
        currentIdx: 1,
        evaluations: [],
        turnError: null,
      });
    }

    it("ignores a second retryFinalize call while one is already in flight (no duplicate finalize)", async () => {
      seedWrappingWithError();
      const { api } = await import("@/lib/api");
      let resolveCall!: (v: MemoryProfile) => void;
      vi.mocked(api.finalizeSession).mockReturnValueOnce(
        new Promise<MemoryProfile>((r) => { resolveCall = r; })
      );

      // Two near-simultaneous clicks of the RETRY button — the backend's
      // finalize is not idempotent for duplicate identical calls (it re-runs
      // the Memory Agent merge and writes each time), so a second in-flight
      // call must be a no-op, not a second network request.
      const first = useSessionStore.getState().retryFinalize();
      const second = useSessionStore.getState().retryFinalize();

      resolveCall(MOCK_MEMORY);
      await Promise.all([first, second]);

      expect(api.finalizeSession).toHaveBeenCalledTimes(1);
      expect(useSessionStore.getState().status).toBe("complete");
    });

    it("exposes a finalizing flag that is true only while the call is in flight", async () => {
      seedWrappingWithError();
      const { api } = await import("@/lib/api");
      let resolveCall!: (v: MemoryProfile) => void;
      vi.mocked(api.finalizeSession).mockReturnValueOnce(
        new Promise<MemoryProfile>((r) => { resolveCall = r; })
      );

      expect(useSessionStore.getState().finalizing).toBe(false);
      const promise = useSessionStore.getState().retryFinalize();
      expect(useSessionStore.getState().finalizing).toBe(true);

      resolveCall(MOCK_MEMORY);
      await promise;

      expect(useSessionStore.getState().finalizing).toBe(false);
    });
  });

  describe("persistence — a failed finalize must not look like a successful one after reload", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    function readPersisted(): { state: Record<string, unknown> } {
      const raw = localStorage.getItem("crucible.session.v1");
      expect(raw).not.toBeNull();
      return JSON.parse(raw!);
    }

    it("does not persist status as 'complete' when wrapping ended in a finalize error", async () => {
      useSessionStore.setState({
        status: "live",
        role: "sde",
        mode: "full",
        level: "mid",
        profile: null,
        plan: MOCK_PLAN,
        phase: "closing",
        pendingEvals: [],
        currentIdx: 1,
        followUpCount: 0,
        messages: [],
        evaluations: [],
        priorMemory: null,
        updatedMemory: null,
        justRestored: false,
        turnError: null,
      });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: COMPLETE_DECISION,
        costUsd: 0,
      });
      vi.mocked(api.finalizeSession).mockRejectedValueOnce(new Error("Request failed (503)"));

      await useSessionStore.getState().submitAnswer("My final answer.");

      // Sanity: the in-memory store is in the expected failed-wrapping state.
      expect(useSessionStore.getState().status).toBe("wrapping");
      expect(useSessionStore.getState().turnError).toBe("Request failed (503)");

      // The bug: partialize unconditionally remaps "wrapping" -> "complete"
      // on every write, and never persists turnError — so a reload after a
      // failed finalize would rehydrate as a normal completed session (the
      // "status === complete" effect fires and navigates to /results) with
      // no error and no way to retry. That's silently WRONG, not just stuck.
      const persisted = readPersisted();
      expect(persisted.state.status).not.toBe("complete");
      expect(persisted.state.turnError).toBe("Request failed (503)");
    });

    it("still persists status as 'complete' when finalize actually succeeded", async () => {
      useSessionStore.setState({
        status: "live",
        role: "sde",
        mode: "full",
        level: "mid",
        profile: null,
        plan: MOCK_PLAN,
        phase: "closing",
        pendingEvals: [],
        currentIdx: 1,
        followUpCount: 0,
        messages: [],
        evaluations: [],
        priorMemory: null,
        updatedMemory: null,
        justRestored: false,
        turnError: null,
      });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce({
        decision: COMPLETE_DECISION,
        costUsd: 0,
      });
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);

      await useSessionStore.getState().submitAnswer("My final answer.");

      expect(useSessionStore.getState().status).toBe("complete");
      const persisted = readPersisted();
      expect(persisted.state.status).toBe("complete");
    });

    it("accumulates costUsd from start and every turn, then echoes the total to finalize", async () => {
      const { api } = await import("@/lib/api");
      vi.mocked(api.getMemory).mockResolvedValueOnce({
        candidateId: "test-candidate-id",
        recurringWeaknesses: [],
        improvementTrend: [],
        strongAreas: [],
      });
      vi.mocked(api.startSession).mockResolvedValueOnce({
        profile: {
          candidateSkills: [],
          yearsExperience: 3,
          projectHighlights: [],
          targetRole: "sde",
          jdRequirements: [],
          resumeToJdGaps: [],
        },
        plan: MOCK_PLAN,
        costUsd: 0.01,
      });
      await useSessionStore.getState().start({
        resumeText: "resume", jdText: "jd", role: "sde", mode: "full", level: "mid",
        candidateName: "Karthik", useVideo: false, companyStyle: "general",
      });
      expect(useSessionStore.getState().sessionCostUsd).toBeCloseTo(0.01);

      // warm-up → background → Q1 (advance) → Q2 (resolved → closing) → closing (complete)
      for (const [decision, costUsd] of [
        [ADVANCE_DECISION, 0.01],
        [ADVANCE_DECISION, 0.01],
        [ADVANCE_DECISION, 0.02],
        [COMPLETE_DECISION, 0.02],
        [COMPLETE_DECISION, 0.01],
      ] as const) {
        vi.mocked(api.submitAnswer).mockResolvedValueOnce({ decision, costUsd });
      }
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);
      for (const reply of ["Doing well.", "I build backends.", "A real answer.", "Final answer.", "No questions, thanks."]) {
        await useSessionStore.getState().submitAnswer(reply);
      }

      expect(useSessionStore.getState().sessionCostUsd).toBeCloseTo(0.08);
      expect(vi.mocked(api.finalizeSession)).toHaveBeenCalledWith(
        expect.objectContaining({ costUsd: expect.closeTo(0.08),
          evaluations: [expect.objectContaining({ questionId: "q1" }), expect.objectContaining({ questionId: "q2" })],
        })
      );
    });
  });

  describe("conversation stages", () => {
    function seedWarmup() {
      useSessionStore.setState({
        status: "live",
        phase: "warmup",
        pendingEvals: [],
        mode: "full",
        level: "mid",
        plan: MOCK_PLAN,
        currentIdx: 0,
        followUpCount: 0,
        messages: [
          { id: "g", speaker: "interviewer", kind: "question", text: "Hi Karthik, how are you?", questionId: "intro" },
        ],
        evaluations: [],
        turnError: null,
      });
    }

    const say = (action: InterviewDecision["action"], text: string): TurnResult => ({
      decision: { action, followUpPrompt: null, currentQuestionId: "q1", say: text },
      costUsd: 0,
    });

    it("sends small talk to the interviewer and speaks its reply instead of a script", async () => {
      seedWarmup();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(say("advance", "I'm well, thanks for asking. Tell me about yourself."));

      await useSessionStore.getState().submitAnswer("I'm doing great. What about you?");

      const s = useSessionStore.getState();
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({ phase: "warmup", nextQuestion: null });
      expect(s.phase).toBe("background");
      expect(s.evaluations).toHaveLength(0);
      expect(s.messages.at(-1)?.text).toBe("I'm well, thanks for asking. Tell me about yourself.");
      expect(s.messages.filter((m) => m.speaker === "candidate")[0].questionId).toBe("intro");
    });

    it("moves from background into Q1, passing Q1 as the next question", async () => {
      seedWarmup();
      useSessionStore.setState({ phase: "background" });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(say("advance", "The Kafka migration sounds fun. So — debugging."));

      await useSessionStore.getState().submitAnswer("I've spent 4 years on payments infra.");

      const s = useSessionStore.getState();
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({ phase: "background", nextQuestion: MOCK_PLAN.questions[0] });
      expect(s.phase).toBe("question");
      expect(s.messages.at(-1)?.questionId).toBe("q1");
      expect(api.evaluateAnswer).not.toHaveBeenCalled();
    });

    it("answers a clarifying question without counting a follow-up or scoring", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(say("clarify", "Sure — assume a single region."));

      await useSessionStore.getState().submitAnswer("Can I assume a single region?");

      const s = useSessionStore.getState();
      expect(s.followUpCount).toBe(0);
      expect(s.currentIdx).toBe(0);
      expect(api.evaluateAnswer).not.toHaveBeenCalled();
    });

    it("scores a resolved answer in the background and enters closing after the last question", async () => {
      seedLiveSession();
      useSessionStore.setState({ currentIdx: 1 });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(say("complete", "That's all I had. What questions do you have for me?"));

      await useSessionStore.getState().submitAnswer("My last answer.");

      const s = useSessionStore.getState();
      expect(s.phase).toBe("closing");
      expect(s.status).toBe("live");
      expect(api.evaluateAnswer).toHaveBeenCalledWith(expect.objectContaining({ question: MOCK_PLAN.questions[1] }));
      expect(api.finalizeSession).not.toHaveBeenCalled();
    });

    it("endInterview finalizes once pending evaluations are scored", async () => {
      seedLiveSession();
      useSessionStore.setState({ phase: "closing", pendingEvals: [{ question: MOCK_PLAN.questions[1], transcript: "t", followUpCount: 0 }] });
      const { api } = await import("@/lib/api");
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);

      await useSessionStore.getState().endInterview();

      expect(api.evaluateAnswer).toHaveBeenCalledTimes(1);
      expect(api.finalizeSession).toHaveBeenCalledWith(expect.objectContaining({ evaluations: [MOCK_EVALUATION] }));
      expect(useSessionStore.getState().status).toBe("complete");
    });
  });

  describe("start — clears stale finalize-error state from a prior session", () => {
    // turnError is persisted to localStorage as of the finalize-error fix
    // above (finalizing is not persisted, always rehydrates false). Without
    // resetting turnError here, a leftover
    // "Request failed (503)" from a previous session's failed finalize would
    // otherwise bleed into the error banner of a brand-new session.
    it("resets turnError and finalizing when starting a new session", async () => {
      useSessionStore.setState({ turnError: "stale finalize error", finalizing: true });
      const { api } = await import("@/lib/api");
      vi.mocked(api.getMemory).mockResolvedValue({
        candidateId: "test-candidate-id",
        recurringWeaknesses: [],
        improvementTrend: [],
        strongAreas: [],
      });
      vi.mocked(api.startSession).mockResolvedValueOnce({
        profile: {
          candidateSkills: [],
          yearsExperience: 3,
          projectHighlights: [],
          targetRole: "sde",
          jdRequirements: [],
          resumeToJdGaps: [],
        },
        plan: MOCK_PLAN,
        costUsd: 0,
      });

      await useSessionStore.getState().start({
        resumeText: "resume",
        jdText: "jd",
        role: "sde",
        mode: "full",
        level: "mid",
        candidateName: "Karthik",
        useVideo: false,
        companyStyle: "general",
      });

      const s = useSessionStore.getState();
      expect(s.turnError).toBeNull();
      expect(s.finalizing).toBe(false);
    });
  });

  // ---- Phase 1: conduct, company style, coding round ----------------------

  const CODING_PLAN: QuestionPlan = {
    sessionId: "coding-session",
    questions: [
      { id: "c1", type: "coding", prompt: "Let's do a coding problem: two sum.", targetDifficulty: 2, weightedFromWeakness: false, exemplarId: "code-two-sum" },
      { id: "c2", type: "coding", prompt: "Let's do a coding problem: group anagrams.", targetDifficulty: 3, weightedFromWeakness: false, exemplarId: "code-group-anagrams" },
    ],
  };

  const PROFILE: IntakeProfile = {
    candidateSkills: [], yearsExperience: 3, projectHighlights: [], targetRole: "sde", jdRequirements: [], resumeToJdGaps: [],
  };

  const reply = (action: InterviewDecision["action"], say: string, strikes?: number): TurnResult => ({
    decision: { action, followUpPrompt: null, currentQuestionId: "x", say },
    costUsd: 0,
    strikes,
  });

  const passed = (index: number, ok = true): TestResult =>
    ({ index, passed: ok, got: ok ? [0, 1] : [1, 0], expected: [0, 1], error: null, stdout: "", ms: 1 });

  function seedCoding(over: Record<string, unknown> = {}) {
    useSessionStore.setState({
      status: "live", phase: "question", mode: "coding", level: "mid", plan: CODING_PLAN, profile: null,
      currentIdx: 0, followUpCount: 0, pendingEvals: [], messages: [], evaluations: [], turnError: null,
      strikes: 0, endedForConduct: false, companyStyle: "google", nameUsable: true, candidateName: "Karthik",
      codeByQuestion: {}, codingStage: "approach", lastRun: {}, checkinSent: {},
      ...over,
    });
  }

  describe("start — name and company style", () => {
    async function startWith(nameUsable: boolean | undefined, candidateName = "Karthik") {
      const { api } = await import("@/lib/api");
      vi.mocked(api.getMemory).mockResolvedValue(MOCK_MEMORY);
      vi.mocked(api.startSession).mockResolvedValueOnce({ profile: PROFILE, plan: MOCK_PLAN, costUsd: 0, nameUsable });
      await useSessionStore.getState().start({
        resumeText: "r", jdText: "j", role: "sde", mode: "coding", level: "mid", candidateName, useVideo: false, companyStyle: "amazon",
      });
      return api;
    }

    it("sends the name and company style, and greets by name when it's usable", async () => {
      const api = await startWith(true);
      expect(vi.mocked(api.startSession).mock.lastCall?.[0]).toMatchObject({ candidateName: "Karthik", companyStyle: "amazon" });
      const s = useSessionStore.getState();
      expect(s.companyStyle).toBe("amazon");
      expect(s.nameUsable).toBe(true);
      expect(s.messages[0].text).toMatch(/^Hi Karthik, I'm Marcus/);
    });

    it("leaves a flagged name out of the greeting and out of every turn", async () => {
      const api = await startWith(false, "Slurname Smith");
      expect(useSessionStore.getState().messages[0].text).toMatch(/^Hi, I'm Marcus/);
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("advance", "Walk me through your background."));
      await useSessionStore.getState().submitAnswer("Doing well.");
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0].candidateName).toBe("");
    });

    it("still uses the name when an older server doesn't say", async () => {
      await startWith(undefined);
      expect(useSessionStore.getState().messages[0].text).toMatch(/^Hi Karthik/);
    });

    it("clears the previous session's strikes, code and runs", async () => {
      useSessionStore.setState({
        strikes: 2, endedForConduct: true, codeByQuestion: { c1: "x" }, codingStage: "review",
        lastRun: { c1: { visiblePassed: 0, visibleTotal: 0, hiddenPassed: 0, hiddenTotal: 0, summary: "s" } },
        checkinSent: { c1: true },
      });
      await startWith(true);
      expect(useSessionStore.getState()).toMatchObject({
        strikes: 0, endedForConduct: false, codeByQuestion: {}, codingStage: "approach", lastRun: {}, checkinSent: {},
      });
    });
  });

  describe("conduct strikes", () => {
    it("sends the strike count and company style with every turn", async () => {
      seedCoding({ strikes: 1 });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("follow_up", "Why a hash map?", 1));
      await useSessionStore.getState().submitAnswer("I'd use a hash map.");
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({ strikes: 1, companyStyle: "google" });
    });

    it("keeps the warmup phase on a struck turn, drops the candidate's line and shows Marcus's reply", async () => {
      useSessionStore.setState({
        status: "live", phase: "warmup", plan: MOCK_PLAN, currentIdx: 0, followUpCount: 0, strikes: 0,
        pendingEvals: [], evaluations: [], turnError: null,
        messages: [{ id: "g", speaker: "interviewer", kind: "question", text: "Hi, how are you?", questionId: "intro" }],
      });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("clarify", "Let's keep this professional. So — how are you doing today?", 1));

      await useSessionStore.getState().submitAnswer("shut up, bot");

      const s = useSessionStore.getState();
      expect(s.phase).toBe("warmup");
      expect(s.status).toBe("live");
      expect(s.strikes).toBe(1);
      expect(s.messages.map((m) => m.text)).toEqual([
        "Hi, how are you?", "Let's keep this professional. So — how are you doing today?",
      ]);

      // The struck line is never sent again as part of the thread.
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("advance", "Tell me about your background.", 1));
      await useSessionStore.getState().submitAnswer("Sorry. I'm doing fine.");
      const sent = vi.mocked(api.submitAnswer).mock.calls[1][0];
      expect(sent.answer).not.toContain("shut up");
      expect(sent.strikes).toBe(1);
      expect(useSessionStore.getState().phase).toBe("background");
    });

    it("keeps the background phase on a struck turn", async () => {
      useSessionStore.setState({
        status: "live", phase: "background", plan: MOCK_PLAN, currentIdx: 0, followUpCount: 0, strikes: 0,
        pendingEvals: [], evaluations: [], messages: [], turnError: null,
      });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("clarify", "Let's keep this professional.", 1));
      await useSessionStore.getState().submitAnswer("you're an idiot");
      expect(useSessionStore.getState().phase).toBe("background");
    });

    it("doesn't count a struck turn as a follow-up or move to the next question", async () => {
      seedCoding({ followUpCount: 1 });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("clarify", "Let's keep this professional.", 1));
      await useSessionStore.getState().submitAnswer("stfu");
      const s = useSessionStore.getState();
      expect(s).toMatchObject({ followUpCount: 1, currentIdx: 0, phase: "question", strikes: 1 });
      expect(api.evaluateAnswer).not.toHaveBeenCalled();
    });

    it("ends the session on the third strike and records it at finalize", async () => {
      seedCoding({ strikes: 2, evaluations: [MOCK_EVALUATION] });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("end", "I'm going to end the interview here. Take care.", 3));
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);

      await useSessionStore.getState().submitAnswer("fuck you");

      const s = useSessionStore.getState();
      expect(s.status).toBe("complete");
      expect(s.endedForConduct).toBe(true);
      expect(s.messages.map((m) => m.text)).toEqual(["I'm going to end the interview here. Take care."]);
      expect(api.finalizeSession).toHaveBeenCalledWith(expect.objectContaining({ endedForConduct: true, companyStyle: "google" }));
    });

    it("sends endedForConduct false on a normal finish", async () => {
      seedCoding({ phase: "closing" });
      const { api } = await import("@/lib/api");
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);
      await useSessionStore.getState().endInterview();
      expect(api.finalizeSession).toHaveBeenCalledWith(expect.objectContaining({ endedForConduct: false }));
    });
  });

  describe("coding round", () => {
    it("moves from approach to coding on the first edit of the current problem only", () => {
      seedCoding();
      useSessionStore.getState().setCode("c2", "def f(): pass");
      expect(useSessionStore.getState().codingStage).toBe("approach");
      useSessionStore.getState().setCode("c1", "def two_sum(nums, target):\n    seen = {}");
      const s = useSessionStore.getState();
      expect(s.codingStage).toBe("coding");
      expect(s.codeByQuestion.c1).toContain("seen = {}");
    });

    it("sends the code, last run and stage with a coding answer", async () => {
      seedCoding({ codingStage: "coding", codeByQuestion: { c1: "code" } });
      useSessionStore.getState().recordRun("c1", { kind: "results", results: [passed(0), passed(1, false)] }, "run", 2);
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("clarify", "Keep going."));
      await useSessionStore.getState().submitAnswer("Example 2 fails, looking at it.");
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({
        code: "code",
        testResults: "Examples: 1/2 passed (example 2 failed: expected [0, 1], got [1, 0]).",
        codingStage: "coding",
      });
      expect(useSessionStore.getState().codingStage).toBe("coding"); // a Run doesn't end the coding stage
    });

    it("doesn't send code for a non-coding question", async () => {
      seedLiveSession();
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("follow_up", "Why?"));
      await useSessionStore.getState().submitAnswer("Because.");
      const sent = vi.mocked(api.submitAnswer).mock.calls[0][0];
      expect(sent.code).toBeUndefined();
      expect(sent.codingStage).toBeUndefined();
    });

    it("on Submit: records the run, enters review and starts the review without a candidate line", async () => {
      seedCoding({ codingStage: "coding", codeByQuestion: { c1: "code" } });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("follow_up", "Example 2 fails. Why?"));

      await useSessionStore.getState().recordRun(
        "c1", { kind: "results", results: [passed(0), passed(1, false), passed(2), passed(3)] }, "submit", 2);

      const s = useSessionStore.getState();
      expect(s.codingStage).toBe("review");
      expect(s.lastRun.c1).toMatchObject({ visiblePassed: 1, visibleTotal: 2, hiddenPassed: 2, hiddenTotal: 2 });
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({
        event: "submit", answer: "", code: "code", codingStage: "review", testResults: s.lastRun.c1.summary,
      });
      expect(s.messages.map((m) => m.speaker)).toEqual(["interviewer"]);
      expect(s.followUpCount).toBe(1);
      expect(s.status).toBe("live");
    });

    it("queues a Submit pressed while Marcus is replying and sends it once he's done", async () => {
      seedCoding({ codingStage: "coding", codeByQuestion: { c1: "code" } });
      const { api } = await import("@/lib/api");
      let resolveTurn!: (v: TurnResult) => void;
      vi.mocked(api.submitAnswer)
        .mockReturnValueOnce(new Promise<TurnResult>((r) => { resolveTurn = r; }))
        .mockResolvedValueOnce(reply("follow_up", "Example 2 fails. Why?"));

      const answering = useSessionStore.getState().submitAnswer("Writing the loop now.");
      expect(useSessionStore.getState().status).toBe("thinking");
      await useSessionStore.getState().recordRun(
        "c1", { kind: "results", results: [passed(0), passed(1, false)] }, "submit", 2);
      await useSessionStore.getState().recordRun(
        "c1", { kind: "results", results: [passed(0), passed(1, false)] }, "submit", 2);
      expect(api.submitAnswer).toHaveBeenCalledTimes(1);

      resolveTurn(reply("clarify", "Keep going."));
      await answering;

      expect(api.submitAnswer).toHaveBeenCalledTimes(2);
      expect(vi.mocked(api.submitAnswer).mock.calls[1][0]).toMatchObject({ event: "submit", answer: "", codingStage: "review" });
      const s = useSessionStore.getState();
      expect(s.status).toBe("live");
      expect(s.messages.at(-1)?.text).toBe("Example 2 fails. Why?");
    });

    it("drops a queued Submit if the reply moved on to another question", async () => {
      seedCoding({ codingStage: "coding" });
      const { api } = await import("@/lib/api");
      let resolveTurn!: (v: TurnResult) => void;
      vi.mocked(api.submitAnswer).mockReturnValueOnce(new Promise<TurnResult>((r) => { resolveTurn = r; }));

      const answering = useSessionStore.getState().submitAnswer("I think I'm done with this one.");
      await useSessionStore.getState().recordRun("c1", { kind: "results", results: [passed(0)] }, "submit", 1);
      resolveTurn(reply("advance", "Okay, next problem."));
      await answering;

      expect(api.submitAnswer).toHaveBeenCalledTimes(1);
      expect(useSessionStore.getState()).toMatchObject({ currentIdx: 1, codingStage: "approach", status: "live" });
    });

    it("keeps a turn within the server's limits even with a 10,000-character error and huge code", async () => {
      seedCoding({ codingStage: "coding", codeByQuestion: { c1: "x".repeat(30_000) } });
      useSessionStore.getState().recordRun(
        "c1", { kind: "results", results: [{ ...passed(0, false), error: `ValueError: ${"E".repeat(10_000)}` }] }, "run", 1);
      expect(useSessionStore.getState().lastRun.c1.summary.length).toBeLessThanOrEqual(1000);
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("clarify", "Keep going."));

      await useSessionStore.getState().submitAnswer("Still on it.");

      const sent = vi.mocked(api.submitAnswer).mock.calls[0][0];
      expect(sent.code!.length).toBeLessThanOrEqual(20_000);
      expect(sent.testResults!.length).toBeLessThanOrEqual(4_000);
      expect(sent.answer.length).toBeLessThanOrEqual(40_000);
    });

    it("never leaves a pending evaluation too big to send", async () => {
      seedCoding({
        phase: "closing",
        pendingEvals: [{ question: CODING_PLAN.questions[0], transcript: "t".repeat(50_000), followUpCount: 0, code: "c".repeat(25_000), testResults: "r".repeat(5_000) }],
      });
      const { api } = await import("@/lib/api");
      vi.mocked(api.finalizeSession).mockResolvedValueOnce(MOCK_MEMORY);

      await useSessionStore.getState().endInterview();

      const sent = vi.mocked(api.evaluateAnswer).mock.calls[0][0];
      expect(sent.transcript.length).toBeLessThanOrEqual(40_000);
      expect(sent.code!.length).toBeLessThanOrEqual(20_000);
      expect(sent.testResults!.length).toBeLessThanOrEqual(4_000);
      expect(useSessionStore.getState().status).toBe("complete");
    });

    it("reports a timeout in the run summary", () => {
      seedCoding({ codingStage: "coding" });
      useSessionStore.getState().recordRun("c1", { kind: "timeout" }, "run", 2);
      expect(useSessionStore.getState().lastRun.c1.summary).toBe("Timed out after 5 seconds (possible infinite loop)");
    });

    it("checks in once per problem, only while coding, with an empty answer", async () => {
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValue(reply("clarify", "How's it going — want to talk me through where you are?"));

      seedCoding({ codingStage: "approach" });
      await useSessionStore.getState().sendCheckin("c1");
      expect(api.submitAnswer).not.toHaveBeenCalled();

      useSessionStore.setState({ codingStage: "coding" });
      await useSessionStore.getState().sendCheckin("c1");
      await useSessionStore.getState().sendCheckin("c1");

      expect(api.submitAnswer).toHaveBeenCalledTimes(1);
      expect(vi.mocked(api.submitAnswer).mock.calls[0][0]).toMatchObject({ event: "checkin", answer: "" });
      const s = useSessionStore.getState();
      expect(s.checkinSent.c1).toBe(true);
      expect(s.messages.map((m) => m.text)).toEqual(["How's it going — want to talk me through where you are?"]);
      expect(s.followUpCount).toBe(0);
    });

    it("keeps a failed check-in quiet", async () => {
      seedCoding({ codingStage: "coding" });
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockRejectedValueOnce(new Error("Request failed (503)"));
      await useSessionStore.getState().sendCheckin("c1");
      expect(useSessionStore.getState()).toMatchObject({ status: "live", turnError: null, messages: [] });
    });

    it("scores a finished coding answer with the final code and last run, then resets the stage for the next problem", async () => {
      seedCoding({ codingStage: "review", codeByQuestion: { c1: "final code" } });
      useSessionStore.getState().recordRun("c1", { kind: "results", results: [passed(0), passed(1), passed(2)] }, "run", 3);
      const { api } = await import("@/lib/api");
      vi.mocked(api.submitAnswer).mockResolvedValueOnce(reply("advance", "Good. Next problem."));

      await useSessionStore.getState().submitAnswer("O(n) time and space.");

      expect(api.evaluateAnswer).toHaveBeenCalledWith(expect.objectContaining({
        question: CODING_PLAN.questions[0], code: "final code", testResults: "Examples: 3/3 passed.",
      }));
      expect(useSessionStore.getState()).toMatchObject({ currentIdx: 1, codingStage: "approach" });
    });
  });

  describe("persistence — the coding round survives a refresh", () => {
    it("persists code, stage, runs, strikes, style and name usability", () => {
      localStorage.clear();
      seedCoding({ strikes: 1, codingStage: "coding", codeByQuestion: { c1: "x = 1" }, checkinSent: { c1: true }, endedForConduct: false });
      const saved = JSON.parse(localStorage.getItem("crucible.session.v1")!).state;
      expect(saved).toMatchObject({
        strikes: 1, codingStage: "coding", codeByQuestion: { c1: "x = 1" }, companyStyle: "google",
        nameUsable: true, checkinSent: { c1: true }, endedForConduct: false, lastRun: {},
      });
    });
  });
});
