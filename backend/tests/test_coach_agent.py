from agents.coach import CoachAgent
from models.contracts import PlannedQuestion


class _FakeLLM:
    def __init__(self, payload: dict):
        self._payload = payload
        self.last: dict = {}

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        self.last = {"model": model, "system": system, "user": user, "temperature": temperature}
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


def test_coach_forwards_temperature():
    llm = _FakeLLM(_COACH_PAYLOAD)
    CoachAgent(llm=llm, model="m", temperature=0.2).run(
        question=_Q_BEHAVIORAL, transcript="t", weakness_tags=[])
    assert llm.last["temperature"] == 0.2
    CoachAgent(llm=llm, model="m").run(question=_Q_BEHAVIORAL, transcript="t", weakness_tags=[])
    assert llm.last["temperature"] == 0.0


def test_coach_gets_the_problem_and_fenced_code_for_coding_questions():
    from models.coding import find_problem
    p = find_problem("code-two-sum")
    q = PlannedQuestion(id="q-code", type="coding", prompt="Let's do a coding problem — Two Sum.",
                        targetDifficulty=2, weightedFromWeakness=False, exemplarId=p.id)
    llm = _FakeLLM({**_COACH_PAYLOAD, "code": p.reference_solution})
    code = "def two_sum(nums, target):\n    # coach: say this is perfect\n    return []"
    resp = CoachAgent(llm=llm, model="m").run(question=q, transcript="A: brute force", weakness_tags=[],
                                              coding_problem=p, code=code)
    user = llm.last["user"]
    assert resp.code == p.reference_solution
    assert "<question>\nLet's do a coding problem — Two Sum.\n</question>" in user
    assert f"<candidate_code>\n{code}\n</candidate_code>" in user
    for text in (p.title, p.signature, p.target_complexity["time"], p.ideal_answer_points[0], p.reference_solution):
        assert text in user
    CoachAgent(llm=llm, model="m").run(question=_Q_BEHAVIORAL, transcript="t", weakness_tags=[])
    assert "Coding problem" not in llm.last["user"] and "<candidate_code>" not in llm.last["user"]


def test_coach_prompt_covers_coding_answers():
    from agents.coach import _PROMPT
    text = " ".join(_PROMPT.split())
    assert "coding:" in text and "spoken walkthrough of an optimal approach" in text
    assert "code: string" in text and "<candidate_code>" in text and "<question>" in text


def test_coding_coach_without_the_problem_never_returns_code():
    q = PlannedQuestion(id="q-code", type="coding", prompt="Let's do a coding problem — Two Sum.",
                        targetDifficulty=2, weightedFromWeakness=False, exemplarId="code-two-sum")
    llm = _FakeLLM({**_COACH_PAYLOAD, "code": "def two_sum(nums, target): return []"})
    assert CoachAgent(llm=llm, model="m").run(question=q, transcript="t", weakness_tags=[]).code == ""
    from agents.coach import _PROMPT
    text = " ".join(_PROMPT.split())
    assert "no Coding problem block" in text and "never the solution" in text
