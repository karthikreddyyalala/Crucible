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

export type QuestionType = "behavioral" | "technical" | "system_design";
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type InterviewMode = "full" | "behavioral" | "technical" | "system_design";
export type InterviewLevel = "junior" | "mid" | "senior";

export interface PlannedQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  targetDifficulty: Difficulty;
  weightedFromWeakness: boolean;
  exemplarId?: string | null;
}

export interface QuestionPlan {
  sessionId: string;
  questions: PlannedQuestion[];
}

export type DecisionAction = "follow_up" | "clarify" | "advance" | "complete";

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

export interface CoachResponse {
  modelAnswer: string;
  improvements: string[];
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
}
