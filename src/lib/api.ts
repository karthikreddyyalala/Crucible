// Single seam between UI and backend. Defaults to the local mockEngine so the
// product demos without AWS; set VITE_USE_MOCK=false (with the FastAPI backend
// running) to hit the real five-agent pipeline through the Vite /api proxy.
// In real mode the backend is the source of truth for cross-session memory
// (DynamoDB); in mock mode localStorage stands in for it.

import type {
  AnswerEvaluation,
  AvatarSessionResponse,
  CoachResponse,
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
  SessionRecord,
  SessionSummary,
} from "@/types/contracts";
import type { PublicProblem } from "./coding/types";
import { mockEngine } from "./mockEngine";
import { authApi } from "./auth";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const MOCK_MEMORY_KEY = "crucible.memory.v1";
const MOCK_SESSIONS_KEY = "crucible.sessions.v1";

// Attaches the Cognito ID token so the backend can verify the user and derive
// their candidate id from the token's sub.
async function authHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const session = await authApi.getSession();
  if (session) headers["Authorization"] = `Bearer ${session.idToken}`;
  return headers;
}

// In dev the Vite proxy forwards /api -> localhost:8000, so the base is "".
// In production (static S3/CloudFront) there's no proxy, so point at the
// Lambda Function URL via VITE_API_BASE at build time.
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE}${path}`;

const latency = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.message ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res;
}

function readMockMemory(candidateId: string): MemoryProfile | null {
  try {
    const raw = localStorage.getItem(MOCK_MEMORY_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as MemoryProfile;
    return m.candidateId === candidateId ? m : null;
  } catch {
    return null;
  }
}

function writeMockMemory(profile: MemoryProfile): void {
  try {
    localStorage.setItem(MOCK_MEMORY_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function emptyMemory(candidateId: string): MemoryProfile {
  return { candidateId, recurringWeaknesses: [], improvementTrend: [], strongAreas: [] };
}

// Mock-mode session history: a candidate-keyed map of full records in localStorage.
function readMockSessions(candidateId: string): Record<string, SessionRecord> {
  try {
    const raw = localStorage.getItem(MOCK_SESSIONS_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, Record<string, SessionRecord>>;
    return all[candidateId] ?? {};
  } catch {
    return {};
  }
}

function writeMockSession(record: SessionRecord): void {
  try {
    const raw = localStorage.getItem(MOCK_SESSIONS_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, SessionRecord>>) : {};
    const forCandidate = all[record.candidateId] ?? {};
    forCandidate[record.sessionId] = record;
    all[record.candidateId] = forCandidate;
    localStorage.setItem(MOCK_SESSIONS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function summarize(r: SessionRecord): SessionSummary {
  return {
    sessionId: r.sessionId,
    date: r.date,
    mode: r.mode,
    level: r.level,
    survived: r.evaluations.filter((e) => e.wouldSurviveRealInterview).length,
    total: r.evaluations.length,
  };
}

export interface StartSessionResult {
  profile: IntakeProfile;
  plan: QuestionPlan;
  costUsd: number;
  // False when the candidate name is empty or flagged: don't say it. Older servers omit it.
  nameUsable?: boolean;
}

export interface TurnInput {
  question: PlannedQuestion;
  answer: string;
  followUpCount: number;
  isLast: boolean;
  phase: InterviewPhase;
  nextQuestion: PlannedQuestion | null;
  candidateName: string;
  mode: InterviewMode;
  level: InterviewLevel;
  profile: IntakeProfile | null;
  companyStyle: CompanyStyleId;
  // Conduct strikes so far this session; the result carries the new count.
  strikes: number;
  // Coding questions only: the editor text, the last run's summary, and the stage
  // ("talk": the problem is on screen without the editor, so it's talked through).
  code?: string;
  testResults?: string;
  codingStage?: CodingStage | "talk";
  // No new candidate reply: answer is the thread so far, ending with Marcus's last line.
  // "checkin": quiet for a while mid-coding. "submit": just pressed Submit; Marcus starts the review.
  event?: "" | "checkin" | "submit";
}

export interface TurnResult {
  decision: InterviewDecision;
  costUsd: number;
  // The new strike count (higher than sent = this turn was struck). Older servers omit it.
  strikes?: number;
}

export interface EvaluateResult {
  evaluation: AnswerEvaluation;
  costUsd: number;
}

export const api = {
  async getMemory(candidateId: string): Promise<MemoryProfile> {
    if (USE_MOCK) {
      return readMockMemory(candidateId) ?? emptyMemory(candidateId);
    }
    const res = await safeFetch(apiUrl(`/api/memory/${encodeURIComponent(candidateId)}`), {
      headers: await authHeaders(false),
    });
    return res.json();
  },

  async startSession(input: {
    resumeText: string;
    jdText: string;
    role: string;
    candidateId: string;
    mode: InterviewMode;
    level: InterviewLevel;
    candidateName: string;
    companyStyle: CompanyStyleId;
  }): Promise<StartSessionResult> {
    if (USE_MOCK) {
      await latency(1400);
      return {
        ...mockEngine.buildSession(input.role, input.mode, input.level),
        costUsd: 0,
        nameUsable: mockEngine.nameUsable(input.candidateName),
      };
    }
    const res = await safeFetch(apiUrl("/api/session/start"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return res.json();
  },

  // Interviewer only — returns as soon as the reply is decided. Scoring is a
  // separate evaluateAnswer call the store runs in the background.
  async submitAnswer(input: TurnInput): Promise<TurnResult> {
    if (USE_MOCK) {
      await latency(700 + Math.random() * 900);
      return { ...mockEngine.turn(input), costUsd: 0 };
    }
    const res = await safeFetch(apiUrl("/api/session/turn"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async evaluateAnswer(input: {
    question: PlannedQuestion;
    transcript: string;
    followUpCount: number;
    // Coding questions: the final code and the last run's summary.
    code?: string;
    testResults?: string;
  }): Promise<EvaluateResult> {
    if (USE_MOCK) {
      await latency(600);
      return {
        evaluation: mockEngine.evaluate(input.question, input.transcript, input.followUpCount, input.testResults),
        costUsd: 0,
      };
    }
    const res = await safeFetch(apiUrl("/api/session/evaluate"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return res.json();
  },

  // The browser's copy of a coding problem (no solution, hints or rubric). Demo mode
  // loads the exported set lazily so its ~2 MB only ships when it's actually used.
  async getProblem(id: string): Promise<PublicProblem> {
    if (USE_MOCK) {
      const { default: problems } = await import("./coding/problems.public.json");
      const problem = (problems as PublicProblem[]).find((p) => p.id === id);
      if (!problem) throw new Error("Problem not found.");
      return problem;
    }
    const res = await safeFetch(apiUrl(`/api/coding/problems/${encodeURIComponent(id)}`), {
      headers: await authHeaders(false),
    });
    return res.json();
  },

  async coachAnswer(input: {
    question: PlannedQuestion;
    transcript: string;
    weaknessTags: string[];
  }): Promise<CoachResponse> {
    if (USE_MOCK) {
      await latency(1200);
      return mockEngine.coach(input.question, input.weaknessTags);
    }
    const res = await safeFetch(apiUrl("/api/coach"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return res.json();
  },

  // The interviewer's voice (ElevenLabs via the backend). Resolves null when
  // no voice is configured so the caller falls back to the browser voice.
  async tts(text: string): Promise<Blob | null> {
    if (USE_MOCK) return null;
    const res = await fetch(apiUrl("/api/tts"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ text: text.slice(0, 1500) }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Voice failed (${res.status})`);
    return res.blob();
  },

  // Asks the backend to spin up a Tavus video conversation. Returns enabled:false
  // when Tavus isn't configured (the default) so the UI keeps the stylized avatar.
  async avatarSession(): Promise<AvatarSessionResponse> {
    if (USE_MOCK) {
      return { enabled: false, conversationUrl: null, conversationId: null };
    }
    const res = await safeFetch(apiUrl("/api/avatar/session"), {
      method: "POST",
      headers: await authHeaders(),
    });
    return res.json();
  },

  // Best-effort: ends the billed Tavus conversation. Fire-and-forget on exit.
  async endAvatarSession(conversationId: string): Promise<void> {
    if (USE_MOCK) return;
    try {
      await fetch(apiUrl("/api/avatar/end"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ conversationId }),
        keepalive: true,
      });
    } catch {
      /* cleanup is best-effort */
    }
  },

  async finalizeSession(input: {
    candidateId: string;
    evaluations: AnswerEvaluation[];
    sessionId: string;
    mode: InterviewMode;
    level: InterviewLevel;
    questions: PlannedQuestion[];
    // Client-accumulated total of this session's start + turn costUsd values
    // (see StartSessionResult/TurnResult) — the backend adds its own
    // finalize-call cost on top before persisting the SessionRecord.
    costUsd: number;
    companyStyle: CompanyStyleId;
    endedForConduct: boolean;
  }): Promise<MemoryProfile> {
    if (USE_MOCK) {
      await latency(900);
      const today = new Date().toISOString().slice(0, 10);
      const prior = readMockMemory(input.candidateId);
      const updated = mockEngine.aggregate(input.evaluations, today, prior);
      updated.candidateId = input.candidateId;
      writeMockMemory(updated);
      writeMockSession({
        sessionId: input.sessionId,
        candidateId: input.candidateId,
        date: today,
        mode: input.mode,
        level: input.level,
        questions: input.questions,
        evaluations: input.evaluations,
        costUsd: input.costUsd,
        companyStyle: input.companyStyle,
        endedForConduct: input.endedForConduct,
      });
      return updated;
    }
    const res = await safeFetch(apiUrl("/api/session/finalize"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async listSessions(candidateId: string): Promise<SessionSummary[]> {
    if (USE_MOCK) {
      await latency(300);
      return Object.values(readMockSessions(candidateId))
        .map(summarize)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    const res = await safeFetch(apiUrl("/api/sessions"), {
      headers: await authHeaders(false),
    });
    return res.json();
  },

  async getSession(candidateId: string, sessionId: string): Promise<SessionRecord | null> {
    if (USE_MOCK) {
      await latency(300);
      return readMockSessions(candidateId)[sessionId] ?? null;
    }
    const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}`), {
      headers: await authHeaders(false),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json();
  },
};
