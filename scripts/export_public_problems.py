"""Write src/lib/coding/problems.public.json, the problems demo mode runs without a backend.

Each entry is exactly what GET /api/coding/problems/{id} returns (CodingProblem.public()):
no reference solution, hints, follow-ups or rubric, so the shipped bundle never holds them.
Run after adding or changing a problem; backend/tests/test_public_problems_export.py fails
until the committed file matches.

    python scripts/export_public_problems.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "lib" / "coding" / "problems.public.json"

sys.path.insert(0, str(ROOT / "backend"))
from models.coding import load_problems  # noqa: E402


def export() -> str:
    problems = sorted(load_problems().values(), key=lambda p: p.id)
    return json.dumps([p.public() for p in problems], separators=(",", ":"), ensure_ascii=False) + "\n"


if __name__ == "__main__":
    OUT.write_text(export(), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
