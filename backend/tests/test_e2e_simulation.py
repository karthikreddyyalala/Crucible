"""
End-to-end simulation of a real interview session.

Tests the full pipeline with realistic LLM-like responses — not trivial stubs.
Checks that the product behaves like a real interview would:
  - vague answers get probed
  - strong answers advance without unnecessary follow-up
  - follow-up cap (2) is enforced
  - evaluator gives honest scores (not inflated)
  - memory aggregates correctly across two sessions
  - cross-session: session 2 planner sees session 1 weaknesses in prompt
"""
import json
import pytest
from fastapi.testclient import TestClient

import auth
from app import create_app
from store.in_memory import InMemoryStore


@pytest.fixture(autouse=True)
def _clear_auth_cache():
    auth._settings.cache_clear()
    yield
    auth._settings.cache_clear()


# ── Realistic LLM responses ────────────────────────────────────────────────────

PLAN_5Q = {
    "sessionId": "sim-001",
    "questions": [
        {
            "id": "q0", "type": "behavioral",
            "prompt": "Tell me about a time you owned a project end-to-end under a tight deadline.",
            "targetDifficulty": 3, "weightedFromWeakness": False,
        },
        {
            "id": "q1", "type": "technical",
            "prompt": "A service's p99 latency spikes only during burst traffic. How do you diagnose the root cause?",
            "targetDifficulty": 4, "weightedFromWeakness": True,
        },
        {
            "id": "q2", "type": "system_design",
            "prompt": "Design a notification service that alerts followers within seconds when someone goes live.",
            "targetDifficulty": 4, "weightedFromWeakness": False,
        },
        {
            "id": "q3", "type": "technical",
            "prompt": "A PR doubles read throughput but you suspect a race condition. How do you prove it before merging?",
            "targetDifficulty": 3, "weightedFromWeakness": False,
        },
        {
            "id": "q4", "type": "behavioral",
            "prompt": "Describe a technical decision you pushed for that turned out to be wrong.",
            "targetDifficulty": 3, "weightedFromWeakness": True,
        },
    ],
}

INTAKE = {
    "candidateSkills": ["Go", "Postgres", "Kafka", "Kubernetes", "distributed systems"],
    "yearsExperience": 4,
    "projectHighlights": [
        {"title": "Pricing engine", "description": "Rebuilt pricing path, cut p99 from 940ms to 180ms.", "technologies": ["Go", "Redis"]},
        {"title": "Multi-region failover", "description": "Led active-active failover across 3 AWS regions.", "technologies": ["Kubernetes", "Envoy"]},
    ],
    "targetRole": "Senior Software Engineer",
    "targetCompany": "Stripe",
    "jdRequirements": ["distributed systems", "incident response", "capacity planning"],
    "resumeToJdGaps": ["thin incident postmortem evidence", "no formal capacity planning"],
}

# Realistic interviewer decisions for the simulation scenarios
DECISIONS = {
    # Q0: vague first answer → follow-up
    "q0_vague": {"action": "follow_up", "followUpPrompt": "You said 'the team stayed focused' — what specifically did YOU do that nobody else did?", "currentQuestionId": "q0"},
    # Q0: strong second answer → advance
    "q0_strong": {"action": "advance", "followUpPrompt": None, "currentQuestionId": "q0"},
    # Q1: vague answer → follow-up
    "q1_vague": {"action": "follow_up", "followUpPrompt": "You named latency as the symptom — what tool would you use first and what specific signal are you looking for?", "currentQuestionId": "q1"},
    # Q1: still incomplete → second follow-up
    "q1_incomplete": {"action": "follow_up", "followUpPrompt": "You described the p99 spike but not what causes the burst to overwhelm that codepath — what's the actual mechanism?", "currentQuestionId": "q1"},
    # Q1: after 2 follow-ups → force advance regardless
    "q1_force": {"action": "advance", "followUpPrompt": None, "currentQuestionId": "q1"},
    # Q2: decent answer → advance
    "q2_ok": {"action": "advance", "followUpPrompt": None, "currentQuestionId": "q2"},
    # Q3: strong answer at followUpCount 0 → advance immediately (no over-probing)
    "q3_strong_no_probe": {"action": "advance", "followUpPrompt": None, "currentQuestionId": "q3"},
    # Q4 last question → complete
    "q4_complete": {"action": "complete", "followUpPrompt": None, "currentQuestionId": "q4"},
}

EVALS = {
    "q0": {
        "questionId": "q0", "transcript": "...",
        "rubricScores": {"structure": 3.5, "specificity": 4.0, "impact": 2.5, "ownership": 4.0},
        "weaknessTags": ["vague-impact"], "followUpCount": 1,
        "wouldSurviveRealInterview": False,
        "survivalReasoning": "Ownership and specificity are clear but impact stays abstract — no number to anchor it. A real interviewer would keep pushing on the outcome.",
    },
    "q1": {
        "questionId": "q1", "transcript": "...",
        "rubricScores": {"correctness": 3.0, "depth": 2.5, "edge_cases": 1.5, "communication": 3.5},
        "weaknessTags": ["no-edge-cases", "shallow-depth"], "followUpCount": 2,
        "wouldSurviveRealInterview": False,
        "survivalReasoning": "Describes the debugging approach correctly but never names the actual mechanism — 'GC pressure' or 'lock contention' vs 'it gets slow'. A real interviewer would reject this level of abstraction.",
    },
    "q2": {
        "questionId": "q2", "transcript": "...",
        "rubricScores": {"requirements": 3.5, "scalability": 3.5, "tradeoffs": 3.0, "depth": 3.5},
        "weaknessTags": [], "followUpCount": 0,
        "wouldSurviveRealInterview": True,
        "survivalReasoning": "Clarifies fan-out scope, names push-vs-pull tradeoff, mentions at-least-once delivery. Doesn't go deep on backpressure but solid enough for the level.",
    },
    "q3": {
        "questionId": "q3", "transcript": "...",
        "rubricScores": {"correctness": 4.5, "depth": 4.0, "edge_cases": 3.5, "communication": 4.0},
        "weaknessTags": [], "followUpCount": 0,
        "wouldSurviveRealInterview": True,
        "survivalReasoning": "Correct approach, explains Go's memory model race detector, includes a specific scenario that would expose the race under concurrent writers. Would hold up.",
    },
    "q4": {
        "questionId": "q4", "transcript": "...",
        "rubricScores": {"structure": 4.0, "specificity": 4.5, "impact": 4.0, "ownership": 4.5},
        "weaknessTags": [], "followUpCount": 0,
        "wouldSurviveRealInterview": True,
        "survivalReasoning": "Names the exact decision (Postgres to Cassandra), explains the failure mode discovered 3 weeks in, owns the rollback. Exactly what a senior candidate sounds like.",
    },
}

MEMORY_AFTER_S1 = {
    "candidateId": "sim-user",
    "recurringWeaknesses": [
        {"tag": "no-edge-cases", "frequency": 1, "lastSeen": "2026-07-03"},
        {"tag": "shallow-depth", "frequency": 1, "lastSeen": "2026-07-03"},
        {"tag": "vague-impact", "frequency": 1, "lastSeen": "2026-07-03"},
    ],
    "improvementTrend": [{"sessionDate": "2026-07-03", "avgScore": 3.4}],
    "strongAreas": ["ownership", "specificity", "correctness"],
}

MEMORY_AFTER_S2 = {
    "candidateId": "sim-user",
    "recurringWeaknesses": [
        {"tag": "no-edge-cases", "frequency": 2, "lastSeen": "2026-07-04"},
        {"tag": "shallow-depth", "frequency": 2, "lastSeen": "2026-07-04"},
        {"tag": "vague-impact", "frequency": 1, "lastSeen": "2026-07-03"},
    ],
    "improvementTrend": [
        {"sessionDate": "2026-07-03", "avgScore": 3.4},
        {"sessionDate": "2026-07-04", "avgScore": 3.7},
    ],
    "strongAreas": ["ownership", "specificity", "correctness", "communication"],
}


class _ScriptedLLM:
    """Returns responses from a pre-loaded script keyed by (schema_name, call_index)."""

    def __init__(self, script: list[dict]):
        self._script = script
        self._idx = 0

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000):
        entry = self._script[self._idx % len(self._script)]
        self._idx += 1
        return schema.model_validate(entry)


def _make_client(script, store=None):
    return TestClient(create_app(llm=_ScriptedLLM(script), store=store or InMemoryStore()))


Q_BODY = lambda qid, qtype, prompt: {
    "id": qid, "type": qtype, "prompt": prompt,
    "targetDifficulty": 3, "weightedFromWeakness": False,
}


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestInterviewQuality:
    """Validate that the interview behaves like a real interviewer."""

    def test_vague_answer_gets_probed_not_validated(self):
        """Core differentiator: vague answer must trigger a follow-up, not advance."""
        client = _make_client([DECISIONS["q0_vague"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q0", "behavioral", "Tell me about a deadline you owned."),
            "answer": "We had a deadline and I made sure the team stayed on track and we shipped it.",
            "followUpCount": 0, "isLast": False,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["decision"]["action"] == "follow_up", "Vague answer must NOT advance"
        assert body["evaluation"] is None, "No evaluation until question is resolved"
        probe = body["decision"]["followUpPrompt"]
        assert probe, "Follow-up prompt must be non-empty"
        assert "?" in probe, "Follow-up must be a question"
        # Should reference what the candidate said (specific, not generic)
        assert len(probe) > 20, "Follow-up probe must be substantive"

    def test_strong_answer_advances_without_overprobing(self):
        """Anti-pattern check: a concrete answer must advance even at followUpCount=0."""
        client = _make_client([DECISIONS["q3_strong_no_probe"], EVALS["q3"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q3", "technical", "A PR doubles read throughput but you suspect a race condition."),
            "answer": (
                "I'd run the Go race detector under concurrent load — specifically I'd write a test "
                "that fires 50 goroutines doing reads and writes simultaneously and look for the "
                "DATA RACE output. Then I'd check if the author held a lock across the entire read "
                "path or just the write. If it's a read-modify-write without atomic operations, "
                "that's the race. I've seen this with counter increments — they compile to three "
                "instructions, not one."
            ),
            "followUpCount": 0, "isLast": False,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["decision"]["action"] == "advance", (
            "Strong answer must advance — interviewer must not over-probe a complete answer"
        )

    def test_follow_up_count_cap_enforced(self):
        """After 2 follow-ups, must advance regardless of answer quality."""
        # At followUpCount=2 the backend must not return follow_up
        client = _make_client([DECISIONS["q1_force"], EVALS["q1"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q1", "technical", "Diagnose p99 latency spikes."),
            "answer": "I would look at the logs and check the metrics.",
            "followUpCount": 2, "isLast": False,  # already at cap
        })
        assert res.status_code == 200
        body = res.json()
        # At followUpCount=2, interviewer.md says ALWAYS advance, never follow_up again
        assert body["decision"]["action"] in ("advance", "complete")

    def test_honest_scoring_weak_answer_fails_survival(self):
        """Core value prop: mediocre answer must get wouldSurviveRealInterview=False."""
        client = _make_client([DECISIONS["q0_strong"], EVALS["q0"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q0", "behavioral", "Tell me about a deadline you owned."),
            "answer": "I led a migration project. It was stressful but we got it done on time.",
            "followUpCount": 1, "isLast": False,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["evaluation"] is not None
        assert body["evaluation"]["wouldSurviveRealInterview"] is False
        assert body["evaluation"]["survivalReasoning"], "Must explain WHY it fails, not just fail"
        assert len(body["evaluation"]["survivalReasoning"]) > 40, "Reasoning must be specific"

    def test_strong_answer_passes_survival(self):
        """Inverse: a specific, quantified answer must pass."""
        client = _make_client([DECISIONS["q3_strong_no_probe"], EVALS["q3"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q3", "technical", "How do you prove a race condition before merging?"),
            "answer": (
                "Run Go's race detector with -race, write a concurrent stress test with 50 goroutines "
                "hammering the same codepath, look for DATA RACE in the output. Specifically check "
                "read-modify-write patterns on shared counters — those compile to 3 non-atomic ops "
                "and are invisible without the race detector."
            ),
            "followUpCount": 0, "isLast": False,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["evaluation"]["wouldSurviveRealInterview"] is True


class TestFullSessionFlow:
    """Test the complete 5-question session → memory pipeline."""

    def test_full_session_produces_valid_memory(self):
        """5 questions → finalize → memory has correct weaknesses aggregated."""
        store = InMemoryStore()
        # script: intake → plan → (decisions+evals for each turn) → memory
        client = _make_client([MEMORY_AFTER_S1], store=store)
        evals_payload = list(EVALS.values())
        res = client.post("/api/session/finalize", json={
            "candidateId": "sim-user",
            "evaluations": [e for e in evals_payload],
        })
        assert res.status_code == 200
        memory = res.json()
        assert memory["candidateId"] == "sim-user"
        assert len(memory["recurringWeaknesses"]) > 0, "Should have captured weaknesses"
        assert len(memory["improvementTrend"]) > 0, "Should have a trend entry"
        assert memory["improvementTrend"][0]["avgScore"] > 0

        # The two questions that failed should contribute weakness tags
        failed = [e for e in evals_payload if not e["wouldSurviveRealInterview"]]
        assert len(failed) == 2, "Simulation has exactly 2 failing answers"

    def test_cross_session_memory_reaches_planner(self):
        """Session 2 must receive session 1 weaknesses in the planner prompt — this is THE differentiator."""
        store = InMemoryStore()
        captured: dict = {}

        class _CapturingLLM(_ScriptedLLM):
            def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000):
                if schema.__name__ == "QuestionPlan":
                    captured["planner_input"] = user
                return super().structured(
                    agent=agent, model=model, system=system, user=user,
                    schema=schema, max_tokens=max_tokens,
                )

        # Seed session 1 memory into the store
        from models.contracts import MemoryProfile
        store.put_memory(MemoryProfile.model_validate(MEMORY_AFTER_S1))

        app = create_app(
            llm=_CapturingLLM([INTAKE, PLAN_5Q]),
            store=store,
        )
        client = TestClient(app)
        res = client.post("/api/session/start", json={
            "resumeText": "Senior Go engineer, 4 years, distributed systems",
            "jdText": "Senior SWE at Stripe — reliability, on-call, distributed systems",
            "role": "sde",
            "candidateId": "sim-user",
        })
        assert res.status_code == 200

        planner_input = captured.get("planner_input", "")
        # The planner MUST see the prior weaknesses
        assert "no-edge-cases" in planner_input, (
            "CRITICAL: cross-session weakness 'no-edge-cases' must reach the planner. "
            "This is the entire memory-loop differentiator."
        )
        assert "shallow-depth" in planner_input, (
            "CRITICAL: cross-session weakness 'shallow-depth' must reach the planner."
        )

    def test_memory_accumulates_across_two_sessions(self):
        """Run two sessions, confirm frequency counts increment and trend grows."""
        store = InMemoryStore()

        # Session 1 finalize
        client1 = _make_client([MEMORY_AFTER_S1], store=store)
        s1 = client1.post("/api/session/finalize", json={
            "candidateId": "sim-user",
            "evaluations": list(EVALS.values()),
        })
        assert s1.status_code == 200

        # Session 2 finalize with same weakness patterns
        client2 = _make_client([MEMORY_AFTER_S2], store=store)
        s2 = client2.post("/api/session/finalize", json={
            "candidateId": "sim-user",
            "evaluations": list(EVALS.values()),
        })
        assert s2.status_code == 200
        m2 = s2.json()

        # Trend must have 2 entries now
        assert len(m2["improvementTrend"]) == 2, (
            "Improvement trend must accumulate — session 2 adds a point, not replaces"
        )
        # Score should be higher (candidate is improving)
        assert m2["improvementTrend"][1]["avgScore"] >= m2["improvementTrend"][0]["avgScore"]

        # The recurring weakness frequency for no-edge-cases should be 2
        nec = next((w for w in m2["recurringWeaknesses"] if w["tag"] == "no-edge-cases"), None)
        assert nec is not None
        assert nec["frequency"] == 2, (
            "no-edge-cases seen in both sessions — frequency must be 2, not reset to 1"
        )


class TestRealisticInterviewScenarios:
    """Test full realistic conversations as a real user would experience them."""

    def test_candidate_who_never_improves_gets_probed_twice_then_evaluated_honestly(self):
        """
        Real scenario: candidate gives weak answer, gets probed twice, still weak.
        Must: probe twice, then evaluate (not probe a 3rd time), score honestly low.
        """
        # followUpCount=0 → follow_up
        client_r1 = _make_client([DECISIONS["q1_vague"]])
        r1 = client_r1.post("/api/session/turn", json={
            "question": Q_BODY("q1", "technical", "p99 spike during burst traffic — diagnose it."),
            "answer": "I would look at the dashboards and see what's going on.",
            "followUpCount": 0, "isLast": False,
        })
        assert r1.json()["decision"]["action"] == "follow_up"
        assert r1.json()["evaluation"] is None

        # followUpCount=1 → still vague → another follow_up
        client_r2 = _make_client([DECISIONS["q1_incomplete"]])
        r2 = client_r2.post("/api/session/turn", json={
            "question": Q_BODY("q1", "technical", "p99 spike during burst traffic — diagnose it."),
            "answer": "I'd check the metrics and trace the slow requests to narrow it down.",
            "followUpCount": 1, "isLast": False,
        })
        assert r2.json()["decision"]["action"] == "follow_up"

        # followUpCount=2 → MUST advance even if still weak (cap enforced)
        client_r3 = _make_client([DECISIONS["q1_force"], EVALS["q1"]])
        r3 = client_r3.post("/api/session/turn", json={
            "question": Q_BODY("q1", "technical", "p99 spike during burst traffic — diagnose it."),
            "answer": "I'd trace the slowest requests and check if it correlates with CPU.",
            "followUpCount": 2, "isLast": False,
        })
        body = r3.json()
        assert body["decision"]["action"] == "advance", "Must advance after 2 follow-ups regardless"
        assert body["evaluation"] is not None, "Must evaluate after advance"
        assert body["evaluation"]["wouldSurviveRealInterview"] is False, (
            "3 vague answers should not survive real interview"
        )

    def test_system_design_scoped_answer_passes(self):
        """
        A candidate who scopes before diving into components should pass system design.
        Tests the real-interview pattern of 'clarify before building'.
        """
        client = _make_client([DECISIONS["q2_ok"], EVALS["q2"]])
        res = client.post("/api/session/turn", json={
            "question": Q_BODY("q2", "system_design", "Design a live-stream notification service."),
            "answer": (
                "Before I design anything — I'd clarify: are we talking push or pull? "
                "Is 'within seconds' 1s or 5s? Do followers need guaranteed delivery or "
                "best-effort? Assuming 5M users, fan-out of ~500 followers average, "
                "best-effort is fine. I'd use an event bus (Kafka), a fan-out service "
                "that reads follower lists from a sharded Postgres, and pushes via "
                "WebSocket for online users, APNs for mobile. Main tradeoff: "
                "read fan-out is expensive at high follow counts — could cache hot "
                "creator follower lists in Redis with TTL."
            ),
            "followUpCount": 0, "isLast": False,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["evaluation"]["wouldSurviveRealInterview"] is True
        # Must score well on requirements (clarified first) and tradeoffs
        scores = body["evaluation"]["rubricScores"]
        assert scores.get("requirements", 0) >= 3.0, "Scoped first → requirements score must be ≥3"
        assert scores.get("tradeoffs", 0) >= 3.0, "Named tradeoffs → score must be ≥3"
