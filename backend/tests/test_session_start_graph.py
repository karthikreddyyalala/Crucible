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


def _fake_problems(*specs):
    from models.coding import find_problem
    base = find_problem("code-two-sum")
    return [base.model_copy(update={"id": i, "title": t, "difficulty": d}) for i, t, d in specs]


_EASY_A, _EASY_B, _MEDIUM = _fake_problems(
    ("code-easy-a", "Easy A", "easy"), ("code-easy-b", "Easy B", "easy"), ("code-medium", "Medium One", "medium"))


def test_graph_keeps_offered_coding_ids_and_assigns_one_where_the_planner_missed(monkeypatch):
    import graph.session_start as ss
    monkeypatch.setattr(ss, "problems_for", lambda d: [p for p in (_EASY_A, _EASY_B, _MEDIUM) if p.difficulty in d])
    plan = [_coding_q(0, "code-easy-b"), _coding_q(1, "code-made-up"), _coding_q(2, "code-easy-b"),
            _coding_q(3, "code-easy-a", "technical")]
    result, _ = _invoke(plan, mode="coding", level="mid")
    qs = result["plan"].questions
    assert [q.type for q in qs] == ["coding", "coding", "coding", "technical"]
    # q1 gets the first unused easy problem (its slot is difficulty 2); q2's duplicate id was dropped,
    # so it gets the next unused one; the problem id on a technical question never survives.
    assert [q.exemplar_id for q in qs] == ["code-easy-b", "code-easy-a", "code-medium", None]
    assert qs[0].prompt == "Let's do a coding problem: p."  # the Planner's own pick keeps its prompt
    assert qs[1].prompt == "Let's do a coding problem — Easy A."
    assert qs[2].prompt == "Let's do a coding problem — Medium One."


def test_graph_turns_a_coding_question_technical_when_no_problem_is_offered(monkeypatch):
    import graph.session_start as ss
    monkeypatch.setattr(ss, "problems_for", lambda d: [p for p in (_EASY_A,) if p.difficulty in d])
    # A mid full mock offers medium problems only — here there are none.
    result, _ = _invoke([_coding_q(0, "code-easy-a")], mode="full", level="mid")
    q = result["plan"].questions[0]
    assert (q.type, q.exemplar_id, q.prompt) == ("technical", None, "Let's do a coding problem: p.")


def test_assign_coding_problems_prefers_the_slot_difficulty_and_never_reuses_an_id():
    from graph.session_start import assign_coding_problems
    plan = QuestionPlan.model_validate({"sessionId": "s", "questions": [
        _coding_q(0, None) | {"targetDifficulty": 3}, _coding_q(1, "code-easy-a"), _coding_q(2, None),
        _coding_q(3, None)]})
    qs = assign_coding_problems(plan, [_EASY_A, _EASY_B, _MEDIUM]).questions
    assert [q.exemplar_id for q in qs] == ["code-medium", "code-easy-a", "code-easy-b", None]
    assert qs[3].type == "technical"  # offered problems ran out: it can't be a coding question


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


def _problem(pid, **update):
    from models.coding import find_problem
    return find_problem("code-two-sum").model_copy(update={"id": pid, "title": pid, **update})


def test_assign_coding_problems_prefers_very_common_then_new_topics():
    from graph.session_start import assign_coding_problems
    chosen = _problem("code-house-robber", topics=("dynamic programming",))
    offered = [
        chosen,
        _problem("code-a-common", asked="common", topics=("graph",)),
        _problem("code-house-robber-ii", topics=("dynamic programming",)),
        _problem("code-z-fresh", topics=("intervals",)),
    ]
    plan = QuestionPlan.model_validate({"sessionId": "s", "questions": [
        _coding_q(0, "code-house-robber"), _coding_q(1, None), _coding_q(2, None), _coding_q(3, None)]})
    picked = [q.exemplar_id for q in assign_coding_problems(plan, offered).questions]
    # very_common first; among those a topic not already in the plan; then a repeat topic; common last
    assert picked == ["code-house-robber", "code-z-fresh", "code-house-robber-ii", "code-a-common"]
    assert [q.exemplar_id for q in assign_coding_problems(plan, list(reversed(offered))).questions] == picked


def test_bank_for_coding_mode_is_empty():
    assert bank_for("sde", mode="coding", level="mid") == []


def test_planned_ids_are_renamed_and_round_trip_into_a_turn_request():
    from routes.session import ClientQuestion
    plan = [_coding_q(0, None, "behavioral") | {"id": "Q 1!"}, _coding_q(1, None, "technical") | {"id": "dup"},
            _coding_q(2, None, "technical") | {"id": "dup"}]
    result, _ = _invoke(plan, mode="technical", level="mid", session_id="s")
    qs = result["plan"].questions
    assert [q.id for q in qs] == ["q1", "q2", "q3"]
    assert [q.type for q in qs] == ["behavioral", "technical", "technical"]  # order kept
    for q in qs:
        ClientQuestion.model_validate(q.model_dump(by_alias=True))


def test_seeded_order_is_stable_per_session_and_varies_across_sessions():
    from graph.session_start import seeded_order
    items = list(range(8))
    assert seeded_order(items, "sess-a") == seeded_order(items, "sess-a")
    assert seeded_order(items, "sess-a") != seeded_order(items, "sess-b")
    assert sorted(seeded_order(items, "sess-a")) == items and items == list(range(8))  # a copy, nothing lost


def test_planner_sees_bank_and_coding_problems_in_the_session_order():
    import json
    from graph.session_start import seeded_order
    from models.coding import problems_for

    def listed(user, header):
        return [x["id"] for x in json.loads(user.split(header, 1)[1].split("\n\n")[0])]

    _, user = _invoke([_coding_q(0, "code-two-sum")], mode="full", level="junior", session_id="sess-x")
    assert listed(user, "QuestionBank (choose from these):\n") == [
        q.id for q in seeded_order(bank_for("sde", mode="full", level="junior"), "sess-x")]
    assert listed(user, "CodingProblems (choose from these for coding questions):\n") == [
        p.id for p in seeded_order(problems_for({"easy"}), "sess-x")]
    _, other = _invoke([_coding_q(0, "code-two-sum")], mode="full", level="junior", session_id="sess-y")
    assert listed(other, "QuestionBank (choose from these):\n") != listed(user, "QuestionBank (choose from these):\n")


def test_assign_coding_problems_breaks_ties_in_the_offered_order():
    from graph.session_start import assign_coding_problems
    plan = QuestionPlan.model_validate({"sessionId": "s", "questions": [_coding_q(0, None)]})
    for offered in ([_EASY_A, _EASY_B], [_EASY_B, _EASY_A]):
        assert assign_coding_problems(plan, offered).questions[0].exemplar_id == offered[0].id
