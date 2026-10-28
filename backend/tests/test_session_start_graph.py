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


# --- coding problems + company style -----------------------------------------

_INTAKE_MIN = {
    "candidateSkills": [], "yearsExperience": 1.0, "projectHighlights": [],
    "targetRole": "SDE", "targetCompany": None, "jdRequirements": [], "resumeToJdGaps": [],
}


def _coding_q(i, exemplar_id, type_="coding"):
    return {"id": f"q{i}", "type": type_, "prompt": "Let's do a coding problem: p.",
            "targetDifficulty": 2, "weightedFromWeakness": False, "exemplarId": exemplar_id}


def _invoke(plan_questions, **state):
    llm = _ScriptedLLM(_INTAKE_MIN, {"sessionId": "s", "questions": plan_questions})
    graph = build_session_start_graph(llm=llm, intake_model="im", planner_model="pm")
    result = graph.invoke({"session_id": "s", "resume_text": "r", "jd_text": "j", "role_key": "sde",
                           "memory": MemoryProfile(candidateId="c", recurringWeaknesses=[],
                                                   improvementTrend=[], strongAreas=[]), **state})
    return result, llm.users[1]


def test_coding_difficulties_follow_the_session_shapes():
    from graph.session_start import CODING_DIFFICULTIES as d
    assert d[("coding", "junior")] == {"easy"}
    assert d[("coding", "mid")] == {"easy", "medium"}
    assert d[("coding", "senior")] == {"medium", "hard"}
    assert d[("full", "junior")] == {"easy"}
    assert d[("full", "mid")] == {"medium"}
    assert d[("full", "senior")] == {"medium", "hard"}
    assert all(mode in ("coding", "full") for mode, _ in d)


def test_graph_offers_coding_problems_for_the_mode_and_level():
    from models.coding import problems_for
    _, user = _invoke([_coding_q(0, "code-two-sum")], mode="coding", level="junior")
    assert "CodingProblems" in user
    for p in problems_for({"easy"}):
        assert f'"id": "{p.id}"' in user
    _, user = _invoke([_coding_q(0, None, "behavioral")], mode="behavioral", level="junior")
    assert "CodingProblems" not in user


def test_graph_keeps_only_offered_coding_ids():
    plan = [_coding_q(0, "code-two-sum"), _coding_q(1, "code-made-up"), _coding_q(2, "code-two-sum"),
            _coding_q(3, "code-two-sum", "technical")]
    result, _ = _invoke(plan, mode="coding", level="junior")
    assert [q.exemplar_id for q in result["plan"].questions] == ["code-two-sum", None, None, None]
    # An easy problem is never offered to a mid full mock (medium only), so it can't survive there.
    result, _ = _invoke([_coding_q(0, "code-two-sum")], mode="full", level="mid")
    assert result["plan"].questions[0].exemplar_id is None


def test_keep_known_exemplars_accepts_coding_ids_only_as_coding_questions():
    from models.coding import find_problem
    coding = [find_problem("code-two-sum")]
    bank = bank_for("sde", mode="behavioral", level="mid")
    plan = QuestionPlan.model_validate({"sessionId": "s", "questions": [
        _coding_q(0, "sde-beh-ownership-1"), _coding_q(1, "code-two-sum", "behavioral"), _coding_q(2, "code-two-sum")]})
    assert _kept(plan, bank) == [None, None, None]  # nothing offered → no coding id survives
    assert [q.exemplar_id for q in keep_known_exemplars(plan, bank, coding).questions] == [None, None, "code-two-sum"]


def test_graph_passes_company_style_to_the_planner():
    _, user = _invoke([_coding_q(0, None, "behavioral")], mode="behavioral", level="mid", company_style="google")
    assert "CompanyStyle: Google-style" in user
    _, user = _invoke([_coding_q(0, None, "behavioral")], mode="behavioral", level="mid")
    assert "CompanyStyle: General" in user
