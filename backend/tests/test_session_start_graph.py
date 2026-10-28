from graph.session_start import build_session_start_graph, keep_known_exemplars
from models.loader import bank_for
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan


class _ScriptedLLM:
    """Returns the intake payload first, the plan payload second."""
    def __init__(self, intake_payload, plan_payload):
        self._payloads = [intake_payload, plan_payload]
        self.users = []

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        self.users.append(user)
        return schema.model_validate(self._payloads.pop(0))


def test_graph_runs_intake_then_planner():
    intake_payload = {
        "candidateSkills": ["python"], "yearsExperience": 3.0, "projectHighlights": [],
        "targetRole": "SDE", "targetCompany": None,
        "jdRequirements": ["kafka"], "resumeToJdGaps": ["no kafka"],
    }
    plan_payload = {
        "sessionId": "sess-9",
        "questions": [{"id": "q1", "type": "technical", "prompt": "kafka?",
                       "targetDifficulty": 3, "weightedFromWeakness": False}],
    }
    llm = _ScriptedLLM(intake_payload, plan_payload)
    graph = build_session_start_graph(
        llm=llm,
        intake_model="im", planner_model="pm",
    )
    result = graph.invoke({
        "session_id": "sess-9",
        "resume_text": "resume",
        "jd_text": "jd",
        "role_key": "sde",
        "memory": MemoryProfile(candidateId="c1", recurringWeaknesses=[],
                                improvementTrend=[], strongAreas=[]),
    })
    assert isinstance(result["profile"], IntakeProfile)
    assert isinstance(result["plan"], QuestionPlan)
    assert result["plan"].session_id == "sess-9"
    assert "QuestionBank" in llm.users[1]


def _plan(*ids):
    q = {"type": "behavioral", "prompt": "p", "targetDifficulty": 1, "weightedFromWeakness": False}
    return QuestionPlan.model_validate({"sessionId": "s", "questions": [
        {**q, "id": f"q{i}", "exemplarId": e} for i, e in enumerate(ids)]})


def _kept(plan, bank):
    return [x.exemplar_id for x in keep_known_exemplars(plan, bank).questions]


def test_keep_known_exemplars_drops_invented_ids():
    bank = bank_for("sde", mode="behavioral", level="mid")
    assert "sde-beh-ownership-1" in {q.id for q in bank}
    assert _kept(_plan("sde-beh-ownership-1", "made-up-id"), bank) == ["sde-beh-ownership-1", None]


def test_keep_known_exemplars_drops_ids_outside_the_session_bank():
    bank = bank_for("sde", mode="behavioral", level="mid")
    other = bank_for("ai_engineer", mode="behavioral", level="mid")[0].id
    assert _kept(_plan(other), bank) == [None]


def test_keep_known_exemplars_nulls_repeated_ids():
    bank = bank_for("sde", mode="behavioral", level="mid")
    assert _kept(_plan("sde-beh-ownership-1", "sde-beh-ownership-1"), bank) == ["sde-beh-ownership-1", None]


def test_keep_known_exemplars_nulls_ids_whose_bank_type_differs_from_planned_type():
    bank = bank_for("sde", mode="full", level="mid")
    tech = next(q for q in bank if q.type == "technical")
    assert _kept(_plan(tech.id), bank) == [None]  # _plan builds behavioral questions


def test_graph_passes_each_agents_temperature():
    intake_payload = {
        "candidateSkills": [], "yearsExperience": 1.0, "projectHighlights": [],
        "targetRole": "SDE", "targetCompany": None, "jdRequirements": [], "resumeToJdGaps": [],
    }
    plan_payload = {"sessionId": "s", "questions": [{
        "id": "q1", "type": "technical", "prompt": "p", "targetDifficulty": 3, "weightedFromWeakness": False}]}
    temps = {}

    class _Spy(_ScriptedLLM):
        def structured(self, **kw):
            temps[kw["agent"]] = kw["temperature"]
            return super().structured(**kw)

    graph = build_session_start_graph(
        llm=_Spy(intake_payload, plan_payload), intake_model="im", planner_model="pm",
        intake_temperature=0.1, planner_temperature=0.2,
    )
    graph.invoke({"session_id": "s", "resume_text": "r", "jd_text": "j", "role_key": "sde",
                  "memory": MemoryProfile(candidateId="c", recurringWeaknesses=[],
                                          improvementTrend=[], strongAreas=[])})
    assert temps == {"intake": 0.1, "planner": 0.2}
