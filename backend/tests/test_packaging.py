import re
import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
BUILD_SCRIPT = BACKEND.parent / "deploy" / "build-lambda.sh"
# Dev-only packages: never imported by app.py, so the Lambda zip leaves them out.
DEV_ONLY = {"tests", "evals", "cli"}


def _packages() -> set[str]:
    return {p.parent.name for p in BACKEND.glob("*/__init__.py")}


def test_lambda_zip_ships_every_runtime_package():
    """A package missing from the copy list imports fine locally and crashes on Lambda."""
    match = re.search(r"for item in ([^;]+); do", BUILD_SCRIPT.read_text())
    assert match, "could not find the copy list in deploy/build-lambda.sh"
    shipped = set(match.group(1).split())
    missing = _packages() - DEV_ONLY - shipped
    assert not missing, f"deploy/build-lambda.sh does not copy: {sorted(missing)}"


def test_wheel_includes_every_package():
    config = tomllib.loads((BACKEND / "pyproject.toml").read_text())
    included = set(config["tool"]["setuptools"]["packages"]["find"]["include"])
    missing = {f"{p}*" for p in _packages() - {"tests"}} - included
    assert not missing, f"pyproject.toml packages.find.include is missing: {sorted(missing)}"
