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

def _raw(problem_id: str) -> dict:
    return json.loads((_CODING / "problems" / f"{problem_id}.json").read_text(encoding="utf-8"))


def _set(**fields):
    return lambda raw: raw.update(fields)


def _set_test(index, **fields):
    return lambda raw: raw["tests"][index].update(fields)


@pytest.mark.parametrize(
    "problem_id, mutate",
    [
        ("code-two-sum", _set(examples=[{"input": "x", "output": "y"}])),
        ("code-two-sum", _set(tests=[{"args": [[1, 2], 3], "expected": [0, 1]}] * 9)),
        ("code-two-sum", _set(visibleTestCount=1)),
        ("code-two-sum", _set(visibleTestCount=4)),
        ("code-two-sum", _set(hints=["one", "two"])),
        ("code-two-sum", _set(followUps=["Why?", "How?", "No question mark"])),
        ("code-two-sum", _set(rubric={"correctness": "a", "efficiency": "b", "code_quality": "c"})),
        ("code-two-sum", _set(validator="")),  # compare "custom" needs a validator
        ("code-two-sum", _set(signature="def other(nums, target):", starterCode="def other(nums, target):\n    pass\n")),
        ("code-two-sum", _set(starterCode="def two_sum(nums, target):\n    pass\n")),  # must contain the signature
        ("code-two-sum", _set(id="two-sum")),
        ("code-two-sum", _set_test(0, args=[[1, 2]])),  # two_sum takes two args
        ("code-rotate-image", _set(checkArg=1)),  # rotate has one parameter
        ("code-implement-trie", _set(checkArg=0)),  # checkArg is for functions only
        ("code-implement-trie", _set(signature="def Trie():", starterCode="def Trie():\n    pass\n")),
        ("code-implement-trie", _set_test(0, args=[[], ["apple"]])),  # design tests take {ops, args}
        ("code-implement-trie", _set_test(0, expected=[None, None])),  # one expected value per op
        ("code-implement-trie", lambda raw: raw["tests"][0]["args"]["ops"].__setitem__(0, "Tree")),
        ("code-implement-trie", lambda raw: raw["tests"][0]["args"]["args"].pop()),
        ("code-serialize-deserialize-binary-tree", _set_test(0, expected=[1])),  # must expect the input back
    ],
)
def test_schema_rejects_bad_data(problem_id, mutate):
    raw = _raw(problem_id)
    CodingProblem.model_validate(raw)  # the untouched file is valid
    mutate(raw)
    with pytest.raises(ValidationError):
        CodingProblem.model_validate(raw)


def test_schema_accepts_every_harness_adapter_name():
    raw = _raw("code-merge-two-sorted-lists")
    for name in [*harness.ADAPTERS, "tree_node"]:
        CodingProblem.model_validate({**raw, "adapters": {"l1": name}})
    with pytest.raises(ValidationError):
        CodingProblem.model_validate({**raw, "adapters": {"l1": "heap"}})


def test_public_excludes_private_fields_and_is_json():
    public = _public("code-two-sum")
    assert _PRIVATE.isdisjoint(public)
    assert public["functionName"] == "two_sum"
    assert public["kind"] == "function" and public["checkArg"] is None
    assert len(public["tests"]) == len(find_problem("code-two-sum").tests)
    assert _public("code-rotate-image")["checkArg"] == 0
    trie = _public("code-implement-trie")
    assert trie["kind"] == "design" and set(trie["tests"][0]["args"]) == {"ops", "args"}
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


def test_a_huge_error_message_is_cut_short():
    # A 10,000-character message would otherwise flood the results panel and the turn payload.
    code = "def two_sum(nums, target):\n    raise ValueError('x' * 10000)\n"
    row = harness.run(code, _public("code-two-sum"))[0]
    assert len(row["error"]) < 340
    assert row["error"].startswith("ValueError: xxx") and "…" in row["error"] and row["error"].endswith("(line 2)")


def test_error_while_defining_the_code_returns_one_row():
    [row] = harness.run("x = 1\nraise ValueError('boom')\n", _public("code-two-sum"))
    assert row["index"] == -1 and row["error"] == "ValueError: boom (line 2)"


def test_system_exit_does_not_escape():
    results = harness.run("def is_valid(s):\n    raise SystemExit(3)\n", _public("code-valid-parentheses"))
    assert results[0]["error"] == "SystemExit: 3 (line 2)"


def test_missing_function():
    [row] = harness.run("def something_else():\n    pass\n", _public("code-two-sum"))
    assert row["index"] == -1 and row["passed"] is False
    assert row["error"] == "Couldn't find a function named two_sum (or twoSum)"


_TWO_SUM_BODY = (
    "        seen = {}\n"
    "        for i, n in enumerate(nums):\n"
    "            if target - n in seen:\n"
    "                return [seen[target - n], i]\n"
    "            seen[n] = i\n"
)


@pytest.mark.parametrize(
    "code",
    [
        "def twoSum(nums, target):\n" + "".join(line[4:] for line in _TWO_SUM_BODY.splitlines(True)),
        "class Solution:\n    def twoSum(self, nums, target):\n" + _TWO_SUM_BODY,
    ],
    ids=["module", "solution-class"],
)
def test_camel_case_names_from_leetcode_habits_are_accepted(code):
    assert all(r["passed"] for r in harness.run(code, _public("code-two-sum")))


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


def test_list_of_linked_lists_adapter():
    to_lists, from_lists = harness.ADAPTERS["linked_list_list"]
    heads = to_lists([[1, 4], [], [2]])
    assert len(heads) == 3 and heads[1] is None and heads[0].next.val == 4
    assert from_lists(heads) == [[1, 4], [], [2]]
    assert to_lists([]) == []


def test_cycle_adapter_links_the_tail_back_to_pos():
    to_cycle, _ = harness.ADAPTERS["linked_list_cycle"]
    head = to_cycle({"values": [3, 2, 0, -4], "pos": 1})
    tail = head.next.next.next
    assert tail.val == -4 and tail.next is head.next
    single = to_cycle({"values": [7], "pos": 0})
    assert single.next is single
    straight = to_cycle({"values": [1, 2], "pos": -1})
    assert straight.next.next is None
    assert to_cycle({"values": [], "pos": -1}) is None


def test_converting_a_cyclic_list_or_tree_raises_instead_of_looping():
    _, from_list = harness.ADAPTERS["linked_list"]
    to_cycle, from_cycle = harness.ADAPTERS["linked_list_cycle"]
    for convert in (from_list, from_cycle):
        with pytest.raises(ValueError, match="cycle"):
            convert(to_cycle({"values": [1, 2, 3], "pos": 0}))
    to_tree, from_tree = harness.ADAPTERS["tree"]
    root = to_tree([1, 2, 3])
    root.left.left = root
    with pytest.raises(ValueError, match="same node twice"):
        from_tree(root)


def test_cyclic_list_argument_reaches_the_candidate():
    problem = {
        "functionName": "has_cycle",
        "signature": "def has_cycle(head: Optional[ListNode]) -> bool:",
        "adapters": {"head": "linked_list_cycle"},
        "tests": [{"args": [{"values": [1, 2, 3], "pos": 0}], "expected": True},
                  {"args": [{"values": [1, 2, 3], "pos": -1}], "expected": False}],
    }
    code = (
        "def has_cycle(head):\n"
        "    seen = set()\n"
        "    while head and id(head) not in seen:\n"
        "        seen.add(id(head))\n"
        "        head = head.next\n"
        "    return head is not None\n"
    )
    assert all(r["passed"] for r in harness.run(code, problem))


_LCA = {
    "functionName": "lowest_common_ancestor",
    "signature": "def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:",
    "adapters": {"root": "tree", "p": "tree_node", "q": "tree_node", "return": "node_value"},
    "tests": [{"args": [[6, 2, 8], 2, 8], "expected": 6}],
}


def test_tree_node_args_are_the_nodes_inside_the_tree_and_the_returned_node_becomes_its_value():
    identity = (
        "def lowest_common_ancestor(root, p, q):\n"
        "    assert p is root.left and q is root.right\n"
        "    return root\n"
    )
    row = harness.run(identity, _LCA)[0]
    assert row["passed"] is True and row["got"] == 6


def test_returning_a_value_instead_of_a_node_explains_why():
    row = harness.run("def lowest_common_ancestor(root, p, q):\n    return root.val\n", _LCA)[0]
    assert row["passed"] is False and row["got"] == 6
    assert row["error"] == "TypeError: expected a TreeNode or None, got int"


def test_tree_node_value_missing_from_the_tree_is_reported():
    problem = {**_LCA, "tests": [{"args": [[6, 2, 8], 2, 5], "expected": 6}]}
    row = harness.run("def lowest_common_ancestor(root, p, q):\n    return root\n", problem)[0]
    assert row["passed"] is False and "no node with value 5" in row["error"]


_CLONE = {
    "functionName": "clone_graph",
    "signature": "def clone_graph(node: Optional[Node]) -> Optional[Node]:",
    "adapters": {"node": "graph", "return": "graph_copy"},
    "tests": [{"args": [[[2, 4], [1, 3], [2, 4], [1, 3]]], "expected": [[2, 4], [1, 3], [2, 4], [1, 3]]},
              {"args": [[]], "expected": []}],
}


def test_graph_copy_passes_a_real_clone():
    code = (
        "def clone_graph(node):\n"
        "    if node is None:\n"
        "        return None\n"
        "    copies = {}\n"
        "    def copy(n):\n"
        "        if n not in copies:\n"
        "            copies[n] = Node(n.val)\n"
        "            copies[n].neighbors = [copy(m) for m in n.neighbors]\n"
        "        return copies[n]\n"
        "    return copy(node)\n"
    )
    assert all(r["passed"] for r in harness.run(code, _CLONE))


@pytest.mark.parametrize(
    "code",
    [
        "def clone_graph(node):\n    return node\n",
        # new start node, but its neighbors are still the originals
        "def clone_graph(node):\n    return Node(node.val, node.neighbors) if node else None\n",
    ],
)
def test_graph_copy_rejects_a_graph_that_shares_nodes_with_the_input(code):
    row = harness.run(code, _CLONE)[0]
    assert row["passed"] is False and "reuses nodes from the input" in row["error"]


def test_alien_order_validator():
    words = [["wrt", "wrf", "er", "ett", "rftt"]]
    assert harness.matches("custom", "wertf", "wertf", words, "alien_order")
    assert not harness.matches("custom", "wertf", "wetrf", words, "alien_order")  # t must come before f
    assert not harness.matches("custom", "wertf", "wertff", words, "alien_order")
    assert not harness.matches("custom", "wertf", "wert", words, "alien_order")
    assert not harness.matches("custom", "wertf", "", words, "alien_order")
    assert not harness.matches("custom", "wertf", None, words, "alien_order")
    assert harness.matches("custom", "xz", "xz", [["x", "z"]], "alien_order")
    assert not harness.matches("custom", "xz", "zx", [["x", "z"]], "alien_order")
    # equal words give no constraint: any order of their letters is right
    assert harness.matches("custom", "ab", "ba", [["ab", "ab"]], "alien_order")
    # impossible inputs expect "": a longer word before its own prefix, or a cycle
    assert harness.matches("custom", "", "", [["abc", "ab"]], "alien_order")
    assert not harness.matches("custom", "", "abc", [["abc", "ab"]], "alien_order")
    assert not harness.matches("custom", "", "xz", [["x", "z", "x"]], "alien_order")


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
    assert harness.matches("float", [1.5, None, 2.0], [1.5000001, None, 2])
    assert not harness.matches("float", [1.5, None], [1.5, 0.0])
    assert not harness.matches("float", [1.5, 2.0], [1.5])
    assert not harness.matches("float", None, 0.0)


# --- in-place mode (checkArg) -------------------------------------------------------------

def test_in_place_mode_judges_the_argument_not_the_return():
    public = _public("code-rotate-image")
    returns_a_copy = "def rotate(matrix):\n    return [list(row) for row in zip(*matrix[::-1])]\n"
    row = harness.run(returns_a_copy, public)[0]
    assert row["passed"] is False and row["got"] == public["tests"][0]["args"][0]
    slice_assign = "def rotate(matrix):\n    matrix[:] = [list(row) for row in zip(*matrix[::-1])]\n"
    assert all(r["passed"] for r in harness.run(slice_assign, public))


def test_in_place_mode_converts_a_linked_list_argument_back():
    problem = {
        "functionName": "reorder_list",
        "signature": "def reorder_list(head: Optional[ListNode]) -> None:",
        "adapters": {"head": "linked_list"},
        "checkArg": 0,
        "tests": [{"args": [[1, 2, 3, 4, 5]], "expected": [1, 5, 2, 4, 3]}, {"args": [[1, 2, 3, 4]], "expected": [1, 4, 2, 3]}],
    }
    code = (
        "def reorder_list(head):\n"
        "    nodes = []\n"
        "    while head:\n"
        "        nodes.append(head)\n"
        "        head = head.next\n"
        "    i, j = 0, len(nodes) - 1\n"
        "    while i < j:\n"
        "        nodes[i].next = nodes[j]\n"
        "        i += 1\n"
        "        if i == j:\n"
        "            break\n"
        "        nodes[j].next = nodes[i]\n"
        "        j -= 1\n"
        "    nodes[i].next = None\n"
        "    return 'ignored'\n"
    )
    results = harness.run(code, problem)
    assert [r["got"] for r in results] == [[1, 5, 2, 4, 3], [1, 4, 2, 3]]
    assert all(r["passed"] for r in results)


# --- design mode --------------------------------------------------------------------------

def test_design_mode_names_the_failing_call_and_keeps_earlier_results():
    code = (
        "class Trie:\n"
        "    def __init__(self):\n"
        "        self.words = set()\n"
        "    def insert(self, word):\n"
        "        self.words.add(word)\n"
        "    def search(self, word):\n"
        "        return 1 // 0\n"
        "    def startsWith(self, prefix):\n"
        "        return True\n"
    )
    row = harness.run(code, _public("code-implement-trie"))[0]
    assert row["passed"] is False and row["got"] == [None, None]
    assert row["error"] == "Error in call 3 (search): ZeroDivisionError: integer division or modulo by zero (line 7)"


def test_design_mode_missing_class():
    [row] = harness.run("class Tree:\n    pass\n", _public("code-implement-trie"))
    assert row["error"] == "Couldn't find a class named Trie"


def test_design_mode_float_compare_allows_none_and_tolerance():
    problem = {
        "kind": "design",
        "functionName": "MedianFinder",
        "compare": "float",
        "tests": [{
            "args": {"ops": ["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"],
                     "args": [[], [1], [2], [], [3], []]},
            "expected": [None, None, None, 1.5, None, 2.0],
        }],
    }
    code = (
        "class MedianFinder:\n"
        "    def __init__(self):\n"
        "        self.nums = []\n"
        "    def addNum(self, num):\n"
        "        self.nums.append(num)\n"
        "    def findMedian(self):\n"
        "        s, n = sorted(self.nums), len(self.nums)\n"
        "        return (s[(n - 1) // 2] + s[n // 2]) / 2 + 1e-9\n"
    )
    assert harness.run(code, problem)[0]["passed"] is True
    assert harness.run(code.replace("/ 2 +", "// 2 +"), problem)[0]["passed"] is False


# --- roundtrip mode -----------------------------------------------------------------------

def test_roundtrip_mode_requires_a_string():
    code = "class Codec:\n    def serialize(self, root):\n        return [1]\n    def deserialize(self, data):\n        return None\n"
    row = harness.run(code, _public("code-serialize-deserialize-binary-tree"))[0]
    assert row["passed"] is False and row["error"] == "TypeError: serialize must return a str, got list"


def test_roundtrip_mode_uses_separate_instances_so_state_cannot_leak():
    code = (
        "class Codec:\n"
        "    def serialize(self, root):\n"
        "        self.root = root\n"
        "        return ''\n"
        "    def deserialize(self, data):\n"
        "        return self.root\n"
    )
    results = harness.run(code, _public("code-serialize-deserialize-binary-tree"))
    assert not any(r["passed"] for r in results)
    assert results[0]["error"] == "Error in deserialize: AttributeError: 'Codec' object has no attribute 'root' (line 6)"


def test_roundtrip_mode_uses_encode_decode_when_the_signature_does():
    strs = ["", "a,b", "#4#", "naïve", "日本語", "line\nbreak", "\\", "3#x"]
    problem = {
        "kind": "roundtrip",
        "functionName": "Codec",
        "signature": "class Codec:\n    def encode(self, strs: List[str]) -> str:\n    def decode(self, s: str) -> List[str]:",
        "tests": [{"args": [strs], "expected": strs}, {"args": [[]], "expected": []}, {"args": [[""]], "expected": [""]}],
    }
    length_prefixed = (
        "class Codec:\n"
        "    def encode(self, strs):\n"
        "        return ''.join(f'{len(s)}#{s}' for s in strs)\n"
        "    def decode(self, s):\n"
        "        out, i = [], 0\n"
        "        while i < len(s):\n"
        "            j = s.index('#', i)\n"
        "            n = int(s[i:j])\n"
        "            out.append(s[j + 1:j + 1 + n])\n"
        "            i = j + 1 + n\n"
        "        return out\n"
    )
    assert all(r["passed"] for r in harness.run(length_prefixed, problem))
    comma_joined = "class Codec:\n    def encode(self, strs):\n        return ','.join(strs)\n    def decode(self, s):\n        return s.split(',')\n"
    assert [r["passed"] for r in harness.run(comma_joined, problem)] == [False, False, True]
