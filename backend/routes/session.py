from datetime import date
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from auth import current_sub

from config.settings import Settings
from llm.usage import CallUsage
from models.contracts import (
    AnswerEvaluation,
    AvatarSessionResponse,
    CoachResponse,
    IntakeProfile,
    InterviewDecision,
    MemoryProfile,
    PlannedQuestion,
    QuestionPlan,
    SessionRecord,
    SessionSummary,
)
from agents.coach import CoachAgent
from agents.evaluator import EvaluatorAgent
from agents.interviewer import InterviewerAgent
from agents.memory import MemoryAgent
from models.coding import CodingProblem, find_problem
from models.company_style import find_style
from models.loader import find_exemplar
from models.question_data import QuestionExemplar
from graph.session_start import build_session_start_graph
from safety.moderation import moderate
from store.base import MemoryStore, VersionConflict

CompanyStyleId = Literal["general", "amazon", "google", "meta", "microsoft", "startup"]


def _exemplar_for(q: PlannedQuestion) -> QuestionExemplar | None:
    ex = find_exemplar(q.exemplar_id)
    return ex if ex and ex.type == q.type else None  # mismatched notes would contradict the question


def _latest_reply(answer: str) -> str:
    # The client sends the question's whole thread ("Q: ..." / "A: ...", latest last).
    # Mirrors latestReply in src/lib/mockEngine.ts.
    i = answer.rfind("\nA: ")
    return (answer[i + 4:] if i >= 0 else answer).strip()


def _problem_for(q: PlannedQuestion) -> CodingProblem | None:
    # Looked up by id server-side: the client's copy of the problem is never trusted.
    return find_problem(q.exemplar_id) if q.type == "coding" else None


class _Base(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StartSessionRequest(_Base):
    resume_text: str
    jd_text: str
    role: str
    candidate_id: str = "local-dev"
    mode: Literal["full", "behavioral", "technical", "system_design", "coding"] = "full"
    level: Literal["junior", "mid", "senior"] = "mid"
    company_style: CompanyStyleId = "general"


class StartSessionResponse(_Base):
    profile: IntakeProfile
    plan: QuestionPlan
    # Estimated cost of this call's LLM usage — the client sums these across
    # start + every turn and echoes the running total back in FinalizeRequest,
    # since /start, /turn, and /finalize are separate stateless requests with
    # no shared process memory to accumulate a session total server-side.
    cost_usd: float = 0.0


class TurnRequest(_Base):
    question: PlannedQuestion
    answer: str = Field(max_length=40000)  # the whole thread; each reply is capped in /turn
    follow_up_count: int = Field(ge=0)
    is_last: bool
    # Conversational context so the interviewer can respond like a person:
    # which stage of the interview this is, what to ask next if it moves on,
    # and who it's talking to. All optional so older clients keep working.
    phase: Literal["warmup", "background", "question", "closing"] = "question"
    next_question: PlannedQuestion | None = None
    candidate_name: str = ""
    mode: Literal["", "full", "behavioral", "technical", "system_design", "coding"] = ""
    level: Literal["", "junior", "mid", "senior"] = ""
    profile: IntakeProfile | None = None
    company_style: CompanyStyleId = "general"
    # Coding round: editor text and the browser's test summary (both fenced as
    # untrusted before they reach the model), plus the client-tracked stage.
    code: str = Field("", max_length=20000)
    test_results: str = Field("", max_length=4000)
    coding_stage: Literal["", "approach", "coding", "review"] = ""
    event: Literal["", "checkin"] = ""  # checkin: no edits or messages for a while; answer may be empty
    # Conduct strikes so far this session; the response carries the new count.
    strikes: int = Field(0, ge=0, le=3)


class EvaluateRequest(_Base):
    question: PlannedQuestion
    transcript: str
    follow_up_count: int = Field(ge=0)
    code: str = Field("", max_length=20000)
    test_results: str = Field("", max_length=4000)


class TurnResponse(_Base):
    decision: InterviewDecision
    cost_usd: float = 0.0
    strikes: int = 0


# What Marcus re-asks after a conduct warning outside the planned questions
# (in those phases the request's question is just a placeholder from the plan).
_PHASE_ASK = {
    "warmup": "how are you doing today?",
    "background": "tell me a bit about your background.",
    "closing": "what questions do you have for me?",
}


def _conduct_decision(req: TurnRequest, strikes: int) -> InterviewDecision:
    """Fixed, in-character replies to abuse: professional, then a warning, then a polite end."""
    if strikes >= 3:
        return InterviewDecision(action="end", current_question_id=req.question.id,
                                 say="I'm going to end the interview here. Take care.")
    warning = ("Let's keep this professional. " if strikes == 1 else
               "I'll be straightforward: if that happens again, I'll have to end the interview. ")
    restate = "So — " + _PHASE_ASK.get(req.phase, req.question.prompt)
    return InterviewDecision(action="clarify", current_question_id=req.question.id, say=warning + restate)


class EvaluateResponse(_Base):
    evaluation: AnswerEvaluation
    cost_usd: float = 0.0


def _role_context(p: IntakeProfile | None) -> str:
    if p is None:
        return ""
    highlights = "; ".join(h.title for h in p.project_highlights)
    return (
        f"Role: {p.target_role}. Company: {p.target_company or 'not specified'}. "
        f"JD requirements: {'; '.join(p.jd_requirements)}. "
        f"Candidate: {p.years_experience:g} years, skills {', '.join(p.candidate_skills)}; "
        f"projects: {highlights}."
    )


class FinalizeRequest(_Base):
    candidate_id: str = "local-dev"
    evaluations: list[AnswerEvaluation]
    # Optional so older clients keep working; when present, a reviewable
    # SessionRecord is persisted alongside the updated memory.
    session_id: str | None = None
    mode: str = "full"
    level: str = "mid"
    questions: list[PlannedQuestion] = []
    # Client-accumulated total from this session's start + turn responses'
    # cost_usd (see StartSessionResponse). The finalize call's own Memory
    # Agent cost is added server-side before this lands on SessionRecord.
    cost_usd: float = 0.0
    company_style: str = "general"
    ended_for_conduct: bool = False


class CoachRequest(_Base):
    question: PlannedQuestion
    transcript: str
    weakness_tags: list[str] = []


class TtsRequest(_Base):
    # Cap per call: one interviewer turn is a few sentences, and this bounds
    # what a single request can spend on the paid voice.
    text: str = Field(min_length=1, max_length=1500)


class AvatarEndRequest(_Base):
    conversation_id: str


# finalize's memory update is a classic read-modify-write around an LLM call
# (the Memory Agent): two finalize calls for the same candidate racing (two
# tabs, or a client retry after a slow-but-actually-successful request) must
# not silently clobber each other. The store detects the race via optimistic
# locking (put_memory_cas raises VersionConflict); this constant bounds how
# many times we re-read + re-run the Memory Agent + retry the write.
#
# The retry deliberately re-runs the LLM call, not just the write: the
# "modify" step's whole job is to merge the new evaluations into whatever
# memory currently exists, so after a conflict it must recompute against the
# post-race state, not resubmit a merge decision that used stale input.
# Contention is expected to be rare (same candidate, same few seconds), not
# adversarial, so a small bound is proportionate — it exists to fail loudly
# on a genuine bug, not to survive hammering.
_MAX_MEMORY_FINALIZE_ATTEMPTS = 3


def _empty_memory(candidate_id: str) -> MemoryProfile:
    return MemoryProfile(
        candidate_id=candidate_id,
        recurring_weaknesses=[],
        improvement_trend=[],
        strong_areas=[],
    )


def build_session_router(
    *, llm, settings: Settings, store: MemoryStore, tavus_client=None, tts_client=None,
) -> APIRouter:
    router = APIRouter(prefix="/api")

    start_graph = build_session_start_graph(
        llm=llm,
        intake_model=settings.intake_model,
        planner_model=settings.planner_model,
        intake_temperature=settings.intake_temperature,
        planner_temperature=settings.planner_temperature,
    )
    interviewer = InterviewerAgent(
        llm=llm, model=settings.interviewer_model, temperature=settings.interviewer_temperature)
    evaluator = EvaluatorAgent(
        llm=llm, model=settings.evaluator_model, temperature=settings.evaluator_temperature)
    memory_agent = MemoryAgent(
        llm=llm, model=settings.memory_model, temperature=settings.memory_temperature)
    coach = CoachAgent(llm=llm, model=settings.coach_model, temperature=settings.coach_temperature)

    @router.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @router.get("/memory/{candidate_id}")
    def get_memory(candidate_id: str, sub: str | None = Depends(current_sub)) -> MemoryProfile:
        # When authenticated, the token's sub wins over any client-supplied id,
        # so a user can only ever read their own memory.
        cid = sub or candidate_id
        return store.get_memory(cid) or _empty_memory(cid)

    @router.get("/coding/problems/{problem_id}")
    def coding_problem(problem_id: str, _sub: str | None = Depends(current_sub)) -> dict:
        # The browser's copy: no reference solution, hints, follow-ups or rubric.
        problem = find_problem(problem_id)
        if problem is None:
            raise HTTPException(status_code=404, detail="Problem not found.")
        return problem.public()

    @router.post("/session/start")
    def start(req: StartSessionRequest, sub: str | None = Depends(current_sub)) -> StartSessionResponse:
        cid = sub or req.candidate_id
        prior = store.get_memory(cid) or _empty_memory(cid)
        usage: list[CallUsage] = []
        result = start_graph.invoke(
            {
                "session_id": str(uuid4()),
                "resume_text": req.resume_text,
                "jd_text": req.jd_text,
                "role_key": req.role,
                "mode": req.mode,
                "level": req.level,
                "company_style": req.company_style,
                "memory": prior,
                "usage": usage,
            }
        )
        return StartSessionResponse(
            profile=result["profile"], plan=result["plan"],
            cost_usd=sum(u.cost_usd for u in usage),
        )

    @router.post("/session/turn")
    def turn(req: TurnRequest, _sub: str | None = Depends(current_sub)) -> TurnResponse:
        reply = _latest_reply(req.answer)
        if len(reply) > 6000:
            raise HTTPException(
                status_code=422,
                detail="That answer is too long — please keep each answer under 6,000 characters.")
        # Screened before the model: abuse and blocked terms never reach it. Only the latest
        # reply, so an earlier struck line can't strike again (the client drops it as well).
        if moderate(reply).kind != "ok":
            strikes = req.strikes + 1
            return TurnResponse(decision=_conduct_decision(req, strikes), strikes=strikes)
        # Only the interviewer runs here so the reply comes back fast; scoring
        # happens in /session/evaluate, which the client calls in the background.
        usage: list[CallUsage] = []
        in_question = req.phase == "question"  # other phases carry an unrelated question
        style = find_style(req.company_style)
        decision = interviewer.run_turn(
            question=req.question,
            candidate_answer=req.answer,
            follow_up_count=req.follow_up_count,
            is_last_question=req.is_last,
            next_question=req.next_question,
            phase=req.phase,
            role_context=_role_context(req.profile),
            # A flagged name is never an error (real names trip the filter): Marcus just doesn't use one.
            candidate_name=req.candidate_name if moderate(req.candidate_name).kind == "ok" else "",
            mode=req.mode,
            level=req.level,
            usage_sink=usage,
            # Warmup/background/closing carry an unrelated question; notes would mislead.
            exemplar=_exemplar_for(req.question) if in_question else None,
            coding_problem=_problem_for(req.question) if in_question else None,
            code=req.code,
            test_results=req.test_results,
            coding_stage=req.coding_stage,
            event=req.event,
            company_note=f"{style.name}. {style.interviewer_note}",
        )
        return TurnResponse(decision=decision, cost_usd=sum(u.cost_usd for u in usage), strikes=req.strikes)

    @router.post("/session/evaluate")
    def evaluate(req: EvaluateRequest, _sub: str | None = Depends(current_sub)) -> EvaluateResponse:
        usage: list[CallUsage] = []
        evaluation = evaluator.run(
            question=req.question,
            transcript=req.transcript,
            follow_up_count=req.follow_up_count,
            usage_sink=usage,
            exemplar=_exemplar_for(req.question),
            coding_problem=_problem_for(req.question),
            code=req.code,
            test_results=req.test_results,
        )
        return EvaluateResponse(evaluation=evaluation, cost_usd=sum(u.cost_usd for u in usage))

    @router.post("/coach")
    def coach_answer(req: CoachRequest, _sub: str | None = Depends(current_sub)) -> CoachResponse:
        # On-demand: reworks the candidate's own attempt into a model 5/5 answer.
        # Generated only when the user asks to see it, never during the interview.
        if moderate(req.transcript).kind != "ok":
            raise HTTPException(status_code=422, detail="Let's keep it professional.")
        return coach.run(
            question=req.question,
            transcript=req.transcript,
            weakness_tags=req.weakness_tags,
        )

    @router.post("/tts")
    def tts(req: TtsRequest, _sub: str | None = Depends(current_sub)) -> Response:
        # The interviewer's voice (ElevenLabs). 404 when not configured tells
        # the browser to use its built-in voice instead.
        if tts_client is None:
            raise HTTPException(status_code=404, detail="Voice not configured.")
        return Response(content=tts_client.synthesize(req.text), media_type="audio/mpeg")

    @router.post("/avatar/session")
    def avatar_session(_sub: str | None = Depends(current_sub)) -> AvatarSessionResponse:
        # Creates a Tavus video conversation and returns only the ephemeral room
        # URL (the API key stays here). When Tavus isn't configured, reports
        # disabled so the UI keeps the stylized avatar — zero impact when off.
        if tavus_client is None:
            return AvatarSessionResponse(enabled=False, conversation_url=None)
        result = tavus_client.create_conversation(
            replica_id=settings.tavus_replica_id,
            persona_id=settings.tavus_persona_id,
        )
        return AvatarSessionResponse(
            enabled=True,
            conversation_url=result.conversation_url,
            conversation_id=result.conversation_id,
        )

    @router.post("/avatar/end")
    def avatar_end(req: AvatarEndRequest, _sub: str | None = Depends(current_sub)) -> dict:
        # Best-effort: ends the billed Tavus session when the candidate leaves.
        if tavus_client is None:
            return {"ended": False}
        try:
            tavus_client.end_conversation(req.conversation_id)
        except Exception:  # noqa: BLE001 — cleanup must never break exit
            return {"ended": False}
        return {"ended": True}

    @router.post("/session/finalize")
    def finalize(req: FinalizeRequest, sub: str | None = Depends(current_sub)) -> MemoryProfile:
        cid = sub or req.candidate_id
        today = date.today().isoformat()

        updated: MemoryProfile | None = None
        usage: list[CallUsage] = []
        for attempt in range(_MAX_MEMORY_FINALIZE_ATTEMPTS):
            existing, version = store.get_memory_with_version(cid)
            existing = existing or _empty_memory(cid)
            updated = memory_agent.run(
                candidate_id=cid,
                session_date=today,
                evaluations=req.evaluations,
                existing_memory=existing,
                usage_sink=usage,
            )
            try:
                store.put_memory_cas(updated, expected_version=version)
                break
            except VersionConflict:
                if attempt == _MAX_MEMORY_FINALIZE_ATTEMPTS - 1:
                    raise
                continue

        # Persist a reviewable record of this session when the client sent the
        # session id + questions (newer clients). Older payloads just update
        # memory, unchanged.
        if req.session_id:
            store.put_session(
                SessionRecord(
                    session_id=req.session_id,
                    candidate_id=cid,
                    date=today,
                    mode=req.mode,
                    level=req.level,
                    questions=req.questions,
                    evaluations=req.evaluations,
                    cost_usd=req.cost_usd + sum(u.cost_usd for u in usage),
                    company_style=req.company_style,
                    ended_for_conduct=req.ended_for_conduct,
                )
            )
        return updated

    @router.get("/sessions")
    def list_sessions(sub: str | None = Depends(current_sub)) -> list[SessionSummary]:
        cid = sub or "local-dev"
        return store.list_sessions(cid)

    @router.get("/sessions/{session_id}")
    def get_session(session_id: str, sub: str | None = Depends(current_sub)) -> SessionRecord:
        cid = sub or "local-dev"
        record = store.get_session(cid, session_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Session not found.")
        return record

    return router
