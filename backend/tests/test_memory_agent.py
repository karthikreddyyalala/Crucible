from agents.memory import MemoryAgent
from models.contracts import AnswerEvaluation, MemoryProfile, RecurringWeakness, TrendPoint


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload
        self.last: dict = {}

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        self.last = {"model": model, "user": user}
        return schema.model_validate(self._payload)


def _eval(question_id: str, tags: list[str], scores: dict[str, float], survived: bool) -> AnswerEvaluation:
    return AnswerEvaluation(
        questionId=question_id,
        transcript="some answer",
        rubricScores=scores,
        weaknessTags=tags,
        followUpCount=1,
        wouldSurviveRealInterview=survived,
        survivalReasoning="test reasoning",
    )


_EMPTY_MEMORY = MemoryProfile(
    candidateId="cand-1",
    recurringWeaknesses=[],
    improvementTrend=[],
    strongAreas=[],
)

_UPDATED_MEMORY_PAYLOAD = {
    "candidateId": "cand-1",
    "recurringWeaknesses": [
        {"tag": "no-edge-cases", "frequency": 2, "lastSeen": "2026-06-22"},
        {"tag": "shallow-depth", "frequency": 1, "lastSeen": "2026-06-22"},
    ],
    "improvementTrend": [{"sessionDate": "2026-06-22", "avgScore": 2.75}],
    "strongAreas": ["correctness"],
}


def test_memory_agent_passes_evaluations_and_existing_memory_to_llm():
    llm = _FakeLLM(_UPDATED_MEMORY_PAYLOAD)
    agent = MemoryAgent(llm=llm, model="mem-model")
    evals = [
        _eval("q1", ["no-edge-cases", "shallow-depth"], {"correctness": 4.0, "depth": 1.5}, False),
        _eval("q2", ["no-edge-cases"], {"correctness": 4.5, "depth": 1.0}, False),
    ]
    result = agent.run(
        candidate_id="cand-1",
        session_date="2026-06-22",
        evaluations=evals,
        existing_memory=_EMPTY_MEMORY,
    )

    assert result.candidate_id == "cand-1"
    assert len(result.recurring_weaknesses) == 2
    assert result.recurring_weaknesses[0].tag == "no-edge-cases"
    assert result.recurring_weaknesses[0].frequency == 2
    assert len(result.improvement_trend) == 1
    assert result.improvement_trend[0].avg_score == 2.75
    # verify LLM received the right context
    assert "cand-1" in llm.last["user"]
    assert "no-edge-cases" in llm.last["user"]
    assert "2026-06-22" in llm.last["user"]
    assert llm.last["model"] == "mem-model"


def test_memory_agent_merges_with_existing_weaknesses():
    existing = MemoryProfile(
        candidateId="cand-1",
        recurringWeaknesses=[
            RecurringWeakness(tag="no-edge-cases", frequency=3, lastSeen="2026-06-01"),
        ],
        improvementTrend=[TrendPoint(sessionDate="2026-06-01", avgScore=2.0)],
        strongAreas=[],
    )
    merged_payload = {
        "candidateId": "cand-1",
        "recurringWeaknesses": [
            {"tag": "no-edge-cases", "frequency": 4, "lastSeen": "2026-06-22"},
        ],
        "improvementTrend": [
            {"sessionDate": "2026-06-01", "avgScore": 2.0},
            {"sessionDate": "2026-06-22", "avgScore": 3.5},
        ],
        "strongAreas": [],
    }
    llm = _FakeLLM(merged_payload)
    agent = MemoryAgent(llm=llm, model="mem-model")
    evals = [_eval("q1", ["no-edge-cases"], {"correctness": 3.5}, True)]

    result = agent.run(
        candidate_id="cand-1",
        session_date="2026-06-22",
        evaluations=evals,
        existing_memory=existing,
    )

    assert result.recurring_weaknesses[0].frequency == 4
    assert len(result.improvement_trend) == 2
    # existing memory passed to LLM
    assert "2026-06-01" in llm.last["user"]
