// Mirrors backend/models/contracts.py exactly. Keep in sync.

export interface ProjectHighlight {
  title: string;
  description: string;
  technologies: string[];
}

export interface IntakeProfile {
  candidateSkills: string[];
  yearsExperience: number;
  projectHighlights: ProjectHighlight[];
  targetRole: string;
  targetCompany?: string;
  jdRequirements: string[];
  resumeToJdGaps: string[];
}

export type QuestionType = "behavioral" | "technical" | "system_design" | "coding";
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type InterviewMode = "full" | "behavioral" | "technical" | "system_design" | "coding";
export type InterviewLevel = "junior" | "mid" | "senior";
export type CompanyStyleId = "general" | "amazon" | "google" | "meta" | "microsoft" | "startup";
// Coding round stage, tracked client-side and sent with each turn ("" outside coding).
// "talk": the problem is on screen without the editor, so the candidate talks the code through.
export type CodingStage = "" | "approach" | "coding" | "review" | "talk";

export interface PlannedQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  targetDifficulty: Difficulty;
  weightedFromWeakness: boolean;
  // Bank question id, or the coding problem id for type "coding". null = custom.
  exemplarId?: string | null;
}

export interface QuestionPlan {
  sessionId: string;
  questions: PlannedQuestion[];
}

// "end": the server stopped the session for conduct (third strike).
export type DecisionAction = "follow_up" | "clarify" | "advance" | "complete" | "end";

// Which stage of a real interview a turn belongs to.
export type InterviewPhase = "warmup" | "background" | "question" | "closing";

export interface InterviewDecision {
  action: DecisionAction;
  followUpPrompt: string | null;
  currentQuestionId: string;
  // What the interviewer says out loud this turn. Older payloads omit it.
  say?: string;
}

export interface AnswerEvaluation {
  questionId: string;
  transcript: string;
  rubricScores: Record<string, number>;
  weaknessTags: string[];
  followUpCount: number;
  wouldSurviveRealInterview: boolean;
  survivalReasoning: string;
  keyPoints?: string[];
}

export interface RecurringWeakness {
  tag: string;
  frequency: number;
  lastSeen: string;
}

export interface TrendPoint {
  sessionDate: string;
  avgScore: number;
}

export interface MemoryProfile {
  candidateId: string;
  recurringWeaknesses: RecurringWeakness[];
  improvementTrend: TrendPoint[];
  strongAreas: string[];
}

// POST /api/coach. For a coding question the reference solution is used only once the
// session is finalized (sessionId names it); code is the candidate's final editor text.
export interface CoachRequest {
  question: PlannedQuestion;
  transcript: string;
  weaknessTags: string[];
  sessionId?: string;
  code?: string;
  // Without auth, the id the session was finalized under (same as finalize's candidateId).
  candidateId?: string;
}

export interface CoachResponse {
  modelAnswer: string;
  improvements: string[];
  // Coding questions: clean Python for the approach. Empty or absent otherwise.
  code?: string;
}

// A 30-second Deepgram token for live transcription (the API key never leaves the server).
export interface SttTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface AvatarSessionResponse {
  enabled: boolean;
  conversationUrl: string | null;
  conversationId: string | null;
}

export interface SessionSummary {
  sessionId: string;
  date: string;
  mode: string;
  level: string;
  survived: number;
  total: number;
  /** Sorted union of the session's weakness tags; missing on rows written before it existed. */
  weaknessTags?: string[];
}

export interface SessionRecord {
  sessionId: string;
  candidateId: string;
  date: string;
  mode: string;
  level: string;
  questions: PlannedQuestion[];
  evaluations: AnswerEvaluation[];
  costUsd: number;
  // Older records (and demo-mode ones) omit these; the server defaults them.
  companyStyle?: string;
  endedForConduct?: boolean;
}
