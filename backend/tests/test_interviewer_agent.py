from agents.interviewer import InterviewerAgent
from models.contracts import PlannedQuestion

_Q = PlannedQuestion(
    id="q-beh-1", type="behavioral",
    prompt="Tell me about a time you led a project under a tight deadline.",
    targetDifficulty=3, weightedFromWeakness=False,
)

_VAGUE_ANSWER = "Yeah we had a tight deadline and I made sure the team stayed focused and we got it done."
_CONCRETE_ANSWER = (
    "At Fintech Corp in 2023 I led a 4-person team to ship a KYC module in 3 weeks instead of 6. "
    "I unblocked the critical path by pairing directly on the slowest service for 2 days. "
    "We shipped on day 19 with zero P1 bugs. Customer onboarding latency dropped from 48h to 4h."
)


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload
        self.last: dict = {}

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000):
        self.last = {"model": model, "user": user}
        return schema.model_validate(self._payload)


def test_interviewer_forwards_context_to_llm():
    llm = _FakeLLM({
        "action": "follow_up",
        "followUpPrompt": "You said 'stayed focused' — what specific action did you personally take?",
        "currentQuestionId": "q-beh-1",
    })
    agent = InterviewerAgent(llm=llm, model="iv-model")
    decision = agent.run_turn(question=_Q, candidate_answer=_VAGUE_ANSWER,
                               follow_up_count=0, is_last_question=False)

    assert decision.action == "follow_up"
    assert decision.follow_up_prompt is not None
    assert "q-beh-1" in llm.last["user"]
    assert _VAGUE_ANSWER in llm.last["user"]
    assert "followUpCount: 0" in llm.last["user"]
    assert llm.last["model"] == "iv-model"


def test_interviewer_advance_on_max_followups():
    llm = _FakeLLM({
        "action": "advance",
        "followUpPrompt": None,
        "currentQuestionId": "q-beh-1",
    })
    agent = InterviewerAgent(llm=llm, model="iv-model")
    decision = agent.run_turn(question=_Q, candidate_answer=_VAGUE_ANSWER,
                               follow_up_count=2, is_last_question=False)

    assert decision.action == "advance"
    assert decision.follow_up_prompt is None
    assert "followUpCount: 2" in llm.last["user"]


def test_interviewer_complete_on_last_question():
    llm = _FakeLLM({
        "action": "complete",
        "followUpPrompt": None,
        "currentQuestionId": "q-beh-1",
    })
    agent = InterviewerAgent(llm=llm, model="iv-model")
    decision = agent.run_turn(question=_Q, candidate_answer=_CONCRETE_ANSWER,
                               follow_up_count=0, is_last_question=True)

    assert decision.action == "complete"
    assert "isLastQuestion: true" in llm.last["user"]
