import json
from pathlib import Path

from evals.run_accuracy_eval import load_cases
from models.loader import find_exemplar

GOLDEN = Path(__file__).parent / "golden"


def test_loader_accepts_cases_with_and_without_exemplar_id():
    plain = load_cases(GOLDEN / "interview_turn_cases.json")
    bank = load_cases(GOLDEN / "interview_turn_bank_cases.json")
    assert plain and not any("exemplarId" in c["question"] for c in plain)
    assert len(bank) == 8 and all(c["question"]["exemplarId"] == c["exemplar_id"] for c in bank)


def test_every_bank_case_points_at_a_real_matching_exemplar():
    for c in json.loads((GOLDEN / "interview_turn_bank_cases.json").read_text()):
        ex = find_exemplar(c["exemplar_id"])
        assert ex and ex.type == c["question"]["type"] and ex.prompt == c["question"]["prompt"]
        assert 2 <= len(c["expect_probe_targets"]) <= 4
        assert all(k == k.lower() for k in c["expect_probe_targets"])
