from graph.session_end import build_session_end_graph, SessionEndState
from models.contracts import AnswerEvaluation, MemoryProfile


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        return schema.model_validate(self._payload)


def _eval(qid: str, tags: list[str]) -> AnswerEvaluation:
    return AnswerEvaluation(
        questionId=qid,
        transcript="answer",
        rubricScores={"correctness": 3.0},
        weaknessTags=tags,
        followUpCount=0,
        wouldSurviveRealInterview=True,
        survivalReasoning="ok",
    )


_UPDATED_MEMORY = {
    "candidateId": "cand-1",
    "recurringWeaknesses": [{"tag": "no-edge-cases", "frequency": 1, "lastSeen": "2026-06-22"}],
    "improvementTrend": [{"sessionDate": "2026-06-22", "avgScore": 3.0}],
    "strongAreas": [],
}


def test_session_end_graph_calls_memory_agent_and_returns_profile():
    llm = _FakeLLM(_UPDATED_MEMORY)
    graph = build_session_end_graph(llm=llm, memory_model="mem-model")

    evals = [_eval("q1", ["no-edge-cases"]), _eval("q2", [])]
    existing = MemoryProfile(
        candidateId="cand-1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[],
    )

    state: SessionEndState = {
        "candidate_id": "cand-1",
        "session_date": "2026-06-22",
        "evaluations": evals,
        "existing_memory": existing,
    }
    result = graph.invoke(state)

    assert result["updated_memory"].candidate_id == "cand-1"
    assert len(result["updated_memory"].recurring_weaknesses) == 1
    assert result["updated_memory"].recurring_weaknesses[0].tag == "no-edge-cases"


def test_session_end_graph_passes_all_evaluations():
    llm = _FakeLLM(_UPDATED_MEMORY)
    graph = build_session_end_graph(llm=llm, memory_model="mem-model")

    evals = [_eval(f"q{i}", ["shallow-depth"]) for i in range(5)]
    existing = MemoryProfile(
        candidateId="cand-1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[],
    )

    result = graph.invoke({
        "candidate_id": "cand-1",
        "session_date": "2026-06-22",
        "evaluations": evals,
        "existing_memory": existing,
    })

    assert isinstance(result["updated_memory"], MemoryProfile)
