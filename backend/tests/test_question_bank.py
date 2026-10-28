import re
from pathlib import Path

import pytest
from pydantic import ValidationError
from models import loader
from models.loader import bank_for, find_exemplar, load_competency_map, load_question_bank
from models.question_data import QuestionBank, QuestionExemplar

_Q = {
    "id": "sde-beh-ownership-1", "role": "SDE", "competency": "Behavioral & Ownership",
    "type": "behavioral", "difficulty": 3, "levels": ["mid", "senior"],
    "signal": "Owns an outcome end to end under real constraints",
    "prompt": "Tell me about a project you owned where the deadline felt unrealistic.",
    "idealAnswerPoints": ["specific situation", "own decisions", "measured result"],
    "weakAnswerSigns": ["only 'we'", "no outcome"],
    "followUpHooks": ["What did you personally decide?", "How did you know it worked?",
                      "What would you do differently?"],
    "rubric": {"criteria": {"ownership": "names decisions they personally made"}},
}


def test_exemplar_accepts_signal_levels_and_weak_signs():
    q = QuestionExemplar.model_validate(_Q)
    assert q.signal and q.levels == ("mid", "senior") and q.weak_answer_signs


def test_exemplar_requires_at_least_three_follow_ups():
    with pytest.raises(ValidationError):
        QuestionExemplar.model_validate({**_Q, "followUpHooks": ["only one"]})


def test_bank_rejects_duplicate_ids():
    with pytest.raises(ValidationError):
        QuestionBank.model_validate({"role": "SDE", "questions": [_Q, _Q]})


@pytest.mark.parametrize("role", ["sde", "ai_engineer"])
def test_bank_loads_and_matches_competency_map(role):
    bank = load_question_bank(role)
    areas = {c.area for c in load_competency_map(role).competencies}
    assert bank.questions
    for q in bank.questions:
        assert q.competency in areas, f"{q.id}: unknown competency {q.competency}"


def test_ids_are_globally_unique_and_findable():
    ids = [q.id for r in ("sde", "ai_engineer") for q in load_question_bank(r).questions]
    assert len(ids) == len(set(ids))
    assert find_exemplar(ids[0]).id == ids[0]
    assert find_exemplar("nope") is None


def test_bank_for_filters_by_mode_and_level():
    picked = bank_for("sde", mode="behavioral", level="junior")
    assert picked and all(q.type == "behavioral" and "junior" in q.levels for q in picked)
    assert {q.type for q in bank_for("sde", mode="full", level="mid")} == {
        "behavioral", "technical", "system_design"}


_ROLE_KEYS = sorted(p.stem for p in (Path(loader.__file__).resolve().parent.parent / "data" / "question_bank").glob("*.json"))
_ALL = [(r, q) for r in _ROLE_KEYS for q in load_question_bank(r).questions]
_IDS = [q.id for _, q in _ALL]
_TAG = {"behavioral": "beh", "technical": "tech", "system_design": "sd"}
_PREFIX = {"sde": "sde", "ai_engineer": "aie"}
_CRITERIA = {
    "behavioral": {"structure", "specificity", "impact", "ownership"},
    "technical": {"correctness", "depth", "edge_cases", "communication"},
    "system_design": {"requirements", "scalability", "tradeoffs", "depth"},
}


@pytest.mark.parametrize("role,q", _ALL, ids=_IDS)
def test_question_content_rules(role, q):
    assert q.id.startswith(f"{_PREFIX[role]}-{_TAG[q.type]}-")
    assert set(q.rubric.criteria) == _CRITERIA[q.type]
    assert q.role == load_question_bank(role).role
    assert len(re.findall(r"[.?!](\s|$)", q.prompt)) <= 1
    assert len(q.weak_answer_signs) >= 2 and len(q.ideal_answer_points) >= 3
