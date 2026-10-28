import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPORTED = ROOT / "src" / "lib" / "coding" / "problems.public.json"
PRIVATE = {"targetComplexity", "referenceSolution", "hints", "followUps", "idealAnswerPoints", "weakAnswerSigns", "rubric"}

_spec = importlib.util.spec_from_file_location("export_public_problems", ROOT / "scripts" / "export_public_problems.py")
exporter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(exporter)


def test_committed_export_matches_the_problem_files():
    # Re-run `python scripts/export_public_problems.py` after changing any problem.
    # Compare parsed problems one by one so a mismatch names the problem instead of
    # making pytest diff a 2 MB string (which takes minutes).
    committed = {p["id"]: p for p in json.loads(EXPORTED.read_text(encoding="utf-8"))}
    fresh = {p["id"]: p for p in json.loads(exporter.export())}
    assert committed.keys() == fresh.keys(), "problem set changed — re-run the export"
    stale = sorted(i for i in fresh if committed[i] != fresh[i])
    assert not stale, f"stale export for {stale} — re-run scripts/export_public_problems.py"
    same_bytes = EXPORTED.read_text(encoding="utf-8") == exporter.export()  # bool, so no 2 MB diff
    assert same_bytes, "formatting differs — re-run the export"


def test_export_holds_every_problem_without_server_side_fields():
    problems = json.loads(EXPORTED.read_text(encoding="utf-8"))
    assert [p["id"] for p in problems] == sorted(p.stem for p in (ROOT / "backend/data/coding/problems").glob("*.json"))
    assert all(not PRIVATE & p.keys() for p in problems)
    assert all({"starterCode", "tests", "visibleTestCount", "functionName"} <= p.keys() for p in problems)
