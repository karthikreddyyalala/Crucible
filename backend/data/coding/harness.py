"""Judges a candidate's Python against a coding problem's tests.

One file, two runtimes: the backend tests run it in CPython and the browser worker runs it
in Pyodide, so both judge code identically. Standard library only. `run` never raises;
every failure becomes a result row. Time limits are the worker's job, not this file's.
"""
import ast
import contextlib
import copy
import io
import json
import time
import traceback
from collections import deque

CODE_NAME = "<solution>"  # compile name of the candidate code, used to find its line numbers
STDOUT_CAP = 2000


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def _check_node(node, attr, kind):
    if node is not None and not hasattr(node, attr):
        raise TypeError(f"expected a {kind} or None, got {type(node).__name__}")


def _to_linked_list(values):
    head = tail = ListNode()
    for value in values:
        tail.next = tail = ListNode(value)
    return head.next


def _from_linked_list(node):
    out, seen = [], set()
    while node is not None:
        _check_node(node, "next", "ListNode")
        if id(node) in seen:
            raise ValueError("the returned list loops back on itself (cycle)")
        seen.add(id(node))
        out.append(node.val)
        node = node.next
    return out


def _to_tree(values):
    """Level order, None for a missing child; missing nodes have no child slots."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = deque([root]), 1
    while queue and i < len(values):
        node = queue.popleft()
        for side in ("left", "right"):
            if i < len(values) and values[i] is not None:
                child = TreeNode(values[i])
                setattr(node, side, child)
                queue.append(child)
            i += 1
    return root


def _from_tree(root):
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        _check_node(node, "left", "TreeNode")
        out.append(node.val)
        queue.extend((node.left, node.right))
    while out and out[-1] is None:
        out.pop()
    return out


def _to_graph(adjacency):
    """Adjacency list where node i has val i + 1; returns node 1."""
    nodes = [Node(i + 1) for i in range(len(adjacency))]
    for node, neighbors in zip(nodes, adjacency):
        node.neighbors = [nodes[j - 1] for j in neighbors]
    return nodes[0] if nodes else None


def _from_graph(start):
    if start is None:
        return []
    _check_node(start, "neighbors", "Node")
    seen, queue, found = {id(start)}, deque([start]), [start]
    while queue:
        for neighbor in queue.popleft().neighbors:
            if id(neighbor) not in seen:
                seen.add(id(neighbor))
                queue.append(neighbor)
                found.append(neighbor)
    return [[n.val for n in node.neighbors] for node in sorted(found, key=lambda n: n.val)]


# structure -> (JSON value -> nodes, nodes -> JSON value)
ADAPTERS = {
    "linked_list": (_to_linked_list, _from_linked_list),
    "tree": (_to_tree, _from_tree),
    "graph": (_to_graph, _from_graph),
}


def two_sum_pair(args, expected, got):
    """Any two distinct in-range indices whose values sum to the target."""
    nums, target = args
    return (
        isinstance(got, list) and len(got) == 2
        and all(type(i) is int and 0 <= i < len(nums) for i in got)
        and got[0] != got[1] and nums[got[0]] + nums[got[1]] == target
    )


# compare == "custom": validator(original args, expected, got) -> bool. args are the test's
# untouched JSON args, so a candidate that mutates its input can't fool the check.
VALIDATORS = {"two_sum_pair": two_sum_pair}


def _plain(value):
    """JSON-safe copy: tuples become lists, unknown objects become their repr."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    return repr(value)


def _key(value):
    return json.dumps(value, sort_keys=True)


def _close(expected, got):
    """Numbers within 1e-5, element-wise through lists; None only matches None."""
    if expected is None or got is None:
        return expected is None and got is None
    if isinstance(expected, list):
        return isinstance(got, list) and len(got) == len(expected) and all(map(_close, expected, got))
    return isinstance(got, (int, float)) and not isinstance(got, bool) and abs(got - expected) <= 1e-5


def matches(mode, expected, got, args=(), validator=""):
    if mode == "custom":
        return bool(VALIDATORS[validator](args, expected, got))
    if mode == "float":
        return _close(expected, got)
    if mode in ("unordered", "unordered_nested"):
        if not isinstance(got, list):
            return False
        if mode == "unordered_nested":
            if not all(isinstance(g, list) for g in got):
                return False
            got = [sorted(g, key=_key) for g in got]
            expected = [sorted(e, key=_key) for e in expected]
        return sorted(got, key=_key) == sorted(expected, key=_key)
    return got == expected


class _StepError(Exception):
    """Wraps an error from one call of a design / roundtrip test so the row says which call."""

    def __init__(self, label, error):
        super().__init__(label)
        self.label, self.error = label, error


def _step(label, call):
    try:
        return call()
    except (Exception, SystemExit) as error:
        raise _StepError(label, error)


def _describe(error):
    """'<Type>: <message> (line N)' with N in the candidate's code, when it has a frame there."""
    if isinstance(error, _StepError):
        return f"{error.label}: {_describe(error.error)}"
    if isinstance(error, SyntaxError):
        message, line = error.msg, error.lineno
    else:
        message = str(error)
        frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == CODE_NAME]
        line = frames[-1].lineno if frames else None
    text = f"{type(error).__name__}: {message}" if message else type(error).__name__
    return f"{text} (line {line})" if line else text


def _row(index, error=None, stdout=""):
    return {"index": index, "passed": False, "got": None, "expected": None, "error": error, "stdout": stdout, "ms": 0.0}


def _find(namespace, name):
    fn = namespace.get(name)
    if callable(fn):
        return fn
    solution = namespace.get("Solution")  # LeetCode style: a fresh instance per test
    if isinstance(solution, type) and callable(getattr(solution, name, None)):
        return lambda *args: getattr(solution(), name)(*args)
    return None


def _param_names(signature):
    try:
        return [a.arg for a in ast.parse(signature.strip() + "\n    pass").body[0].args.args]
    except (SyntaxError, IndexError, AttributeError):
        return []


def _function(fn, test, problem, kinds, row):
    adapters = problem.get("adapters") or {}
    args = copy.deepcopy(test["args"])
    for i, kind in enumerate(kinds[: len(args)]):
        if kind:
            args[i] = ADAPTERS[kind][0](args[i])
    raw = fn(*args)
    out_kind = adapters.get("return")
    check = problem.get("checkArg")
    if check is not None:  # in-place: judge the argument after the call, ignore the return value
        raw, out_kind = args[check], (kinds[check] if check < len(kinds) else None)
    row["got"] = _plain(raw)  # shown as-is if the conversion below rejects it
    if out_kind:
        row["got"] = _plain(ADAPTERS[out_kind][1](raw))
    return matches(
        problem.get("compare", "exact"), test["expected"], row["got"],
        copy.deepcopy(test["args"]), problem.get("validator", ""),
    )


def _design(cls, test, problem, kinds, row):
    calls = copy.deepcopy(test["args"])
    got = row["got"] = []  # filled as calls succeed, so a failing row shows what came before
    instance = None
    for n, (op, args) in enumerate(zip(calls["ops"], calls["args"]), 1):
        label = f"Error in call {n} ({op})"
        if n == 1:
            instance = _step(label, lambda: cls(*args))
            got.append(None)
        else:
            got.append(_plain(_step(label, lambda: getattr(instance, op)(*args))))
    expected, compare = test["expected"], problem.get("compare", "exact")
    return len(got) == len(expected) and all(matches(compare, e, g) for e, g in zip(expected, got))


_CODEC_PAIRS = (("serialize", "deserialize"), ("encode", "decode"))


def _roundtrip(cls, test, problem, kinds, row):
    signature = problem.get("signature", "")
    forward, backward = next((p for p in _CODEC_PAIRS if f"def {p[0]}(" in signature), _CODEC_PAIRS[0])
    kind = (problem.get("adapters") or {}).get("input")
    value = copy.deepcopy(test["args"][0])
    if kind:
        value = ADAPTERS[kind][0](value)
    # A fresh instance per direction, like the classic judge: the string must carry everything.
    text = _step(f"Error in {forward}", lambda: getattr(cls(), forward)(value))
    if not isinstance(text, str):
        row["got"] = _plain(text)
        raise TypeError(f"{forward} must return a str, got {type(text).__name__}")
    result = _step(f"Error in {backward}", lambda: getattr(cls(), backward)(text))
    row["got"] = _plain(result)
    if kind:
        row["got"] = _plain(ADAPTERS[kind][1](result))
    return matches(problem.get("compare", "exact"), test["expected"], row["got"])


_BODIES = {"function": _function, "design": _design, "roundtrip": _roundtrip}


def _judge(index, fn, test, problem, kinds, body):
    row = _row(index)
    row["expected"] = test["expected"]
    out = io.StringIO()
    start = time.perf_counter()
    try:
        with contextlib.redirect_stdout(out):
            row["passed"] = bool(body(fn, test, problem, kinds, row))
    except (Exception, SystemExit) as error:  # KeyboardInterrupt is left alone for the worker
        row["error"] = _describe(error)
    row["ms"] = round((time.perf_counter() - start) * 1000, 3)
    row["stdout"] = out.getvalue()[:STDOUT_CAP]
    return row


def run(code, problem, only_visible=False):
    """Run `code` against `problem` (the camelCase public dict) and return one row per test:
    {"index", "passed", "got", "expected", "error", "stdout", "ms"}. Code that can't load
    (syntax error, error at import time, missing function or class) returns a single row
    with index -1.

    kind "function" calls functionName(*args) (checkArg: judge that argument after the call);
    "design" replays {ops, args} on the class functionName; "roundtrip" checks that
    deserialize(serialize(x)) (or decode(encode(x))) gives x back."""
    name = problem["functionName"]
    tests = problem["tests"]
    if only_visible:
        tests = tests[: problem.get("visibleTestCount", len(tests))]
    try:
        compiled = compile(code, CODE_NAME, "exec")
    except Exception as error:  # SyntaxError, or ValueError for odd input such as null bytes
        return [_row(-1, _describe(error))]
    namespace = {"__name__": "solution", "ListNode": ListNode, "TreeNode": TreeNode, "Node": Node}
    exec("from typing import *", namespace)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            exec(compiled, namespace)
    except (Exception, SystemExit) as error:
        return [_row(-1, _describe(error), out.getvalue()[:STDOUT_CAP])]
    kind = problem.get("kind", "function")
    fn = _find(namespace, name)
    if fn is None:
        return [_row(-1, f"Couldn't find a {'function' if kind == 'function' else 'class'} named {name}")]
    adapters = problem.get("adapters") or {}
    kinds = [adapters.get(p) for p in _param_names(problem.get("signature", ""))]
    body = _BODIES.get(kind, _function)
    return [_judge(i, fn, test, problem, kinds, body) for i, test in enumerate(tests)]
