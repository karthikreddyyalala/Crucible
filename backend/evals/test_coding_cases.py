import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from evals.run_accuracy_eval import _run_case, load_cases, say_check
from models.coding import find_problem

GOLDEN = Path(__file__).parent / "golden"
Q = {"id": "q", "type": "coding", "prompt": "Let's do a coding problem — Two Sum.",
     "targetDifficulty": 2, "weightedFromWeakness": False}


def test_say_check_is_none_without_checks():
    assert say_check("anything", None, None) is None
    assert say_check("anything", [], []) is None


def test_say_check_contains_any_is_case_insensitive_and_needs_one():
    assert say_check("Can we do BETTER than that?", ["better", "faster"], None) is True
    assert say_check("Walk me through it.", ["better", "faster"], None) is False


def test_say_check_excludes_none_present():
    assert say_check("A map from value to index?", None, ["def ", "return "]) is True
    assert say_check("Try def two_sum(nums): ...", None, ["DEF "]) is False


def test_say_check_needs_both_halves():
    assert say_check("What about example 2?", ["example"], ["return "]) is True
    assert say_check("Example 2 should return [0, 1].", ["example"], ["return "]) is False


def test_problem_id_is_stamped_onto_the_question(tmp_path):
    f = tmp_path / "c.json"
    f.write_text(json.dumps([{"case": "x", "problem_id": "code-two-sum", "question": Q}]))
    assert load_cases(f)[0]["question"]["exemplarId"] == "code-two-sum"


def test_unknown_problem_id_is_rejected(tmp_path):
    f = tmp_path / "c.json"
    f.write_text(json.dumps([{"case": "x", "problem_id": "code-nope", "question": Q}]))
    with pytest.raises(ValueError, match="code-nope"):
        load_cases(f)


def test_coding_fields_reach_both_agents():
    seen = {}

    class _Interviewer:
        def run_turn(self, **kw):
            seen["turn"] = kw
            return SimpleNamespace(action="follow_up", say="What happens with example 2?")

    class _Evaluator:
        def run(self, **kw):
            seen["eval"] = kw
            return SimpleNamespace(would_survive_real_interview=False, survival_reasoning="fails example 2")

    case = {"case": "x", "problem_id": "code-two-sum", "question": {**Q, "exemplarId": "code-two-sum"},
            "candidate_answer": "", "follow_up_count": 1, "is_last_question": False,
            "code": "def two_sum(nums, target): pass", "test_results": "Examples: 2/3 passed.",
            "coding_stage": "review", "event": "submit", "expect_action": "follow_up",
            "expect_would_survive": False, "expect_say_contains_any": ["example"]}
    row = _run_case(case, _Interviewer(), _Evaluator())

    problem = find_problem("code-two-sum")
    assert seen["turn"]["coding_problem"] is problem and seen["eval"]["coding_problem"] is problem
    assert seen["turn"]["coding_stage"] == "review" and seen["turn"]["event"] == "submit"
    for k in ("code", "test_results"):
        assert seen["turn"][k] == seen["eval"][k] == case[k]
    assert row["say_check"] is True and row["would_survive_match"] is True
    assert row["survival_reasoning"] == "fails example 2"


def test_every_coding_case_is_well_formed():
    cases = load_cases(GOLDEN / "coding_turn_cases.json")
    assert len(cases) >= 14
    for c in cases:
        assert c["question"]["type"] == "coding" and find_problem(c["problem_id"]), c["case"]
        assert c.get("coding_stage") in ("approach", "coding", "review"), c["case"]
        assert c.get("event", "") in ("", "checkin", "submit"), c["case"]
        if c.get("event"):  # the browser sends event turns with an empty answer
            assert c["candidate_answer"] == "", c["case"]
    assert sum(c["expect_would_survive"] is not None for c in cases) == 4
