from graph.session_start import build_session_start_graph
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan


class _ScriptedLLM:
    """Returns the intake payload first, the plan payload second."""
    def __init__(self, intake_payload, plan_payload):
        self._payloads = [intake_payload, plan_payload]

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000):
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
    graph = build_session_start_graph(
        llm=_ScriptedLLM(intake_payload, plan_payload),
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
