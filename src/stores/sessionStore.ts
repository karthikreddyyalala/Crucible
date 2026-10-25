import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AnswerEvaluation,
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
import { getCandidateId } from "@/lib/identity";

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

  loadMemory: () => Promise<void>;
  start: (input: {
    resumeText: string;
    jdText: string;
    role: string;
    mode: InterviewMode;
    level: InterviewLevel;
    candidateName: string;
    useVideo: boolean;
  }) => Promise<void>;
  submitAnswer: (text: string) => Promise<void>;
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

// UUID message ids so rehydrating a saved session never collides with new
// messages generated after the resume.
const mkId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function hasMemory(m: MemoryProfile | null): boolean {
  return !!m && m.recurringWeaknesses.length > 0;
}

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
      const scoreInBackground = (pending: PendingEval) => {
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

      loadMemory: async () => {
        const memory = await api.getMemory(getCandidateId());
        set({ priorMemory: hasMemory(memory) ? memory : null });
      },

      start: async ({ resumeText, jdText, role, mode, level, candidateName, useVideo }) => {
        set({
          status: "starting", role, mode, level, candidateName, useVideo,
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
        const { profile, plan, costUsd } = await api.startSession({
          resumeText,
          jdText,
          role,
          candidateId,
          mode,
          level,
        });
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
          messages: [
            {
              id: mkId(),
              speaker: "interviewer",
              kind: "question",
              text: warmGreeting(candidateName),
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
        const state = get();
        const plan = state.plan;
        if (!plan || state.status !== "live") return;
        const { phase } = state;
        const questions = plan.questions;
        const question =
          phase === "question" ? questions[state.currentIdx]
          : phase === "closing" ? questions[questions.length - 1]
          : questions[0];
        if (!question) return;
        const threadId = phase === "question" ? question.id : phase === "warmup" ? "intro" : phase;
        const nextQuestion =
          phase === "background" ? questions[0]
          : phase === "question" ? questions[state.currentIdx + 1] ?? null
          : null;
        const isLast = phase === "question" && !nextQuestion;

        set({
          status: "thinking",
          turnError: null,
          messages: [
            ...state.messages,
            { id: mkId(), speaker: "candidate", kind: "answer", text, questionId: threadId },
          ],
        });

        // The full thread for this question (or stage), so the interviewer
        // reacts in context and the Evaluator scores the whole exchange.
        const priorMsgs = state.messages.filter((m) => m.questionId === threadId);
        const thread =
          priorMsgs.length > 0
            ? priorMsgs
                .map((m) => `${m.speaker === "interviewer" ? "Q" : "A"}: ${m.text}`)
                .join("\n") + `\nA: ${text}`
            : text;

        let decision: InterviewDecision;
        let turnCostUsd = 0;
        try {
          ({ decision, costUsd: turnCostUsd } = await api.submitAnswer({
            question,
            answer: thread,
            followUpCount: state.followUpCount,
            isLast,
            phase,
            nextQuestion,
            candidateName: state.candidateName,
            mode: state.mode,
            level: state.level,
            profile: state.profile,
          }));
        } catch (e) {
          set((s) => ({
            status: "live",
            turnError: e instanceof Error ? e.message : "Request failed — please try again.",
            messages: s.messages.slice(0, -1),
          }));
          return;
        }

        const say = (fallback: string) => decision.say?.trim() || decision.followUpPrompt?.trim() || fallback;
        const reply = (questionId: string, kind: MessageKind, fallback: string, weighted?: boolean): ChatMessage =>
          ({ id: mkId(), speaker: "interviewer", kind, text: say(fallback), questionId, weighted });
        const addCost = (s: SessionState) => s.sessionCostUsd + turnCostUsd;

        if (phase === "warmup") {
          set((s) => ({
            status: "live", phase: "background", sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("background", "question",
              "To start, walk me through your background — what have you been working on most recently?")],
          }));
          return;
        }

        if (phase === "background") {
          const first = questions[0];
          set((s) => ({
            status: "live", phase: "question", currentIdx: 0, followUpCount: 0, sessionCostUsd: addCost(s),
            messages: [...s.messages, reply(first.id, "question", first.prompt, first.weightedFromWeakness)],
          }));
          return;
        }

        if (phase === "closing") {
          if (decision.action === "complete") {
            set((s) => ({
              status: "wrapping", sessionCostUsd: addCost(s),
              messages: [...s.messages, reply("closing", "question", "Thanks for your time today — I'll put your feedback together now.")],
            }));
            await runFinalize();
            return;
          }
          set((s) => ({
            status: "live", sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("closing", "question", "Anything else you'd like to ask?")],
          }));
          return;
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
          return;
        }

        // Resolved (advance / complete): score it in the background and move on
        // without waiting. Where we go next follows the plan, not the label —
        // an "advance" on the last question still leads into the closing.
        void scoreInBackground({ question, transcript: thread, followUpCount: state.followUpCount });

        if (!nextQuestion) {
          set((s) => ({
            status: "live", phase: "closing", followUpCount: 0, sessionCostUsd: addCost(s),
            messages: [...s.messages, reply("closing", "question",
              "That's everything I wanted to cover. What questions do you have for me?")],
          }));
          return;
        }

        set((s) => ({
          status: "live",
          currentIdx: s.currentIdx + 1,
          followUpCount: 0,
          sessionCostUsd: addCost(s),
          messages: [...s.messages, reply(nextQuestion.id, "question", nextQuestion.prompt, nextQuestion.weightedFromWeakness)],
        }));
      },

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

      reset: () =>
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
        }),
      };
    },
    {
      name: "crucible.session.v1",
      storage: createJSONStorage(() => localStorage),
      // Persist only session data, never the action fns. Transient statuses
      // are corrected at save time: a reload during "thinking" (request in
      // flight, now lost) resumes as "live" so the answer can be resubmitted;
      // "starting" (no plan yet) falls back to "idle". "wrapping" is assumed
      // to have finished by the time of reload and resumes as "complete" —
      // UNLESS it ended in an unresolved finalize error (turnError set), in
      // which case that would be lying about a failed finalize looking
      // successful (silently wrong, not just stuck) — so it stays "wrapping"
      // and turnError is persisted alongside it so the retry UI reappears.
      partialize: (s) => ({
        status:
          s.status === "thinking" ? "live"
          : s.status === "starting" ? "idle"
          : s.status === "wrapping" && !s.turnError ? "complete"
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
        turnError: s.turnError,
      }),
      onRehydrateStorage: () => (state) => {
        // Flag a mid-interview resume so the UI can acknowledge it.
        if (state && state.status === "live" && state.messages.length > 0) {
          state.justRestored = true;
        }
      },
    }
  )
);
