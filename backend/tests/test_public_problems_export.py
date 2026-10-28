import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPORTED = ROOT / "src" / "lib" / "coding" / "problems.public.json"
PRIVATE = {"referenceSolution", "hints", "followUps", "idealAnswerPoints", "weakAnswerSigns", "rubric"}

_spec = importlib.util.spec_from_file_location("export_public_problems", ROOT / "scripts" / "export_public_problems.py")
exporter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(exporter)


def test_committed_export_matches_the_problem_files():
    # Re-run `python scripts/export_public_problems.py` after changing any problem.
    assert EXPORTED.read_text(encoding="utf-8") == exporter.export()


def test_export_holds_every_problem_without_server_side_fields():
    problems = json.loads(EXPORTED.read_text(encoding="utf-8"))
    assert [p["id"] for p in problems] == sorted(p.stem for p in (ROOT / "backend/data/coding/problems").glob("*.json"))
    assert all(not PRIVATE & p.keys() for p in problems)
    assert all({"starterCode", "tests", "visibleTestCount", "functionName"} <= p.keys() for p in problems)
