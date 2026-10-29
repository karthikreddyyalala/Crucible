"""Add "starterCodeJs" to every backend/data/coding/problems/*.json, derived from the Python starter.

Free and local (no network). Safe to re-run; test_js_starters.py fails if a file is stale.

    cd backend && python3 -m cli.make_js_starters
"""

import ast
import json
import re
from pathlib import Path

PROBLEMS = Path(__file__).resolve().parent.parent / "data" / "coding" / "problems"
_SCALARS = {"int": "number", "float": "number", "str": "string", "bool": "boolean", "dict": "Object", "Dict": "Object"}
_LITERALS = {"True": "true", "False": "false", "None": "null"}
_NODES = {
    "ListNode": "// ListNode is provided: new ListNode(val, next) -> { val, next }",
    "TreeNode": "// TreeNode is provided: new TreeNode(val, left, right) -> { val, left, right }",
    "Node": "// Node is provided: new Node(val, neighbors) -> { val, neighbors }",
}


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(w[:1].upper() + w[1:] for w in rest)


def _type(node: ast.expr | None) -> str:
    if isinstance(node, ast.Constant) and node.value is None:
        return "void"
    if isinstance(node, ast.Name):
        return node.id if node.id in _NODES else _SCALARS.get(node.id, "*")
    if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name):
        inner = _type(node.slice)
        if node.value.id in ("list", "List"):
            return f"({inner})[]" if "|" in inner else f"{inner}[]"
        if node.value.id == "Optional":
            return f"{inner}|null"
    return "*"


def _jsdoc(fn: ast.FunctionDef, params: list[ast.arg], returns: bool) -> str:
    doc = ast.get_docstring(fn)
    doc = doc and re.sub(r"\b(True|False|None)\b", lambda m: _LITERALS[m.group()], doc)
    lines = [doc] if doc else []
    lines += [f"@param {{{_type(a.annotation)}}} {_camel(a.arg)}" for a in params]
    if returns:
        lines.append(f"@return {{{_type(fn.returns)}}}")
    return "/**\n" + "".join(f" * {line}\n" for line in lines) + " */\n" if lines else ""


def _args(fn: ast.FunctionDef) -> list[ast.arg]:
    return [a for a in fn.args.args if a.arg != "self"]


def _method(fn: ast.FunctionDef, indent: str = "") -> str:
    args = _args(fn)
    ctor = fn.name == "__init__"
    name = "constructor" if ctor else fn.name
    doc = _jsdoc(fn, args, returns=not ctor)
    body = f"{name}({', '.join(_camel(a.arg) for a in args)}) {{\n\n}}"
    return "".join(indent + line + "\n" if line else "\n" for line in (doc + body).splitlines())


def to_js_starter(python_starter: str) -> str:
    node = ast.parse(python_starter).body[0]
    used = sorted({n.id for n in ast.walk(node) if isinstance(n, ast.Name) and n.id in _NODES})
    head = "".join(_NODES[n] + "\n" for n in used) + ("\n" if used else "")
    if isinstance(node, ast.ClassDef):
        methods = [_method(m, "    ") for m in node.body if isinstance(m, ast.FunctionDef)]
        return f"{head}class {node.name} {{\n" + "\n".join(methods) + "}\n"
    assert isinstance(node, ast.FunctionDef)
    doc = _jsdoc(node, _args(node), returns=True)
    return f"{head}{doc}function {_camel(node.name)}({', '.join(_camel(a.arg) for a in _args(node))}) {{\n\n}}\n"


def main() -> None:
    for path in sorted(PROBLEMS.glob("*.json")):
        text = path.read_text(encoding="utf-8")
        js = json.dumps(to_js_starter(json.loads(text)["starterCode"]), ensure_ascii=False)
        # Edit one line, not the whole file: the files are hand-formatted (inline arrays).
        text = re.sub(r'^  "starterCodeJs": .*\n', "", text, flags=re.M)
        text = re.sub(r'^(  "starterCode": .*\n)', lambda m: f'{m.group(1)}  "starterCodeJs": {js},\n', text, count=1, flags=re.M)
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
