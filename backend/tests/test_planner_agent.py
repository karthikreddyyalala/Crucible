from agents.planner import PlannerAgent
from models.contracts import IntakeProfile, MemoryProfile, RecurringWeakness
from models.loader import load_competency_map


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload
        self.last = None

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        self.last = {"user": user, "model": model}
        return schema.model_validate(self._payload)


def _profile():
    return IntakeProfile(
        candidateSkills=["python"], yearsExperience=3.0, projectHighlights=[],
        targetRole="SDE", jdRequirements=["kafka"], resumeToJdGaps=["no kafka"],
    )


def test_planner_returns_plan_with_session_id():
    payload = {
        "sessionId": "sess-1",
        "questions": [
            {"id": "q1", "type": "technical", "prompt": "Explain kafka partitions",
             "targetDifficulty": 4, "weightedFromWeakness": True},
        ],
    }
    llm = _FakeLLM(payload)
    agent = PlannerAgent(llm=llm, model="planner-model")
    mem = MemoryProfile(
        candidateId="c1",
        recurringWeaknesses=[RecurringWeakness(tag="vague-impact", frequency=3, lastSeen="2026-06-01")],
        improvementTrend=[], strongAreas=[],
    )
    plan = agent.run(
        session_id="sess-1", profile=_profile(), memory=mem,
        competency_map=load_competency_map("sde"),
    )
    assert plan.session_id == "sess-1"
    assert plan.questions[0].weighted_from_weakness is True
    assert "vague-impact" in llm.last["user"]


def test_planner_forwards_mode_and_level():
    payload = {
        "sessionId": "s",
        "questions": [
            {"id": "q1", "type": "technical", "prompt": "p",
             "targetDifficulty": 5, "weightedFromWeakness": False},
        ],
    }
    llm = _FakeLLM(payload)
    agent = PlannerAgent(llm=llm, model="planner-model")
    mem = MemoryProfile(candidateId="c1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[])
    agent.run(
        session_id="s", profile=_profile(), memory=mem,
        competency_map=load_competency_map("sde"),
        mode="technical", level="senior",
    )
    assert "mode: technical" in llm.last["user"]
    assert "level: senior" in llm.last["user"]
