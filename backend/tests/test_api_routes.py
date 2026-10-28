import pytest
from fastapi.testclient import TestClient

import auth
from app import create_app
from llm.usage import CallUsage
from store.in_memory import InMemoryStore

# One deterministic call's cost, for tests that assert cost_usd summation
# across multiple agent calls rather than the cost math itself (that's
# covered in test_usage.py).
_ONE_CALL_COST = CallUsage(
    agent="test", model="claude-haiku-4-5", latency_s=0.1,
    attempts=1, success=True, input_tokens=1000, output_tokens=1000,
).cost_usd


@pytest.fixture(autouse=True)
def _clear_auth_cache():
    auth._settings.cache_clear()
    yield
    auth._settings.cache_clear()


class _FakeLLM:
    """Returns a canned payload selected by the requested schema name."""

    def __init__(self, payloads: dict):
        self._payloads = payloads

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        if sink is not None:
            sink.append(CallUsage(
                agent=agent, model="claude-haiku-4-5", latency_s=0.1,
                attempts=1, success=True, input_tokens=1000, output_tokens=1000,
            ))
        return schema.model_validate(self._payloads[schema.__name__])


_INTAKE = {
    "candidateSkills": ["Go", "Postgres"],
    "yearsExperience": 4,
    "projectHighlights": [
        {"title": "Pricing engine", "description": "Cut p99 latency", "technologies": ["Go"]}
    ],
    "targetRole": "Software Engineer",
    "targetCompany": "Stripe",
    "jdRequirements": ["distributed systems"],
    "resumeToJdGaps": ["thin incident postmortem evidence"],
}

_PLAN = {
    "sessionId": "sess-1",
    "questions": [
        {
            "id": "q0",
            "type": "behavioral",
            "prompt": "Tell me about a deadline you owned.",
            "targetDifficulty": 3,
            "weightedFromWeakness": False,
        }
    ],
}

_DECISION_FOLLOW_UP = {
    "action": "follow_up",
    "followUpPrompt": "What did YOU specifically do?",
    "currentQuestionId": "q0",
}

_DECISION_ADVANCE = {
    "action": "advance",
    "followUpPrompt": None,
    "currentQuestionId": "q0",
}

_EVAL = {
    "questionId": "q0",
    "transcript": "I led a 4-person team and cut latency 80%.",
    "rubricScores": {"structure": 4.0, "specificity": 4.0, "impact": 4.0, "ownership": 4.0},
    "weaknessTags": [],
    "followUpCount": 1,
    "wouldSurviveRealInterview": True,
    "survivalReasoning": "Specific, quantified, clear ownership.",
}

_MEMORY = {
    "candidateId": "local-dev",
    "recurringWeaknesses": [{"tag": "no-edge-cases", "frequency": 1, "lastSeen": "2026-06-22"}],
    "improvementTrend": [{"sessionDate": "2026-06-22", "avgScore": 4.0}],
    "strongAreas": ["ownership"],
}

_QUESTION_BODY = {
    "id": "q0",
    "type": "behavioral",
    "prompt": "Tell me about a deadline you owned.",
    "targetDifficulty": 3,
    "weightedFromWeakness": False,
}


def _client(payloads: dict, store: InMemoryStore | None = None) -> TestClient:
    return TestClient(create_app(llm=_FakeLLM(payloads), store=store or InMemoryStore()))


def test_start_session_returns_profile_and_plan():
    client = _client({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN})
    res = client.post(
        "/api/session/start",
        json={"resumeText": "resume here", "jdText": "jd here", "role": "sde"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["profile"]["targetRole"] == "Software Engineer"
    assert body["profile"]["resumeToJdGaps"]  # camelCase preserved
    assert body["plan"]["questions"][0]["id"] == "q0"


def test_start_session_sums_cost_across_intake_and_planner_calls():
    client = _client({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN})
    res = client.post(
        "/api/session/start",
        json={"resumeText": "resume here", "jdText": "jd here", "role": "sde"},
    )
    body = res.json()
    assert body["costUsd"] == pytest.approx(2 * _ONE_CALL_COST)


def test_turn_follow_up_returns_no_evaluation():
    client = _client({"InterviewDecision": _DECISION_FOLLOW_UP})
    res = client.post(
        "/api/session/turn",
        json={
            "question": _QUESTION_BODY,
            "answer": "We just got it done.",
            "followUpCount": 0,
            "isLast": False,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["decision"]["action"] == "follow_up"
    assert body["decision"]["followUpPrompt"]
    # Only the interviewer was called — the evaluator never runs on a follow-up.
    assert body["costUsd"] == pytest.approx(_ONE_CALL_COST)


def test_turn_advance_returns_decision_without_blocking_on_evaluation():
    client = _client({"InterviewDecision": _DECISION_ADVANCE, "AnswerEvaluation": _EVAL})
    res = client.post(
        "/api/session/turn",
        json={
            "question": _QUESTION_BODY,
            "answer": "I led a 4-person team and cut latency 80%.",
            "followUpCount": 1,
            "isLast": False,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["decision"]["action"] == "advance"
    assert "evaluation" not in body
    # Only the interviewer ran — scoring is a separate background call.
    assert body["costUsd"] == pytest.approx(_ONE_CALL_COST)


def test_evaluate_returns_structured_evaluation():
    client = _client({"AnswerEvaluation": _EVAL})
    res = client.post(
        "/api/session/evaluate",
        json={"question": _QUESTION_BODY, "transcript": "I led a 4-person team.", "followUpCount": 1},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["evaluation"]["wouldSurviveRealInterview"] is True
    assert body["evaluation"]["survivalReasoning"]
    assert body["costUsd"] == pytest.approx(_ONE_CALL_COST)


def test_turn_forwards_phase_next_question_and_role_context_to_interviewer():
    seen: dict = {}

    class _Spy(_FakeLLM):
        def structured(self, **kw):
            seen["user"] = kw["user"]
            return super().structured(**kw)

    client = TestClient(create_app(llm=_Spy({"InterviewDecision": {
        **_DECISION_ADVANCE, "say": "Hi! Let's start. Tell me about a deadline you owned.",
    }}), store=InMemoryStore()))
    res = client.post(
        "/api/session/turn",
        json={
            "question": _QUESTION_BODY,
            "answer": "Doing great, what about you?",
            "followUpCount": 0,
            "isLast": False,
            "phase": "warmup",
            "nextQuestion": _QUESTION_BODY,
            "candidateName": "Karthik",
            "profile": _INTAKE,
        },
    )
    assert res.status_code == 200
    assert res.json()["decision"]["say"].startswith("Hi!")
    assert "Phase: warmup" in seen["user"]
    assert "Next question: Tell me about a deadline you owned." in seen["user"]
    assert "<role_context>" in seen["user"] and "Stripe" in seen["user"]
    assert "Karthik" in seen["user"]


def test_finalize_returns_memory_profile():
    client = _client({"MemoryProfile": _MEMORY})
    res = client.post(
        "/api/session/finalize",
        json={"evaluations": [_EVAL], "priorMemory": None},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["candidateId"] == "local-dev"
    assert body["recurringWeaknesses"][0]["tag"] == "no-edge-cases"
    assert body["improvementTrend"][0]["avgScore"] == 4.0


def test_healthcheck():
    client = _client({})
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_auth_required_rejects_missing_token(monkeypatch):
    monkeypatch.setenv("INTERVIEWAI_AUTH_REQUIRED", "true")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_USER_POOL_ID", "us-west-2_test")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_CLIENT_ID", "testclient")
    auth._settings.cache_clear()
    client = _client({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN})
    res = client.post("/api/session/start",
                      json={"resumeText": "r", "jdText": "j", "role": "sde"})
    assert res.status_code == 401


def test_health_public_even_when_auth_required(monkeypatch):
    monkeypatch.setenv("INTERVIEWAI_AUTH_REQUIRED", "true")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_USER_POOL_ID", "us-west-2_test")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_CLIENT_ID", "testclient")
    auth._settings.cache_clear()
    client = _client({})
    res = client.get("/api/health")
    assert res.status_code == 200


def test_finalize_persists_memory_to_store():
    store = InMemoryStore()
    client = _client({"MemoryProfile": {**_MEMORY, "candidateId": "cand-xyz"}}, store=store)
    res = client.post(
        "/api/session/finalize",
        json={"candidateId": "cand-xyz", "evaluations": [_EVAL]},
    )
    assert res.status_code == 200
    # the aggregated profile is now durable in the store
    saved = store.get_memory("cand-xyz")
    assert saved is not None
    assert saved.recurring_weaknesses[0].tag == "no-edge-cases"


class _RacingStoreOnce(InMemoryStore):
    """Wraps InMemoryStore to inject exactly one concurrent write right after
    the first get_memory_with_version() call, simulating a second finalize
    request for the same candidate that completes in the gap between our
    read and our write (two browser tabs, or a retried request that already
    succeeded server-side)."""

    def __init__(self, race_profile):
        super().__init__()
        self._race_profile = race_profile
        self._raced = False

    def get_memory_with_version(self, candidate_id):
        result = super().get_memory_with_version(candidate_id)
        if not self._raced:
            self._raced = True
            super().put_memory(self._race_profile)
        return result


class _AlwaysRacingStore(InMemoryStore):
    """Every read is immediately followed by a concurrent write, so every
    put_memory_cas attempt is guaranteed to conflict — used to prove the
    retry loop is bounded rather than infinite."""

    def __init__(self, race_profile):
        super().__init__()
        self._race_profile = race_profile

    def get_memory_with_version(self, candidate_id):
        result = super().get_memory_with_version(candidate_id)
        super().put_memory(self._race_profile)
        return result


class _CountingMemoryLLM(_FakeLLM):
    """Like _FakeLLM but records the `user` prompt passed to every
    MemoryProfile (Memory Agent) call, so tests can assert both how many
    times the (expensive, LLM-backed) recompute ran and what state it saw."""

    def __init__(self, payloads: dict):
        super().__init__(payloads)
        self.memory_calls: list[str] = []

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        if schema.__name__ == "MemoryProfile":
            self.memory_calls.append(user)
        return super().structured(agent=agent, model=model, system=system, user=user, schema=schema, max_tokens=max_tokens, sink=sink, temperature=temperature)


def test_finalize_retries_after_one_conflict_and_does_not_lose_data():
    """The core fix: a version conflict on put_memory must not be swallowed
    or clobber the concurrent write. finalize should re-read fresh state,
    re-run the Memory Agent against it, and succeed on retry."""
    from models.contracts import MemoryProfile

    race_profile = MemoryProfile.model_validate(
        {
            "candidateId": "cand-race",
            "recurringWeaknesses": [{"tag": "concurrent-writer-tag", "frequency": 1, "lastSeen": "2026-08-01"}],
            "improvementTrend": [],
            "strongAreas": [],
        }
    )
    store = _RacingStoreOnce(race_profile)
    llm = _CountingMemoryLLM({"MemoryProfile": {**_MEMORY, "candidateId": "cand-race"}})
    app = create_app(llm=llm, store=store)
    client = TestClient(app)

    res = client.post(
        "/api/session/finalize",
        json={"candidateId": "cand-race", "evaluations": [_EVAL]},
    )
    assert res.status_code == 200

    # The Memory Agent had to be re-run against fresh state after the
    # conflict — this is the deliberate design decision (the "modify" step
    # genuinely depends on the post-race state), not an accident.
    assert len(llm.memory_calls) == 2
    assert "concurrent-writer-tag" not in llm.memory_calls[0]
    assert "concurrent-writer-tag" in llm.memory_calls[1]

    # Final state is the second (post-conflict) computation's result, not a
    # silent no-op and not the race profile alone.
    saved = store.get_memory("cand-race")
    assert saved is not None
    assert saved.recurring_weaknesses[0].tag == "no-edge-cases"


def test_finalize_gives_up_loudly_after_exhausting_retries():
    """If conflicts keep happening past the bound, finalize must fail loudly
    (surface as an error) rather than silently drop the update or loop
    forever."""
    from models.contracts import MemoryProfile

    race_profile = MemoryProfile.model_validate(
        {
            "candidateId": "cand-hammered",
            "recurringWeaknesses": [],
            "improvementTrend": [],
            "strongAreas": [],
        }
    )
    store = _AlwaysRacingStore(race_profile)
    llm = _CountingMemoryLLM({"MemoryProfile": {**_MEMORY, "candidateId": "cand-hammered"}})
    app = create_app(llm=llm, store=store)
    client = TestClient(app, raise_server_exceptions=False)

    res = client.post(
        "/api/session/finalize",
        json={"candidateId": "cand-hammered", "evaluations": [_EVAL]},
    )

    assert res.status_code == 503  # clean, readable, retryable — not a hang or a 500 stack trace
    # Bounded: a small, explicit number of attempts, not infinite.
    assert 1 < len(llm.memory_calls) <= 5


def test_get_memory_returns_persisted_profile():
    store = InMemoryStore()
    client = _client({"MemoryProfile": {**_MEMORY, "candidateId": "cand-abc"}}, store=store)
    # nothing yet -> empty profile, not 404
    empty = client.get("/api/memory/cand-abc")
    assert empty.status_code == 200
    assert empty.json()["candidateId"] == "cand-abc"
    assert empty.json()["recurringWeaknesses"] == []

    # after finalize it returns the saved profile
    client.post("/api/session/finalize", json={"candidateId": "cand-abc", "evaluations": [_EVAL]})
    loaded = client.get("/api/memory/cand-abc")
    assert loaded.status_code == 200
    assert loaded.json()["recurringWeaknesses"][0]["tag"] == "no-edge-cases"


def test_start_loads_prior_memory_from_store():
    """Planner must receive the candidate's persisted weaknesses, proving the
    cross-session loop is server-side, not browser-side."""
    store = InMemoryStore()
    captured: dict = {}

    class _CapturingLLM(_FakeLLM):
        def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
            if schema.__name__ == "QuestionPlan":
                captured["planner_user"] = user
            return super().structured(
                agent=agent, model=model, system=system, user=user, schema=schema, max_tokens=max_tokens, sink=sink, temperature=temperature
            )

    # seed a prior memory for this candidate
    from models.contracts import MemoryProfile

    store.put_memory(
        MemoryProfile.model_validate(
            {
                "candidateId": "returning",
                "recurringWeaknesses": [{"tag": "no-edge-cases", "frequency": 3, "lastSeen": "2026-06-01"}],
                "improvementTrend": [],
                "strongAreas": [],
            }
        )
    )

    app = create_app(llm=_CapturingLLM({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN}), store=store)
    client = TestClient(app)
    res = client.post(
        "/api/session/start",
        json={"resumeText": "r", "jdText": "j", "role": "sde", "candidateId": "returning"},
    )
    assert res.status_code == 200
    # the planner prompt carried the persisted weakness
    assert "no-edge-cases" in captured["planner_user"]


class _RaisingLLM:
    """Simulates an agent call that fails even after retries are exhausted."""

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        raise RuntimeError("bedrock throttled: too many requests")


def test_turn_agent_failure_returns_clean_503():
    # A raised agent error must surface as a clean, retryable JSON error the
    # browser can read — never an opaque crash that hangs the interview.
    app = create_app(llm=_RaisingLLM(), store=InMemoryStore())
    client = TestClient(app, raise_server_exceptions=False)
    res = client.post(
        "/api/session/turn",
        json={
            "question": _QUESTION_BODY,
            "answer": "some answer",
            "followUpCount": 0,
            "isLast": False,
        },
    )
    assert res.status_code == 503
    body = res.json()
    assert "detail" in body
    # Human-readable, not a stack trace or "Internal Server Error"
    assert "interviewer" in body["detail"].lower() or "try again" in body["detail"].lower()


def test_start_session_failure_returns_clean_503():
    app = create_app(llm=_RaisingLLM(), store=InMemoryStore())
    client = TestClient(app, raise_server_exceptions=False)
    res = client.post(
        "/api/session/start",
        json={"resumeText": "r", "jdText": "j", "role": "sde"},
    )
    assert res.status_code == 503
    assert "detail" in res.json()


# --- per-session history ---------------------------------------------------

_QUESTIONS_BODY = [
    {"id": "q0", "type": "behavioral", "prompt": "Tell me about a deadline.",
     "targetDifficulty": 3, "weightedFromWeakness": False},
    {"id": "q1", "type": "technical", "prompt": "Explain a hash map.",
     "targetDifficulty": 3, "weightedFromWeakness": False},
]

_EVALS_BODY = [
    {"questionId": "q0", "transcript": "Q: Tell me...\nA: I shipped it.",
     "rubricScores": {"structure": 4.0}, "weaknessTags": [], "followUpCount": 0,
     "wouldSurviveRealInterview": True, "survivalReasoning": "Solid."},
    {"questionId": "q1", "transcript": "Q: Explain...\nA: buckets.",
     "rubricScores": {"correctness": 2.0}, "weaknessTags": ["shallow-depth"],
     "followUpCount": 1, "wouldSurviveRealInterview": False, "survivalReasoning": "Thin."},
]


def _finalize_body(session_id="sess-1"):
    return {
        "candidateId": "local-dev",
        "sessionId": session_id,
        "mode": "full",
        "level": "mid",
        "questions": _QUESTIONS_BODY,
        "evaluations": _EVALS_BODY,
    }


def test_finalize_persists_session_and_lists_it():
    store = InMemoryStore()
    client = _client({"MemoryProfile": _MEMORY}, store=store)

    fin = client.post("/api/session/finalize", json=_finalize_body("sess-1"))
    assert fin.status_code == 200

    listed = client.get("/api/sessions")
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 1
    assert rows[0]["sessionId"] == "sess-1"
    assert rows[0]["survived"] == 1 and rows[0]["total"] == 2
    assert rows[0]["mode"] == "full" and rows[0]["level"] == "mid"


def test_get_session_returns_full_record_with_transcripts():
    store = InMemoryStore()
    client = _client({"MemoryProfile": _MEMORY}, store=store)
    client.post("/api/session/finalize", json=_finalize_body("sess-abc"))

    res = client.get("/api/sessions/sess-abc")
    assert res.status_code == 200
    body = res.json()
    assert body["sessionId"] == "sess-abc"
    assert len(body["questions"]) == 2
    assert body["evaluations"][0]["transcript"].startswith("Q: Tell me")
    assert body["evaluations"][1]["wouldSurviveRealInterview"] is False


def test_finalize_adds_its_own_memory_agent_cost_to_the_clients_echoed_total():
    """finalize's SessionRecord.cost_usd must equal what the client accumulated
    from /start + /turn (echoed back in the request) plus this call's own
    Memory Agent cost — not just one or the other."""
    store = InMemoryStore()
    client = _client({"MemoryProfile": _MEMORY}, store=store)
    body = _finalize_body("sess-cost")
    body["costUsd"] = 0.05  # what the client accumulated from earlier calls
    client.post("/api/session/finalize", json=body)

    res = client.get("/api/sessions/sess-cost")
    assert res.json()["costUsd"] == pytest.approx(0.05 + _ONE_CALL_COST)


def test_get_missing_session_returns_404():
    client = _client({"MemoryProfile": _MEMORY}, store=InMemoryStore())
    res = client.get("/api/sessions/does-not-exist")
    assert res.status_code == 404


def test_sessions_list_empty_when_none():
    client = _client({"MemoryProfile": _MEMORY}, store=InMemoryStore())
    res = client.get("/api/sessions")
    assert res.status_code == 200
    assert res.json() == []


# --- coach (model answer) --------------------------------------------------

_COACH_PAYLOAD = {
    "modelAnswer": "When our service had duplicate alerts, I owned it. I added Redis "
                   "idempotency and cut duplicates from 4% to 0.3% in a month.",
    "improvements": ["Imposed STAR structure.", "Added a measurable 4%->0.3% impact."],
}


def test_coach_returns_model_answer_and_improvements():
    client = _client({"CoachResponse": _COACH_PAYLOAD})
    res = client.post(
        "/api/coach",
        json={
            "question": _QUESTION_BODY,
            "transcript": "Q: Tell me...\nA: It got better.",
            "weaknessTags": ["vague-impact", "no-star-structure"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "0.3%" in body["modelAnswer"]
    assert len(body["improvements"]) == 2


def test_coach_works_without_weakness_tags():
    client = _client({"CoachResponse": _COACH_PAYLOAD})
    res = client.post(
        "/api/coach",
        json={"question": _QUESTION_BODY, "transcript": "Some answer."},
    )
    assert res.status_code == 200
    assert res.json()["modelAnswer"]


# --- tavus avatar session --------------------------------------------------

class _FakeTavus:
    def __init__(self):
        self.calls = 0

    def create_conversation(self, *, replica_id, persona_id="", conversation_name="Crucible interview"):
        self.calls += 1
        from llm.tavus import TavusResult
        return TavusResult(conversation_id="conv-123", conversation_url="https://tavus.daily.co/room-abc")


def test_avatar_session_disabled_by_default():
    # No Tavus key configured -> endpoint reports disabled, UI falls back.
    client = _client({})
    res = client.post("/api/avatar/session")
    assert res.status_code == 200
    body = res.json()
    assert body["enabled"] is False
    assert body["conversationUrl"] is None


def test_avatar_session_returns_url_when_enabled():
    from config.settings import Settings
    settings = Settings(tavus_api_key="k", tavus_replica_id="r")
    app = create_app(
        llm=_FakeLLM({}), store=InMemoryStore(), settings=settings, tavus_client=_FakeTavus()
    )
    client = TestClient(app)
    res = client.post("/api/avatar/session")
    assert res.status_code == 200
    body = res.json()
    assert body["enabled"] is True
    assert body["conversationUrl"] == "https://tavus.daily.co/room-abc"


class _FakeTavusEnd(_FakeTavus):
    def __init__(self):
        super().__init__()
        self.ended = []

    def end_conversation(self, conversation_id):
        self.ended.append(conversation_id)


def test_avatar_end_calls_tavus_when_enabled():
    from config.settings import Settings
    settings = Settings(tavus_api_key="k", tavus_replica_id="r")
    fake = _FakeTavusEnd()
    app = create_app(llm=_FakeLLM({}), store=InMemoryStore(), settings=settings, tavus_client=fake)
    client = TestClient(app)
    res = client.post("/api/avatar/end", json={"conversationId": "conv-123"})
    assert res.status_code == 200
    assert res.json()["ended"] is True
    assert fake.ended == ["conv-123"]


def test_avatar_end_noop_when_disabled():
    client = _client({})
    res = client.post("/api/avatar/end", json={"conversationId": "conv-123"})
    assert res.status_code == 200
    assert res.json()["ended"] is False


class _FakeTts:
    def __init__(self) -> None:
        self.texts: list[str] = []

    def synthesize(self, text: str) -> bytes:
        self.texts.append(text)
        return b"ID3fake-mp3"


def test_tts_returns_audio_when_configured():
    tts = _FakeTts()
    client = TestClient(create_app(llm=_FakeLLM({}), store=InMemoryStore(), tts_client=tts))
    res = client.post("/api/tts", json={"text": "Hi, I'm Marcus."})
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/mpeg"
    assert res.content == b"ID3fake-mp3"
    assert tts.texts == ["Hi, I'm Marcus."]


def test_tts_404_when_not_configured_so_browser_falls_back():
    res = _client({}).post("/api/tts", json={"text": "Hello"})
    assert res.status_code == 404


def test_tts_rejects_oversized_text():
    client = TestClient(create_app(llm=_FakeLLM({}), store=InMemoryStore(), tts_client=_FakeTts()))
    assert client.post("/api/tts", json={"text": "x" * 1501}).status_code == 422


def test_elevenlabs_client_sends_voice_and_model_and_joins_audio():
    from llm.elevenlabs import ElevenLabsClient

    seen: dict = {}

    class _TTS:
        def convert(self, **kw):
            seen.update(kw)
            return iter([b"mp", b"3"])

    class _SDK:
        text_to_speech = _TTS()

    c = ElevenLabsClient(voice_id="v1", model_id="m1", client=_SDK())
    assert c.synthesize("hello") == b"mp3"
    assert seen["voice_id"] == "v1" and seen["model_id"] == "m1" and seen["text"] == "hello"


def test_tts_enabled_only_when_key_in_environment(monkeypatch):
    from config.settings import Settings

    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    assert Settings().elevenlabs_enabled is False
    monkeypatch.setenv("ELEVENLABS_API_KEY", "x")
    assert Settings().elevenlabs_enabled is True


def _spy_client(payloads):
    seen: dict = {}

    class _Spy(_FakeLLM):
        def structured(self, **kw):
            seen["user"] = kw["user"]
            return super().structured(**kw)

    return TestClient(create_app(llm=_Spy(payloads), store=InMemoryStore())), seen


def test_turn_and_evaluate_look_up_exemplar_server_side():
    from models.loader import find_exemplar
    ex = find_exemplar("sde-beh-ownership-1")
    q = {**_QUESTION_BODY, "exemplarId": "sde-beh-ownership-1"}
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP, "AnswerEvaluation": _EVAL})
    client.post("/api/session/turn", json={
        "question": q, "answer": "a", "followUpCount": 0, "isLast": False, "phase": "question"})
    assert ex.follow_up_hooks[0] in seen["user"]
    client.post("/api/session/evaluate", json={"question": q, "transcript": "a", "followUpCount": 0})
    assert ex.ideal_answer_points[0] in seen["user"]


def test_unknown_exemplar_id_yields_no_notes_and_no_error():
    q = {**_QUESTION_BODY, "exemplarId": "does-not-exist"}
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP, "AnswerEvaluation": _EVAL})
    r = client.post("/api/session/turn", json={
        "question": q, "answer": "a", "followUpCount": 0, "isLast": False, "phase": "question"})
    assert r.status_code == 200 and "Interviewer notes" not in seen["user"]
    r = client.post("/api/session/evaluate", json={"question": q, "transcript": "a", "followUpCount": 0})
    assert r.status_code == 200 and "Rubric anchors" not in seen["user"]


def test_exemplar_with_mismatched_type_is_ignored():
    q = {**_QUESTION_BODY, "type": "technical", "exemplarId": "sde-beh-ownership-1"}
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP, "AnswerEvaluation": _EVAL})
    client.post("/api/session/turn", json={
        "question": q, "answer": "a", "followUpCount": 0, "isLast": False, "phase": "question"})
    assert "Interviewer notes" not in seen["user"]
    client.post("/api/session/evaluate", json={"question": q, "transcript": "a", "followUpCount": 0})
    assert "Rubric anchors" not in seen["user"]


def test_bank_notes_only_attached_during_the_question_phase():
    q = {**_QUESTION_BODY, "exemplarId": "sde-beh-ownership-1"}
    body = {"question": q, "answer": "a", "followUpCount": 0, "isLast": False}
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP})
    client.post("/api/session/turn", json={**body, "phase": "background"})
    assert "Interviewer notes" not in seen["user"]
    client.post("/api/session/turn", json={**body, "phase": "question"})
    assert "Interviewer notes" in seen["user"]


def test_turn_rejects_negative_follow_up_count_and_bad_level():
    client = _client({})
    base = {"question": _QUESTION_BODY, "answer": "a", "isLast": False}
    assert client.post("/api/session/turn", json={**base, "followUpCount": -1}).status_code == 422
    assert client.post("/api/session/turn", json={**base, "followUpCount": 0, "level": "wizard"}).status_code == 422
    assert client.post("/api/session/evaluate", json={
        "question": _QUESTION_BODY, "transcript": "a", "followUpCount": -1}).status_code == 422


# --- per-agent temperature -------------------------------------------------

def test_each_agent_gets_its_settings_temperature(monkeypatch):
    from config.settings import Settings
    temps = {"intake": 0.11, "planner": 0.22, "interviewer": 0.33, "evaluator": 0.44,
             "memory": 0.55, "coach": 0.66}
    for name, t in temps.items():
        monkeypatch.setenv(f"INTERVIEWAI_{name.upper()}_TEMPERATURE", str(t))
    seen: dict[str, float] = {}

    class _Spy(_FakeLLM):
        def structured(self, **kw):
            seen[kw["agent"]] = kw["temperature"]
            return super().structured(**kw)

    llm = _Spy({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN, "InterviewDecision": _DECISION_ADVANCE,
                "AnswerEvaluation": _EVAL, "MemoryProfile": _MEMORY, "CoachResponse": _COACH_PAYLOAD})
    client = TestClient(create_app(llm=llm, settings=Settings(), store=InMemoryStore()))
    client.post("/api/session/start", json={"resumeText": "r", "jdText": "j", "role": "sde"})
    client.post("/api/session/turn", json={
        "question": _QUESTION_BODY, "answer": "a", "followUpCount": 0, "isLast": False, "phase": "question"})
    client.post("/api/session/evaluate", json={"question": _QUESTION_BODY, "transcript": "a", "followUpCount": 0})
    client.post("/api/coach", json={"question": _QUESTION_BODY, "transcript": "a"})
    client.post("/api/session/finalize", json={"evaluations": [_EVAL], "priorMemory": None})
    assert seen == temps


# --- phase 1: coding problems, conduct strikes, company style ---------------

_CODING_Q = {
    "id": "q1", "type": "coding",
    "prompt": "Let's do a coding problem: given a list of numbers and a target, find two that add up to it.",
    "targetDifficulty": 2, "weightedFromWeakness": False, "exemplarId": "code-two-sum",
}
_PRIVATE_KEYS = {"referenceSolution", "hints", "followUps", "rubric", "idealAnswerPoints", "weakAnswerSigns"}


class _NoCallLLM:
    def structured(self, **kw):
        raise AssertionError("the model must not be called")


def _turn(client, **body):
    return client.post("/api/session/turn", json={
        "question": _QUESTION_BODY, "answer": "a", "followUpCount": 0, "isLast": False, **body})


def test_coding_problem_endpoint_returns_public_fields_only():
    from models.coding import find_problem
    res = _client({}).get("/api/coding/problems/code-two-sum")
    assert res.status_code == 200
    body = res.json()
    assert body == find_problem("code-two-sum").public()
    assert not _PRIVATE_KEYS & set(body)
    assert body["starterCode"] and body["tests"] and body["statement"]


def test_coding_problem_endpoint_404_for_unknown_id():
    res = _client({}).get("/api/coding/problems/code-does-not-exist")
    assert res.status_code == 404


def test_coding_problem_endpoint_requires_auth_when_enabled(monkeypatch):
    monkeypatch.setenv("INTERVIEWAI_AUTH_REQUIRED", "true")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_USER_POOL_ID", "us-west-2_test")
    monkeypatch.setenv("INTERVIEWAI_COGNITO_CLIENT_ID", "testclient")
    auth._settings.cache_clear()
    assert _client({}).get("/api/coding/problems/code-two-sum").status_code == 401


def test_turn_rejects_oversized_or_invalid_phase1_fields():
    client = _client({"InterviewDecision": _DECISION_FOLLOW_UP})
    assert _turn(client, answer="x" * 6000).status_code == 200
    assert _turn(client, answer="x" * 6001).status_code == 422
    assert _turn(client, code="x" * 20001).status_code == 422
    assert _turn(client, testResults="x" * 4001).status_code == 422
    assert _turn(client, strikes=4).status_code == 422
    assert _turn(client, strikes=-1).status_code == 422
    assert _turn(client, codingStage="debugging").status_code == 422
    assert _turn(client, event="nudge").status_code == 422
    assert _turn(client, companyStyle="acme").status_code == 422
    ev = {"question": _CODING_Q, "transcript": "t", "followUpCount": 0}
    assert client.post("/api/session/evaluate", json={**ev, "code": "x" * 20001}).status_code == 422
    assert client.post("/api/session/evaluate", json={**ev, "testResults": "x" * 4001}).status_code == 422


def test_abuse_gets_fixed_replies_and_ends_on_the_third_strike_without_calling_the_model():
    client = TestClient(create_app(llm=_NoCallLLM(), store=InMemoryStore()))
    prompt = _QUESTION_BODY["prompt"]
    r1 = _turn(client, answer="you're an idiot", strikes=0, phase="question")
    assert r1.status_code == 200
    assert r1.json()["strikes"] == 1 and r1.json()["costUsd"] == 0
    d1 = r1.json()["decision"]
    assert d1["action"] == "clarify" and d1["currentQuestionId"] == "q0"
    assert d1["say"] == f"Let's keep this professional. So — {prompt}"
    r2 = _turn(client, answer="shut up, bot", strikes=1, phase="question")
    assert r2.json()["strikes"] == 2
    assert r2.json()["decision"]["action"] == "clarify"
    assert r2.json()["decision"]["say"] == (
        f"I'll be straightforward: if that happens again, I'll have to end the interview. So — {prompt}")
    r3 = _turn(client, answer="wh0re", strikes=2, phase="question")  # a blocked term counts the same
    assert r3.json()["strikes"] == 3
    assert r3.json()["decision"]["action"] == "end"
    assert r3.json()["decision"]["say"] == "I'm going to end the interview here. Take care."
    r4 = _turn(client, answer="you're an idiot", strikes=3)
    assert r4.json()["strikes"] == 4 and r4.json()["decision"]["action"] == "end"


def test_conduct_reply_restates_the_phase_ask_outside_the_question_phase():
    client = TestClient(create_app(llm=_NoCallLLM(), store=InMemoryStore()))
    say = _turn(client, answer="you're an idiot", phase="warmup").json()["decision"]["say"]
    assert say.startswith("Let's keep this professional. So — ")
    assert _QUESTION_BODY["prompt"] not in say  # never jumps ahead to the first planned question
    say = _turn(client, answer="you're an idiot", phase="closing").json()["decision"]["say"]
    assert "questions" in say and _QUESTION_BODY["prompt"] not in say


def test_casual_swearing_reaches_the_interviewer_and_keeps_the_strike_count():
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP})
    res = _turn(client, answer="damn, I forgot the base case", strikes=2)
    assert res.status_code == 200
    assert res.json()["strikes"] == 2
    assert "damn, I forgot the base case" in seen["user"]


def test_checkin_event_with_empty_answer_calls_the_interviewer():
    client, seen = _spy_client({"InterviewDecision": {**_DECISION_FOLLOW_UP, "action": "clarify"}})
    res = _turn(client, question=_CODING_Q, answer="", event="checkin", codingStage="coding", phase="question")
    assert res.status_code == 200 and res.json()["strikes"] == 0
    assert "Event: checkin" in seen["user"] and "Coding stage: coding" in seen["user"]


def test_turn_adds_coding_notes_and_fences_code_for_a_coding_question():
    from models.coding import find_problem
    p = find_problem("code-two-sum")
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP})
    code, results = "def two_sum(nums, target):\n    return []", "visible 0/3 passed"
    _turn(client, question=_CODING_Q, phase="question", code=code, testResults=results, codingStage="review")
    assert p.hints[0] in seen["user"] and p.target_complexity["time"] in seen["user"]
    assert f"<candidate_code>\n{code}\n</candidate_code>" in seen["user"]
    assert f"<test_results>\n{results}\n</test_results>" in seen["user"]
    assert "Coding stage: review" in seen["user"]
    _turn(client, question=_CODING_Q, phase="background")  # notes only during the question itself
    assert "Interviewer notes" not in seen["user"]


def test_unknown_or_mismatched_coding_exemplar_gets_no_notes():
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP, "AnswerEvaluation": _EVAL})
    for q in ({**_CODING_Q, "exemplarId": "code-made-up"},
              {**_CODING_Q, "exemplarId": "sde-beh-ownership-1"},   # a bank id on a coding question
              {**_CODING_Q, "type": "technical"}):                   # a problem id on a non-coding question
        assert _turn(client, question=q, phase="question").status_code == 200
        assert "Interviewer notes" not in seen["user"]
        client.post("/api/session/evaluate", json={"question": q, "transcript": "t", "followUpCount": 0})
        assert "Rubric anchors" not in seen["user"]


def test_turn_adds_the_company_style_note_server_side():
    from models.company_style import find_style
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP})
    _turn(client, companyStyle="amazon", phase="warmup")
    amazon = find_style("amazon")
    assert f"Company style: {amazon.name}. {amazon.interviewer_note}" in seen["user"]
    _turn(client)
    assert f"Company style: {find_style('general').name}." in seen["user"]


def test_turn_uses_no_name_when_the_name_is_flagged():
    # Real names can trip the filter ("Greg Dyke"), so a flagged name is never an error:
    # Marcus just doesn't use a name.
    client, seen = _spy_client({"InterviewDecision": _DECISION_FOLLOW_UP})
    for name in ("Greg Dyke", "wh0re"):
        res = _turn(client, candidateName=name, phase="warmup")
        assert res.status_code == 200
        assert "<candidate_name>\n\n</candidate_name>" in seen["user"]
        assert name not in seen["user"]
    _turn(client, candidateName="Karthik")
    assert "<candidate_name>\nKarthik\n</candidate_name>" in seen["user"]


def test_evaluate_scores_coding_with_problem_anchors_and_fenced_code():
    from models.coding import find_problem
    p = find_problem("code-two-sum")
    client, seen = _spy_client({"AnswerEvaluation": _EVAL})
    res = client.post("/api/session/evaluate", json={
        "question": _CODING_Q, "transcript": "A: hash map", "followUpCount": 2,
        "code": "def two_sum(nums, target): ...", "testResults": "visible 3/3, hidden 10/10"})
    assert res.status_code == 200
    assert p.rubric["efficiency"] in seen["user"]
    assert "<candidate_code>\ndef two_sum(nums, target): ...\n</candidate_code>" in seen["user"]
    assert "<test_results>\nvisible 3/3, hidden 10/10\n</test_results>" in seen["user"]


def test_start_succeeds_with_a_flagged_name_and_never_puts_it_in_a_prompt():
    users: list[str] = []

    class _Spy(_FakeLLM):
        def structured(self, **kw):
            users.append(kw["user"])
            return super().structured(**kw)

    client = TestClient(create_app(llm=_Spy({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN}), store=InMemoryStore()))
    res = client.post("/api/session/start", json={
        "resumeText": "r", "jdText": "j", "role": "sde", "candidateName": "Greg Dyke"})
    assert res.status_code == 200
    assert len(users) == 2 and not any("Dyke" in u for u in users)


def test_start_accepts_coding_mode_and_passes_company_style_to_the_planner():
    client, seen = _spy_client({"IntakeProfile": _INTAKE, "QuestionPlan": _PLAN})
    res = client.post("/api/session/start", json={
        "resumeText": "r", "jdText": "j", "role": "sde", "candidateName": "Karthik",
        "mode": "coding", "level": "junior", "companyStyle": "amazon"})
    assert res.status_code == 200
    assert "CompanyStyle: Amazon-style" in seen["user"] and "CodingProblems" in seen["user"]
    bad = client.post("/api/session/start", json={
        "resumeText": "r", "jdText": "j", "role": "sde", "companyStyle": "acme"})
    assert bad.status_code == 422


def test_coach_rejects_abusive_input():
    client = TestClient(create_app(llm=_NoCallLLM(), store=InMemoryStore()))
    res = client.post("/api/coach", json={"question": _QUESTION_BODY, "transcript": "A: f*** you"})
    assert res.status_code == 422
    assert res.json()["detail"] == "Let's keep it professional."


def test_finalize_stores_company_style_and_conduct_end():
    store = InMemoryStore()
    client = _client({"MemoryProfile": _MEMORY}, store=store)
    client.post("/api/session/finalize", json={
        **_finalize_body("sess-conduct"), "companyStyle": "amazon", "endedForConduct": True})
    body = client.get("/api/sessions/sess-conduct").json()
    assert body["companyStyle"] == "amazon" and body["endedForConduct"] is True
    client.post("/api/session/finalize", json=_finalize_body("sess-plain"))
    body = client.get("/api/sessions/sess-plain").json()
    assert body["companyStyle"] == "general" and body["endedForConduct"] is False
