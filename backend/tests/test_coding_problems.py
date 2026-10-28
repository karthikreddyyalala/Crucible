import importlib.util
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from models.coding import CodingProblem, find_problem, load_problems, problems_for

_CODING = Path(__file__).resolve().parent.parent / "data" / "coding"
_FILES = sorted((_CODING / "problems").glob("*.json"))
_PRIVATE = {"referenceSolution", "hints", "followUps", "idealAnswerPoints", "weakAnswerSigns", "rubric"}


def _load_harness():
    # Loaded by path, the same way the browser worker loads it as text: harness.py stays a standalone script.
    spec = importlib.util.spec_from_file_location("coding_harness", _CODING / "harness.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


harness = _load_harness()


def _public(problem_id: str) -> dict:
    problem = find_problem(problem_id)
    assert problem is not None
    return problem.public()


# --- data ---------------------------------------------------------------------------------

def test_seed_problems_are_present():
    assert {"code-two-sum", "code-valid-parentheses", "code-merge-two-sorted-lists"} <= set(load_problems())


@pytest.mark.parametrize("path", _FILES, ids=[p.stem for p in _FILES])
def test_every_file_validates_and_its_id_is_the_file_name(path):
    problem = CodingProblem.model_validate(json.loads(path.read_text(encoding="utf-8")))
    assert problem.id == path.stem


def test_ids_are_unique():
    assert len(load_problems()) == len(_FILES)


def test_custom_compare_names_a_validator_that_exists_in_the_harness():
    for problem in load_problems().values():
        if problem.compare == "custom":
            assert problem.validator in harness.VALIDATORS, problem.id


@pytest.mark.parametrize("problem_id", sorted(load_problems()))
def test_reference_solution_passes_every_test(problem_id):
    problem = load_problems()[problem_id]
    results = harness.run(problem.reference_solution, problem.public())
    assert len(results) == len(problem.tests)
    assert [r for r in results if not r["passed"]] == []


@pytest.mark.parametrize("problem_id", sorted(load_problems()))
def test_starter_code_fails_at_least_one_test(problem_id):
    problem = load_problems()[problem_id]
    results = harness.run(problem.starter_code, problem.public())
    assert any(not r["passed"] for r in results)


# --- schema -------------------------------------------------------------------------------

def _two_sum_raw() -> dict:
    return json.loads((_CODING / "problems" / "code-two-sum.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "field, value",
    [
        ("examples", [{"input": "x", "output": "y"}]),
        ("tests", [{"args": [[1, 2], 3], "expected": [0, 1]}] * 9),
        ("visibleTestCount", 1),
        ("visibleTestCount", 4),
        ("hints", ["one", "two"]),
        ("followUps", ["Why?", "How?", "No question mark"]),
        ("rubric", {"correctness": "a", "efficiency": "b", "code_quality": "c"}),
        ("validator", ""),  # two-sum uses compare "custom", which needs a validator
        ("signature", "def other(nums: list[int], target: int) -> list[int]:"),
        ("id", "two-sum"),
    ],
)
def test_schema_rejects_bad_data(field, value):
    raw = _two_sum_raw()
    raw[field] = value
    with pytest.raises(ValidationError):
        CodingProblem.model_validate(raw)


def test_public_excludes_private_fields_and_is_json():
    public = _public("code-two-sum")
    assert _PRIVATE.isdisjoint(public)
    assert public["functionName"] == "two_sum"
    assert len(public["tests"]) == len(find_problem("code-two-sum").tests)
    json.dumps(public)


def test_find_problem_and_problems_for():
    assert find_problem("code-nope") is None
    easy = problems_for({"easy"})
    assert [p.id for p in easy] == sorted(p.id for p in easy)
    assert {p.difficulty for p in easy} == {"easy"}
    assert problems_for({"hard"}) == [p for p in load_problems().values() if p.difficulty == "hard"]


# --- harness ------------------------------------------------------------------------------

def test_result_rows_have_the_documented_shape():
    results = harness.run("def is_valid(s):\n    return True\n", _public("code-valid-parentheses"))
    assert all(set(r) == {"index", "passed", "got", "expected", "error", "stdout", "ms"} for r in results)
    assert [r["index"] for r in results] == list(range(len(results)))
    assert all(isinstance(r["ms"], float) and r["ms"] >= 0 for r in results)
    json.dumps(results)


def test_syntax_error_returns_one_row_with_the_line():
    code = "def two_sum(nums, target):\n    total = 1\n    return nums[0] +\n"
    [row] = harness.run(code, _public("code-two-sum"))
    assert row["index"] == -1 and row["passed"] is False
    assert row["error"].startswith("SyntaxError: ")
    assert row["error"].endswith("(line 3)")


def test_runtime_error_reports_the_candidate_line_for_every_test():
    code = "def two_sum(nums, target):\n    total = 0\n    return [nums[100], 0]\n"
    results = harness.run(code, _public("code-two-sum"))
    assert len(results) == len(find_problem("code-two-sum").tests)
    assert {r["error"] for r in results} == {"IndexError: list index out of range (line 3)"}
    assert not any(r["passed"] for r in results)


def test_runtime_error_in_a_helper_reports_the_deepest_candidate_line():
    code = "def helper(x):\n    return x // 0\n\ndef two_sum(nums, target):\n    return helper(1)\n"
    row = harness.run(code, _public("code-two-sum"))[0]
    assert row["error"] == "ZeroDivisionError: integer division or modulo by zero (line 2)"


def test_error_while_defining_the_code_returns_one_row():
    [row] = harness.run("x = 1\nraise ValueError('boom')\n", _public("code-two-sum"))
    assert row["index"] == -1 and row["error"] == "ValueError: boom (line 2)"


def test_system_exit_does_not_escape():
    results = harness.run("def is_valid(s):\n    raise SystemExit(3)\n", _public("code-valid-parentheses"))
    assert results[0]["error"] == "SystemExit: 3 (line 2)"


def test_missing_function():
    [row] = harness.run("def something_else():\n    pass\n", _public("code-two-sum"))
    assert row["index"] == -1 and row["passed"] is False
    assert row["error"] == "Couldn't find a function named two_sum"


def test_class_solution_style_is_supported():
    problem = find_problem("code-merge-two-sorted-lists")
    body = "\n".join("    " + line for line in problem.reference_solution.splitlines())
    code = "class Solution:\n" + body.replace("(l1:", "(self, l1:")
    assert all(r["passed"] for r in harness.run(code, problem.public()))


def test_print_output_is_captured_per_test_and_truncated(capsys):
    code = "def is_valid(s):\n    print('checking', s)\n    print('y' * 5000)\n    return True\n"
    results = harness.run(code, _public("code-valid-parentheses"))
    assert results[0]["stdout"].startswith("checking ([]{})\n")
    assert all(len(r["stdout"]) == 2000 for r in results)
    assert capsys.readouterr().out == ""


@pytest.mark.parametrize(
    "problem_id, code",
    [
        ("code-two-sum", "def two_sum(nums, target):\n    return 'nope'\n"),
        ("code-valid-parentheses", "def is_valid(s):\n    return 'True'\n"),
        ("code-merge-two-sorted-lists", "def merge_two_lists(l1, l2):\n    return [1, 2, 4, 4, 6, 9]\n"),
    ],
)
def test_wrong_return_type_fails_without_raising(problem_id, code):
    results = harness.run(code, _public(problem_id))
    assert results and not any(r["passed"] for r in results)


def test_returning_a_python_list_for_a_linked_list_explains_why():
    code = "def merge_two_lists(l1, l2):\n    return [1, 2]\n"
    row = harness.run(code, _public("code-merge-two-sorted-lists"))[0]
    assert row["error"] == "TypeError: expected a ListNode or None, got list"
    assert row["got"] == [1, 2]


def test_validator_sees_the_original_args_even_if_the_candidate_mutates_them():
    # Sorting nums in place and answering with indices into the sorted copy is a classic bug.
    code = (
        "def two_sum(nums, target):\n"
        "    nums.sort()\n"
        "    i, j = 0, len(nums) - 1\n"
        "    while nums[i] + nums[j] != target:\n"
        "        i, j = (i + 1, j) if nums[i] + nums[j] < target else (i, j - 1)\n"
        "    return [i, j]\n"
    )
    assert harness.run(code, _public("code-two-sum"))[0]["passed"] is False


def test_only_visible_runs_the_visible_tests():
    public = _public("code-valid-parentheses")
    problem = find_problem("code-valid-parentheses")
    results = harness.run(problem.reference_solution, public, only_visible=True)
    assert len(results) == public["visibleTestCount"]


def test_adapters_round_trip():
    to_list, from_list = harness.ADAPTERS["linked_list"]
    assert from_list(to_list([1, 2, 3])) == [1, 2, 3]
    assert to_list([]) is None and from_list(None) == []
    to_tree, from_tree = harness.ADAPTERS["tree"]
    for level_order in ([3, 9, 20, None, None, 15, 7], [1, None, 2, 3], [1, 2], []):
        assert from_tree(to_tree(level_order)) == level_order
    assert to_tree([1, None, 2]).right.val == 2
    to_graph, from_graph = harness.ADAPTERS["graph"]
    square = [[2, 4], [1, 3], [2, 4], [1, 3]]
    assert from_graph(to_graph(square)) == square
    assert to_graph([]) is None and from_graph(None) == []


def test_compare_modes():
    assert harness.matches("exact", [1, 2], [1, 2])
    assert not harness.matches("exact", [1, 2], [2, 1])
    assert harness.matches("unordered", [1, 2, 3], [3, 1, 2])
    assert not harness.matches("unordered", [1, 2, 3], None)
    assert harness.matches("unordered_nested", [[1, 2], ["a", "b"]], [["b", "a"], [2, 1]])
    assert not harness.matches("unordered_nested", [[1, 2]], [[1, 3]])
    assert harness.matches("float", 1 / 3, 0.333334)
    assert not harness.matches("float", 1 / 3, 0.3334)
    assert harness.matches("custom", [0, 1], [1, 0], [[2, 7, 11], 9], "two_sum_pair")
    assert not harness.matches("custom", [0, 1], [0, 0], [[2, 7, 11], 4], "two_sum_pair")
