from agents.coach import CoachAgent
from models.contracts import PlannedQuestion


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload
        self.last: dict = {}

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        self.last = {"model": model, "system": system, "user": user}
        return schema.model_validate(self._payload)


_Q_BEHAVIORAL = PlannedQuestion(
    id="q-beh-1", type="behavioral",
    prompt="Tell me about a time you owned a production incident.",
    targetDifficulty=3, weightedFromWeakness=False,
)

_COACH_PAYLOAD = {
    "modelAnswer": (
        "When our notifications service started sending duplicate payment alerts, "
        "I owned it end to end. The situation was a 4% duplicate rate; my task was to "
        "stop it without dropping legitimate alerts. I added a Redis idempotency key "
        "hashed on user and event id, and built a dashboard so on-call could watch the "
        "dedup rate. The result: duplicates dropped from 4% to 0.3% within a month."
    ),
    "improvements": [
        "Imposed STAR — Situation, Task, Action, Result — so it's easy to follow.",
        "Added the 4% to 0.3% number so the impact is measurable, not vague.",
        "Used 'I' throughout to make personal ownership unmistakable.",
    ],
}


def test_coach_reworks_the_candidate_answer():
    llm = _FakeLLM(_COACH_PAYLOAD)
    agent = CoachAgent(llm=llm, model="coach-model")
    resp = agent.run(
        question=_Q_BEHAVIORAL,
        transcript="Q: Tell me about a time...\nA: It got better and people were happy.",
        weakness_tags=["vague-impact", "no-star-structure"],
    )

    assert "0.3%" in resp.model_answer
    assert len(resp.improvements) == 3
    # The candidate's attempt and the weakness tags reach the model.
    assert "It got better" in llm.last["user"]
    assert "vague-impact" in llm.last["user"]
    assert "no-star-structure" in llm.last["user"]
    assert "q-beh-1" in llm.last["user"]
    assert llm.last["model"] == "coach-model"


def test_coach_handles_no_weakness_tags():
    llm = _FakeLLM(_COACH_PAYLOAD)
    agent = CoachAgent(llm=llm, model="coach-model")
    agent.run(question=_Q_BEHAVIORAL, transcript="Some answer.", weakness_tags=[])
    assert "none flagged" in llm.last["user"]
