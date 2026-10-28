import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AnswerEvaluation,
  CodingStage,
  CompanyStyleId,
  IntakeProfile,
  InterviewDecision,
  InterviewLevel,
  InterviewMode,
  InterviewPhase,
  MemoryProfile,
  PlannedQuestion,
  QuestionPlan,
} from "@/types/contracts";
import { api } from "@/lib/api";
import type { TurnInput } from "@/lib/api";
import { getCandidateId } from "@/lib/identity";
import { summarizeOutcome } from "@/lib/coding/summary";
import type { RunSummary } from "@/lib/coding/summary";
import type { RunOutcome } from "@/lib/coding/types";

export type Speaker = "interviewer" | "candidate";
export type MessageKind = "question" | "answer" | "follow_up";

export interface ChatMessage {
  id: string;
  speaker: Speaker;
  kind: MessageKind;
  text: string;
  // The thread this message belongs to: a planned question id, or one of the
  // non-scored stages "intro" | "background" | "closing".
  questionId: string;
  weighted?: boolean;
}

export type SessionStatus = "idle" | "starting" | "live" | "thinking" | "wrapping" | "complete";
// Where the current coding question is: plan → code → review (spec 1.4).
export type CodingStep = Exclude<CodingStage, "">;
type TurnEvent = NonNullable<TurnInput["event"]>;

interface SessionState {
  status: SessionStatus;
  role: string;
  mode: InterviewMode;
  level: InterviewLevel;
  candidateName: string;
  useVideo: boolean;
  // Where we are in the interview: small talk → "tell me about yourself" →
  // planned questions → the candidate's questions for the interviewer. Only
  // the "question" phase is scored.
  phase: InterviewPhase;
  // Answers handed to the Evaluator in the background and not yet scored.
  // Persisted so a reload mid-interview re-scores them at finalize.
  pendingEvals: PendingEval[];
  profile: IntakeProfile | null;
  plan: QuestionPlan | null;
  currentIdx: number;
  followUpCount: number;
  messages: ChatMessage[];
  evaluations: AnswerEvaluation[];
  // Running total of this session's estimated LLM cost, accumulated from
  // every start/turn response's costUsd and echoed to the backend at
  // finalize — see StartSessionResult/TurnResult in lib/api.ts for why this
  // can't simply be summed server-side instead.
  sessionCostUsd: number;
  priorMemory: MemoryProfile | null;
  updatedMemory: MemoryProfile | null;
  justRestored: boolean;
  turnError: string | null;
  // True for the duration of a finalizeSession call (initial or retry). The
  // backend's finalize isn't idempotent for duplicate identical calls — each
  // one independently re-runs the Memory Agent merge and writes — so this
  // guards against a double-click firing two concurrent finalize requests.
  finalizing: boolean;
  companyStyle: CompanyStyleId;
  // False when the server flagged (or there is no) name: Marcus doesn't say it.
  nameUsable: boolean;
  // Conduct strikes; the third ends the session (endedForConduct).
  strikes: number;
  endedForConduct: boolean;
  // Coding round, keyed by question id. codingStage is the current coding question's
  // stage; it resets to "approach" whenever a new question starts.
  codeByQuestion: Record<string, string>;
  codingStage: CodingStep;
  lastRun: Record<string, RunSummary>;
  checkinSent: Record<string, boolean>;
  // A Submit Marcus hasn't replied to yet (question id): queued while he was busy,
  // or in flight. Persisted, so a refresh mid-turn re-sends it once.
  pendingSubmit: string | null;

  loadMemory: () => Promise<void>;
  start: (input: {
    resumeText: string;
    jdText: string;
    role: string;
    mode: InterviewMode;
    level: InterviewLevel;
    candidateName: string;
    useVideo: boolean;
    companyStyle: CompanyStyleId;
  }) => Promise<void>;
  // false = nothing was sent (keep the draft). An answer typed while Marcus handles a
  // check-in or Submit is queued and sent right after (true).
  submitAnswer: (text: string) => Promise<boolean>;
  // Call on the candidate's edits only (not when loading starter code): the first
  // edit of the current problem moves it from "approach" to "coding".
  setCode: (questionId: string, code: string) => void;
  // After every Run / Submit. visibleCount = the problem's visibleTestCount. A Submit
  // moves to "review" and sends Marcus a "submit" turn so he starts the review.
  recordRun: (questionId: string, outcome: RunOutcome, kind: "run" | "submit", visibleCount: number) => Promise<void>;
  // The quiet-for-a-while nudge: at most once per problem, only in the "coding" stage.
  sendCheckin: (questionId: string) => Promise<void>;
  // Sends a Submit that never got Marcus's reply (runs by itself after a refresh).
  resumePendingSubmit: () => Promise<void>;
  endInterview: () => Promise<void>;
  retryFinalize: () => Promise<void>;
  clearRestored: () => void;
  clearTurnError: () => void;
  reset: () => void;
}

export interface PendingEval {
  question: PlannedQuestion;
  transcript: string;
  followUpCount: number;
  // Coding questions: the final code and the last run's summary.
  code?: string;
  testResults?: string;
}

// The only scripted line: there's nothing to react to yet. Everything after
// this is the Interviewer Agent responding to what the candidate said.
function warmGreeting(name: string): string {
  const who = name.trim() ? ` ${name.trim().split(/\s+/)[0]}` : "";
  return `Hi${who}, I'm Marcus — I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?`;
}

// In-flight Evaluator calls by question id (not persisted — after a reload
// the matching pendingEvals entry is simply re-scored at finalize).
const inflightEvals = new Map<string, Promise<void>>();

// An answer typed while an event turn (check-in / submit) was in flight: sent right
// after it. Not persisted; a refresh loses only that one unsent line.
let queuedAnswer: string | null = null;
let eventInFlight = false;

// UUID message ids so rehydrating a saved session never collides with new
// messages generated after the resume.
const mkId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function hasMemory(m: MemoryProfile | null): boolean {
  return !!m && m.recurringWeaknesses.length > 0;
}

// The coding question the candidate is on right now, if any.
function currentCoding(s: SessionState): PlannedQuestion | null {
  const q = s.phase === "question" ? s.plan?.questions[s.currentIdx] : undefined;
  return q?.type === "coding" ? q : null;
}

// The server's request limits (TurnRequest / EvaluateRequest in backend/routes/session.py).
// Bigger values are cut, never sent as-is: a rejected request would get re-sent forever.
// Threads keep their latest part; code and summaries their start.
const LIMIT = { code: 20_000, testResults: 4_000, thread: 40_000 };

function fitEval(p: PendingEval): PendingEval {
  return {
    ...p,
    transcript: p.transcript.slice(-LIMIT.thread),
    ...(p.code !== undefined && { code: p.code.slice(0, LIMIT.code) }),
    ...(p.testResults !== undefined && { testResults: p.testResults.slice(0, LIMIT.testResults) }),
  };
}

// Cleared at the start of every session.
const FRESH_ROUND = {
  strikes: 0,
  endedForConduct: false,
  codeByQuestion: {},
  codingStage: "approach" as CodingStep,
  lastRun: {},
  checkinSent: {},
  pendingSubmit: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => {
      // Shared by the initial finalize attempt (end of submitAnswer) and
      // retryFinalize: calls the backend, and on failure — a real, reachable
      // outcome (retry-budget-exhausted memory-profile conflicts, other
      // transient agent errors) — surfaces it the same way turn-submission
      // failures already are (turnError + a way to retry) instead of leaving
      // the session stuck on "wrapping" with no feedback.
      // Scores one answer in the background so the interviewer's reply never
      // waits on the Evaluator. A failure leaves it in pendingEvals; finalize
      // retries it before writing memory.
      const scoreInBackground = (unfit: PendingEval) => {
        const pending = fitEval(unfit);
        const id = pending.question.id;
        set((s) => ({ pendingEvals: [...s.pendingEvals.filter((p) => p.question.id !== id), pending] }));
        const run = api
          .evaluateAnswer(pending)
          .then(({ evaluation, costUsd }) => {
            set((s) => {
              const order = (qid: string) => s.plan?.questions.findIndex((q) => q.id === qid) ?? 0;
              return {
                evaluations: [...s.evaluations.filter((e) => e.questionId !== id), evaluation].sort(
                  (a, b) => order(a.questionId) - order(b.questionId)
                ),
                pendingEvals: s.pendingEvals.filter((p) => p.question.id !== id),
                sessionCostUsd: s.sessionCostUsd + costUsd,
              };
            });
          })
          .catch(() => {
            /* stays pending — finalize retries it */
          })
          .finally(() => inflightEvals.delete(id));
        inflightEvals.set(id, run);
        return run;
      };

      // One interviewer turn. A candidate answer (event "") is added to the thread
      // first; an event turn ("checkin" / "submit") adds no candidate line, and its
      // failure stays quiet (the candidate can just talk).
      // Returns false when nothing was sent (not live).
      const runTurn = async (text: string, event: "" | TurnEvent): Promise<boolean> => {
        if (!(await turnOnce(text, event))) return false;
        // A Submit pressed during its own turn folds into it: one reply per burst.
        if (event === "submit") set({ pendingSubmit: null });
        await sendQueued();
        return true;
      };

      // What waited for the turn that just ended: a queued answer, then a Submit.
      const sendQueued = async () => {
        const answer = queuedAnswer;
        queuedAnswer = null;
        if (answer !== null && (await runTurn(answer, ""))) return; // that turn sends the Submit
        const s = get();
        if (!s.pendingSubmit || s.status === "thinking") return;
        if (s.status === "live" && currentCoding(s)?.id === s.pendingSubmit) await runTurn("", "submit");
        else set({ pendingSubmit: null }); // the reply moved on to another question, or the session ended
      };

      const turnOnce = async (text: string, event: "" | TurnEvent): Promise<boolean> => {
        const state = get();
        const plan = state.plan;
        if (!plan || state.status !== "live") return false;
        const { phase } = state;
        const questions = plan.questions;
        const question =
          phase === "question" ? questions[state.currentIdx]
          : phase === "closing" ? questions[questions.length - 1]
          : questions[0];
        if (!question) return false;
        const threadId = phase === "question" ? question.id : phase === "warmup" ? "intro" : phase;
        const nextQuestion =
          phase === "background" ? questions[0]
          : phase === "question" ? questions[state.currentIdx + 1] ?? null
          : null;
        const isLast = phase === "question" && !nextQuestion;
        const candidateMsg: ChatMessage | null = event
          ? null
          : { id: mkId(), speaker: "candidate", kind: "answer", text, questionId: threadId };

        set({
          status: "thinking",
          // An event turn the candidate didn't trigger leaves an existing error up.
          ...(!event && { turnError: null }),
          messages: candidateMsg ? [...state.messages, candidateMsg] : state.messages,
        });

        // The full thread for this question (or stage), so the interviewer
        // reacts in context and the Evaluator scores the whole exchange.
        const priorThread = state.messages
          .filter((m) => m.questionId === threadId)
          .map((m) => `${m.speaker === "interviewer" ? "Q" : "A"}: ${m.text}`)
          .join("\n");
        // An event turn sends the thread as it stands, ending with Marcus's last line.
        const thread = event ? priorThread : priorThread ? `${priorThread}\nA: ${text}` : text;

        // Code and test results go with coding questions only (the backend fences them).
        const coding = currentCoding(state)
          ? {
              code: (state.codeByQuestion[question.id] ?? "").slice(0, LIMIT.code),
              testResults: (state.lastRun[question.id]?.summary ?? "").slice(0, LIMIT.testResults),
            }
          : null;

        let decision: InterviewDecision;
        let turnCostUsd = 0;
        let strikes = state.strikes;
        eventInFlight = event !== "";
        try {
          const result = await api.submitAnswer({
            question,
            answer: thread.slice(-LIMIT.thread),
            followUpCount: state.followUpCount,
            isLast,
            phase,
            nextQuestion,
            candidateName: state.nameUsable ? state.candidateName : "",
            mode: state.mode,
            level: state.level,
            profile: state.profile,
            companyStyle: state.companyStyle,
            strikes: state.strikes,
            ...(coding && { ...coding, codingStage: state.codingStage }),
            ...(event && { event }),
          });
          ({ decision, costUsd: turnCostUsd } = result);
          strikes = result.strikes ?? state.strikes;
        } catch (e) {
          set((s) => ({
            status: "live",
            // A failed check-in stays quiet; a failed Submit asks for another press.
            turnError:
              event === "checkin" ? s.turnError
              : event === "submit" ? "Couldn't reach the interviewer — press Submit again."
              : e instanceof Error ? e.message : "Request failed — please try again.",
            messages: s.messages.filter((m) => m !== candidateMsg),
          }));
          return true;
        } finally {
          eventInFlight = false;
        }

        const say = (fallback: string) => decision.say?.trim() || decision.followUpPrompt?.trim() || fallback;
        const reply = (questionId: string, kind: MessageKind, fallback: string, weighted?: boolean): ChatMessage =>
          ({ id: mkId(), speaker: "interviewer", kind, text: say(fallback), questionId, weighted });
        const addCost = (s: SessionState) => s.sessionCostUsd + turnCostUsd;

        // A struck turn (abuse or blocked text): the line leaves the transcript for
        // good, the stage stays where it was, and the third strike ends the session.
        if (strikes > state.strikes || decision.action === "end") {
          const ended = decision.action === "end";
          set((s) => ({
            status: ended ? "wrapping" : "live",
            strikes,
            endedForConduct: ended,
            sessionCostUsd: addCost(s),
            messages: [
              ...s.messages.filter((m) => m !== candidateMsg),
              reply(threadId, "question", "Let's keep this professional."),
            ],
          }));
          if (ended) await runFinalize();
          return true;
        }

        // A check-in is one line from Marcus; nothing else moves.
        if (event === "checkin") {
          set((s) => ({
            status: "live", sessionCostUsd: addCost(s),
            messages: [...s.messages, reply(threadId, "question", "How's it going?")],
          }));
          return true;
        }

        if (phase === "warmup") {
          set((s) => ({
            status: "live", phase: "background", sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("background", "question",
              "To start, walk me through your background — what have you been working on most recently?")],
          }));
          return true;
        }

        if (phase === "background") {
          const first = questions[0];
          set((s) => ({
            status: "live", phase: "question", currentIdx: 0, followUpCount: 0, codingStage: "approach",
            sessionCostUsd: addCost(s),
            messages: [...s.messages, reply(first.id, "question", first.prompt, first.weightedFromWeakness)],
          }));
          return true;
        }

        if (phase === "closing") {
          if (decision.action === "complete") {
            set((s) => ({
              status: "wrapping", sessionCostUsd: addCost(s),
              messages: [...s.messages, reply("closing", "question", "Thanks for your time today — I'll put your feedback together now.")],
            }));
            await runFinalize();
            return true;
          }
          set((s) => ({
            status: "live", sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("closing", "question", "Anything else you'd like to ask?")],
          }));
          return true;
        }

        // phase === "question"
        if (decision.action === "follow_up" || decision.action === "clarify") {
          const probing = decision.action === "follow_up";
          set((s) => ({
            status: "live",
            followUpCount: s.followUpCount + (probing ? 1 : 0),
            sessionCostUsd: addCost(s),
            messages: [...s.messages, reply(question.id, probing ? "follow_up" : "question", question.prompt)],
          }));
          return true;
        }

        // Resolved (advance / complete): score it in the background and move on
        // without waiting. Where we go next follows the plan, not the label —
        // an "advance" on the last question still leads into the closing.
        void scoreInBackground({ question, transcript: thread, followUpCount: state.followUpCount, ...coding });

        if (!nextQuestion) {
          set((s) => ({
            status: "live", phase: "closing", followUpCount: 0, sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("closing", "question",
              "That's everything I wanted to cover. What questions do you have for me?")],
          }));
          return true;
        }

        set((s) => ({
          status: "live",
          currentIdx: s.currentIdx + 1,
          followUpCount: 0,
          codingStage: "approach",
          sessionCostUsd: addCost(s),
          messages: [...s.messages, reply(nextQuestion.id, "question", nextQuestion.prompt, nextQuestion.weightedFromWeakness)],
        }));
        return true;
      };

      const runFinalize = async () => {
        // In-flight guard: a duplicate call (e.g. a double-click on RETRY)
        // must be a no-op, not a second concurrent finalize request.
        if (get().finalizing) return;
        set({ finalizing: true });
        try {
          // Every answer must be scored before memory is written.
          await Promise.all(
            get().pendingEvals.map((p) => inflightEvals.get(p.question.id) ?? scoreInBackground(p))
          );
          if (get().pendingEvals.length > 0) {
            throw new Error("Couldn't score every answer — tap retry.");
          }
          const state = get();
          const updated = await api.finalizeSession({
            candidateId: getCandidateId(),
            evaluations: state.evaluations,
            sessionId: state.plan!.sessionId,
            mode: state.mode,
            level: state.level,
            questions: state.plan!.questions,
            costUsd: state.sessionCostUsd,
            companyStyle: state.companyStyle,
            endedForConduct: state.endedForConduct,
          });
          set({ status: "complete", updatedMemory: updated, turnError: null, finalizing: false });
        } catch (e) {
          set({
            turnError: e instanceof Error ? e.message : "Request failed — please try again.",
            finalizing: false,
          });
        }
      };

      return {
      status: "idle",
      role: "sde",
      mode: "full",
      level: "mid",
      candidateName: "",
      useVideo: false,
      phase: "warmup",
      pendingEvals: [],
      profile: null,
      plan: null,
      currentIdx: 0,
      followUpCount: 0,
      messages: [],
      evaluations: [],
      sessionCostUsd: 0,
      priorMemory: null,
      updatedMemory: null,
      justRestored: false,
      turnError: null,
      finalizing: false,
      companyStyle: "general",
      nameUsable: false,
      ...FRESH_ROUND,

      loadMemory: async () => {
        const memory = await api.getMemory(getCandidateId());
        set({ priorMemory: hasMemory(memory) ? memory : null });
      },

      start: async ({ resumeText, jdText, role, mode, level, candidateName, useVideo, companyStyle }) => {
        queuedAnswer = null;
        set({
          status: "starting", role, mode, level, candidateName, useVideo, companyStyle, ...FRESH_ROUND,
          phase: "warmup", pendingEvals: [], messages: [], evaluations: [], updatedMemory: null,
          sessionCostUsd: 0,
          // A leftover finalize error from a prior session (turnError is
          // persisted, see the partialize comment below) must not bleed
          // into a brand-new session's UI. finalizing itself always
          // rehydrates to false (it's not persisted), so clearing it here
          // is just defensive symmetry with turnError.
          turnError: null, finalizing: false,
        });
        try {
        const candidateId = getCandidateId();
        const prior = await api.getMemory(candidateId);
        const { profile, plan, costUsd, nameUsable: usable } = await api.startSession({
          resumeText,
          jdText,
          role,
          candidateId,
          mode,
          level,
          candidateName,
          companyStyle,
        });
        // Older servers don't screen the name; keep using it as before.
        const nameUsable = usable ?? candidateName.trim() !== "";
        // Open with the greeting only — background and the first question come
        // from the interviewer reacting to the candidate's replies.
        set({
          status: "live",
          profile,
          plan,
          priorMemory: hasMemory(prior) ? prior : null,
          currentIdx: 0,
          followUpCount: 0,
          justRestored: false,
          phase: "warmup",
          sessionCostUsd: costUsd,
          nameUsable,
          messages: [
            {
              id: mkId(),
              speaker: "interviewer",
              kind: "question",
              text: warmGreeting(nameUsable ? candidateName : ""),
              questionId: "intro",
            },
          ],
        });
        } catch (e) {
          set({ status: "idle" });
          throw e;
        }
      },

      submitAnswer: async (text) => {
        if (get().status === "thinking" && eventInFlight) {
          if (queuedAnswer !== null) return false; // one queued answer at a time
          queuedAnswer = text;
          return true;
        }
        return runTurn(text, "");
      },

      setCode: (questionId, code) =>
        set((s) => ({
          codeByQuestion: { ...s.codeByQuestion, [questionId]: code },
          codingStage:
            s.codingStage === "approach" && currentCoding(s)?.id === questionId ? "coding" : s.codingStage,
        })),

      recordRun: async (questionId, outcome, kind, visibleCount) => {
        const submitted = kind === "submit" && currentCoding(get())?.id === questionId;
        set((s) => ({
          lastRun: { ...s.lastRun, [questionId]: summarizeOutcome(outcome, visibleCount) },
          codingStage: submitted ? "review" : s.codingStage,
          pendingSubmit: submitted ? questionId : s.pendingSubmit,
        }));
        // While Marcus is replying it waits in pendingSubmit; sendQueued sends it after.
        if (submitted && get().status === "live") await runTurn("", "submit");
      },

      sendCheckin: async (questionId) => {
        const s = get();
        if (s.status !== "live" || currentCoding(s)?.id !== questionId) return;
        if (s.codingStage !== "coding" || s.checkinSent[questionId]) return;
        set({ checkinSent: { ...s.checkinSent, [questionId]: true } });
        await runTurn("", "checkin");
      },

      resumePendingSubmit: () => sendQueued(),

      // Candidate skips (or is done with) their questions for the interviewer.
      endInterview: async () => {
        const s = get();
        if (s.phase !== "closing" || s.status !== "live") return;
        set({ status: "wrapping" });
        await runFinalize();
      },

      retryFinalize: async () => {
        if (get().status !== "wrapping" || get().finalizing) return;
        set({ turnError: null });
        await runFinalize();
      },

      clearRestored: () => set({ justRestored: false }),
      clearTurnError: () => set({ turnError: null }),

      reset: () => {
        queuedAnswer = null;
        set({
          status: "idle",
          profile: null,
          plan: null,
          currentIdx: 0,
          followUpCount: 0,
          phase: "warmup",
          pendingEvals: [],
          messages: [],
          evaluations: [],
          sessionCostUsd: 0,
          updatedMemory: null,
          justRestored: false,
          turnError: null,
          finalizing: false,
          ...FRESH_ROUND,
        });
      },
      };
    },
    {
      name: "crucible.session.v1",
      storage: createJSONStorage(() => localStorage),
      // v0 saves predate nameUsable; those sessions always spoke the name.
      version: 1,
      migrate: (persisted, version) => {
        const saved = persisted as Partial<SessionState>;
        return (version < 1 ? { ...saved, nameUsable: saved.nameUsable ?? true } : saved) as SessionState;
      },
      // Persist only session data, never the action fns. Transient statuses
      // are corrected at save time: a reload during "thinking" (request in
      // flight, now lost) resumes as "live" so the answer can be resubmitted;
      // "starting" (no plan yet) falls back to "idle". "wrapping" is assumed
      // to have finished by the time of reload and resumes as "complete" —
      // UNLESS it ended in an unresolved finalize error (turnError set), in
      // which case that would be lying about a failed finalize looking
      // successful (silently wrong, not just stuck) — so it stays "wrapping"
      // and turnError is persisted alongside it so the retry UI reappears.
      // A conduct end is never assumed finished: until finalize succeeds it is
      // saved as "wrapping" with a retry message, the same way.
      partialize: (s) => ({
        status:
          s.status === "thinking" ? "live"
          : s.status === "starting" ? "idle"
          : s.status === "wrapping" && !s.turnError && !s.endedForConduct ? "complete"
          : s.status,
        role: s.role,
        mode: s.mode,
        level: s.level,
        candidateName: s.candidateName,
        useVideo: s.useVideo,
        phase: s.phase,
        pendingEvals: s.pendingEvals,
        profile: s.profile,
        plan: s.plan,
        currentIdx: s.currentIdx,
        followUpCount: s.followUpCount,
        messages: s.messages,
        evaluations: s.evaluations,
        sessionCostUsd: s.sessionCostUsd,
        priorMemory: s.priorMemory,
        updatedMemory: s.updatedMemory,
        turnError:
          s.status === "wrapping" && s.endedForConduct && !s.turnError
            ? "Your results weren't saved yet — tap retry."
            : s.turnError,
        companyStyle: s.companyStyle,
        nameUsable: s.nameUsable,
        strikes: s.strikes,
        endedForConduct: s.endedForConduct,
        codeByQuestion: s.codeByQuestion,
        codingStage: s.codingStage,
        lastRun: s.lastRun,
        checkinSent: s.checkinSent,
        pendingSubmit: s.pendingSubmit,
      }),
      onRehydrateStorage: () => (state) => {
        // Flag a mid-interview resume so the UI can acknowledge it.
        if (state && state.status === "live" && state.messages.length > 0) {
          state.justRestored = true;
        }
        // A Submit cut off by the reload: send it once, after the store is ready.
        if (state?.pendingSubmit) setTimeout(() => void state.resumePendingSubmit());
      },
    }
  )
);
