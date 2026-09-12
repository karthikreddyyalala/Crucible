from agents.evaluator import EvaluatorAgent
from models.contracts import PlannedQuestion


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload
        self.last: dict = {}

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        self.last = {"model": model, "system": system, "user": user}
        return schema.model_validate(self._payload)


_Q_TECHNICAL = PlannedQuestion(
    id="q-tech-1", type="technical",
    prompt="Explain how Floyd's algorithm detects a cycle in a linked list.",
    targetDifficulty=3, weightedFromWeakness=False,
)

_EVAL_PAYLOAD_WEAK = {
    "questionId": "q-tech-1",
    "transcript": "You can track nodes you've seen.",
    "rubricScores": {"correctness": 2.0, "depth": 1.0, "edge_cases": 0.0, "communication": 2.0},
    "weaknessTags": ["shallow-depth", "no-edge-cases"],
    "followUpCount": 1,
    "wouldSurviveRealInterview": False,
    "survivalReasoning": "Answer names no algorithm and skips edge cases entirely.",
}

_EVAL_PAYLOAD_STRONG = {
    "questionId": "q-tech-1",
    "transcript": "Floyd's algorithm uses two pointers...",
    "rubricScores": {"correctness": 5.0, "depth": 4.0, "edge_cases": 4.0, "communication": 4.0},
    "weaknessTags": [],
    "followUpCount": 0,
    "wouldSurviveRealInterview": True,
    "survivalReasoning": "Candidate named Floyd's algorithm, explained the two-pointer invariant, and addressed the empty-list edge case.",
}


def test_evaluator_passes_question_and_transcript_to_llm():
    llm = _FakeLLM(_EVAL_PAYLOAD_WEAK)
    agent = EvaluatorAgent(llm=llm, model="eval-model")
    ev = agent.run(question=_Q_TECHNICAL, transcript="You can track nodes.", follow_up_count=1)

    assert ev.question_id == "q-tech-1"
    assert ev.would_survive_real_interview is False
    assert "q-tech-1" in llm.last["user"]
    assert "Floyd" in llm.last["user"]
    assert "You can track nodes." in llm.last["user"]
    assert "1" in llm.last["user"]  # follow_up_count forwarded
    assert llm.last["model"] == "eval-model"


def test_evaluator_strong_answer_survives():
    llm = _FakeLLM(_EVAL_PAYLOAD_STRONG)
    agent = EvaluatorAgent(llm=llm, model="eval-model")
    ev = agent.run(question=_Q_TECHNICAL, transcript="Floyd's algorithm uses two pointers...", follow_up_count=0)

    assert ev.would_survive_real_interview is True
    assert ev.survival_reasoning  # non-empty reasoning required
    assert not ev.weakness_tags
