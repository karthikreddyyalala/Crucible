import shutil
import subprocess

import pytest

from cli.make_js_starters import to_js_starter
from models.coding import load_problems

THREE_SUM = 'def three_sum(nums: list[int]) -> list[list[int]]:\n    """Return all triplets that sum to zero."""\n    pass\n'
WORD_DICT = (
    "class WordDictionary:\n    def __init__(self):\n        pass\n\n"
    '    def addWord(self, word: str) -> None:\n        """Store word."""\n        pass\n\n'
    '    def search(self, word: str) -> bool:\n        """Match word."""\n        pass\n'
)


def test_function_gets_camel_name_and_jsdoc_types():
    js = to_js_starter(THREE_SUM)
    assert "function threeSum(nums)" in js
    assert "@param {number[]} nums" in js
    assert "@return {number[][]}" in js
    assert "Return all triplets that sum to zero." in js


def test_design_class_keeps_method_names():
    js = to_js_starter(WORD_DICT)
    assert "class WordDictionary" in js
    assert "constructor()" in js
    assert "addWord(word)" in js and "search(word)" in js
    assert "@return {void}" in js and "@return {boolean}" in js


def test_type_map_optional_dict_unknown_and_nested():
    sig = "def f(a: Optional[TreeNode], b: dict, c: List[Optional[ListNode]], d: float, e: Foo) -> None:\n    pass\n"
    js = to_js_starter(sig)
    for t in ("{TreeNode|null} a", "{Object} b", "{(ListNode|null)[]} c", "{number} d", "{*} e", "@return {void}"):
        assert t in js


def test_node_classes_get_a_shape_comment():
    assert "TreeNode(val, left, right)" in to_js_starter("def f(root: Optional[TreeNode]) -> int:\n    pass\n")
    assert "ListNode(val, next)" in to_js_starter("def f(head: Optional[ListNode]) -> int:\n    pass\n")
    assert "Node(val, neighbors)" in to_js_starter("def f(node: Optional[Node]) -> int:\n    pass\n")
    assert "TreeNode(" not in to_js_starter(THREE_SUM)


def test_every_problem_has_a_js_starter_with_the_name_the_harness_looks_for():
    for p in load_problems().values():
        assert p.starter_code_js.strip(), p.id
        assert p.starter_code_js == to_js_starter(p.starter_code), f"{p.id}: stale, re-run cli/make_js_starters.py"
        if p.kind == "function":
            camel = "".join(w if i == 0 else w.title() for i, w in enumerate(p.function_name.split("_")))
            assert f"function {camel}(" in p.starter_code_js, p.id
        else:
            assert f"class {p.function_name}" in p.starter_code_js, p.id


def test_public_export_includes_it():
    p = next(iter(load_problems().values()))
    assert p.public()["starterCodeJs"] == p.starter_code_js


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_every_starter_parses(tmp_path):
    for p in load_problems().values():
        f = tmp_path / f"{p.id}.js"
        f.write_text(p.starter_code_js, encoding="utf-8")
        r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
        assert r.returncode == 0, f"{p.id}: {r.stderr}"
