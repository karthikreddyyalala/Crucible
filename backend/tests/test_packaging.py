import os
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
BUILD_SCRIPT = BACKEND.parent / "deploy" / "build-lambda.sh"
# Dev-only packages: never imported by app.py, so the Lambda zip leaves them out.
DEV_ONLY = {"tests", "evals", "cli"}


def _packages() -> set[str]:
    return {p.parent.name for p in BACKEND.glob("*/__init__.py")}


def _shipped() -> list[str]:
    match = re.search(r"for item in ([^;]+); do", BUILD_SCRIPT.read_text())
    assert match, "could not find the copy list in deploy/build-lambda.sh"
    return match.group(1).split()


def test_lambda_zip_ships_every_runtime_package():
    """A package missing from the copy list imports fine locally and crashes on Lambda."""
    missing = _packages() - DEV_ONLY - set(_shipped())
    assert not missing, f"deploy/build-lambda.sh does not copy: {sorted(missing)}"


def test_wheel_includes_every_package():
    config = tomllib.loads((BACKEND / "pyproject.toml").read_text())
    included = set(config["tool"]["setuptools"]["packages"]["find"]["include"])
    missing = {f"{p}*" for p in _packages() - {"tests"}} - included
    assert not missing, f"pyproject.toml packages.find.include is missing: {sorted(missing)}"


# Run in a child process: every shipped module must come from the copied tree, so a
# package that is only importable from the repo (or an installed copy) fails here.
_IMPORT_PROBE = """
import pathlib, sys
shipped = set(sys.argv[1:])
root = pathlib.Path.cwd().resolve()
import lambda_handler
stray = sorted(
    f"{name} -> {module.__file__}"
    for name, module in sys.modules.items()
    if name.split(".")[0] in shipped
    and getattr(module, "__file__", None)
    and not pathlib.Path(module.__file__).resolve().is_relative_to(root)
)
assert not stray, f"imported from outside the shipped tree: {stray}"
"""


def test_lambda_handler_imports_from_exactly_what_the_zip_ships(tmp_path):
    items = _shipped()
    for item in items:
        source = BACKEND / item
        if source.is_dir():
            shutil.copytree(source, tmp_path / item, ignore=shutil.ignore_patterns("__pycache__"))
        else:
            shutil.copy2(source, tmp_path / item)

    env = {**os.environ, "PYTHONPATH": str(tmp_path), "AWS_REGION": "us-east-1"}
    env.pop("ELEVENLABS_API_KEY", None)
    result = subprocess.run(
        [sys.executable, "-c", _IMPORT_PROBE, *(Path(i).stem for i in items)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr[-2000:]
