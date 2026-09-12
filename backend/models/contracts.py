from typing import Literal
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _Base(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProjectHighlight(_Base):
    title: str
    description: str
    technologies: list[str]


class IntakeProfile(_Base):
    candidate_skills: list[str]
    years_experience: float
    project_highlights: list[ProjectHighlight]
    target_role: str
    target_company: str | None = None
    jd_requirements: list[str]
    resume_to_jd_gaps: list[str]


class PlannedQuestion(_Base):
    id: str
    type: Literal["behavioral", "technical", "system_design"]
    prompt: str
    target_difficulty: Literal[1, 2, 3, 4, 5]
    weighted_from_weakness: bool


class QuestionPlan(_Base):
    session_id: str
    questions: list[PlannedQuestion]


class AnswerEvaluation(_Base):
    question_id: str
    transcript: str
    rubric_scores: dict[str, float]
    weakness_tags: list[str]
    follow_up_count: int
    would_survive_real_interview: bool
    survival_reasoning: str


class CoachResponse(_Base):
    """A model answer that reworks the candidate's own attempt into a 5/5 response."""
    model_answer: str
    improvements: list[str]  # 2-3 short "what changed / why this works" notes


class AvatarSessionResponse(_Base):
    """Tells the browser whether the video avatar is on and, if so, where to join."""
    enabled: bool
    conversation_url: str | None = None
    conversation_id: str | None = None


class RecurringWeakness(_Base):
    tag: str
    frequency: int
    last_seen: str


class TrendPoint(_Base):
    session_date: str
    avg_score: float


class MemoryProfile(_Base):
    candidate_id: str
    recurring_weaknesses: list[RecurringWeakness]
    improvement_trend: list[TrendPoint]
    strong_areas: list[str]


class SessionSummary(_Base):
    """Lightweight row for the dashboard's past-sessions list."""
    session_id: str
    date: str
    mode: str
    level: str
    survived: int
    total: int


class SessionRecord(_Base):
    """Full replayable session: the questions asked and how each was scored."""
    session_id: str
    candidate_id: str
    date: str
    mode: str
    level: str
    questions: list[PlannedQuestion]
    evaluations: list[AnswerEvaluation]
    # Estimated LLM cost for the whole session (client-accumulated across
    # start + turns, plus this finalize call's own Memory Agent cost). Default
    # keeps deserializing session records written before this field existed.
    cost_usd: float = 0.0

    def summary(self) -> SessionSummary:
        survived = sum(1 for e in self.evaluations if e.would_survive_real_interview)
        return SessionSummary(
            session_id=self.session_id,
            date=self.date,
            mode=self.mode,
            level=self.level,
            survived=survived,
            total=len(self.evaluations),
        )


class InterviewDecision(_Base):
    action: Literal["follow_up", "advance", "complete"]
    follow_up_prompt: str | None = None
    current_question_id: str
