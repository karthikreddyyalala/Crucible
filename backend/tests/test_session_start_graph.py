from graph.session_start import build_session_start_graph, keep_known_exemplars
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan


class _ScriptedLLM:
    """Returns the intake payload first, the plan payload second."""
    def __init__(self, intake_payload, plan_payload):
        self._payloads = [intake_payload, plan_payload]
        self.users = []

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
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


def test_keep_known_exemplars_drops_invented_ids():
    q = {"type": "behavioral", "prompt": "p", "targetDifficulty": 1, "weightedFromWeakness": False}
    plan = QuestionPlan.model_validate({"sessionId": "s", "questions": [
        {**q, "id": "a", "exemplarId": "sde-beh-ownership-1"},
        {**q, "id": "b", "exemplarId": "made-up-id"}]})
    assert [x.exemplar_id for x in keep_known_exemplars(plan).questions] == ["sde-beh-ownership-1", None]
