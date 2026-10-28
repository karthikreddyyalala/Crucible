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


_ATTRIBUTION = Path(loader.__file__).resolve().parent.parent / "data" / "question_bank" / "ATTRIBUTION.md"


@pytest.mark.parametrize("role,q", _ALL, ids=_IDS)
def test_question_source_is_original_or_attributed(role, q):
    if q.source == "original":
        return
    assert q.source.startswith("adapted from "), f"{q.id}: bad source {q.source!r}"
    name = q.source.removeprefix("adapted from ")
    assert name in _ATTRIBUTION.read_text(), f"{q.id}: {name!r} missing from ATTRIBUTION.md"


@pytest.mark.parametrize("role", _ROLE_KEYS)
def test_bank_covers_every_type_and_level(role):
    qs = load_question_bank(role).questions
    for t in ("behavioral", "technical", "system_design"):
        for lvl in ("junior", "mid", "senior"):
            assert sum(q.type == t and lvl in q.levels for q in qs) >= 2, (t, lvl)


@pytest.mark.parametrize("role", _ROLE_KEYS)
def test_every_competency_has_three_questions(role):
    qs = load_question_bank(role).questions
    for c in load_competency_map(role).competencies:
        assert sum(q.competency == c.area for q in qs) >= 3, c.area


@pytest.mark.parametrize("role,q", [(r, q) for r, q in _ALL if q.type == "system_design"],
                         ids=[q.id for _, q in _ALL if q.type == "system_design"])
def test_system_design_prompt_states_the_problem_only(role, q):
    assert not re.search(r"\d", q.prompt), q.prompt
    assert "clarif" not in q.prompt.lower(), q.prompt


_LEVEL_DIFFICULTY = {"junior": {1, 2}, "mid": {2, 3, 4}, "senior": {4, 5}}
_NEUTRAL_SD_OPENERS = {
    "What would you want to know before you start designing?",
    "What questions do you have before we start?",
}


@pytest.mark.parametrize("role,q", _ALL, ids=_IDS)
def test_every_listed_level_fits_the_difficulty(role, q):
    for lvl in q.levels:
        assert q.difficulty in _LEVEL_DIFFICULTY[lvl], (lvl, q.difficulty)


@pytest.mark.parametrize("role,q", _ALL, ids=_IDS)
def test_ladder_and_anchor_sizes(role, q):
    lo = 5 if q.type == "system_design" else 3
    assert lo <= len(q.follow_up_hooks) <= 6
    assert 3 <= len(q.ideal_answer_points) <= 6
    assert 2 <= len(q.weak_answer_signs) <= 4


@pytest.mark.parametrize("role,q", _ALL, ids=_IDS)
def test_every_rung_is_one_spoken_question(role, q):
    for hook in q.follow_up_hooks:
        assert hook.endswith("?"), hook


@pytest.mark.parametrize("role,q", [(r, q) for r, q in _ALL if q.type == "system_design"],
                         ids=[q.id for _, q in _ALL if q.type == "system_design"])
def test_system_design_first_rung_hands_over_nothing(role, q):
    assert q.follow_up_hooks[0] in _NEUTRAL_SD_OPENERS, q.follow_up_hooks[0]


# What the Planner asks per mode, minus the one custom question it may write, plus spares
# where memory weighting or diversity needs room to swap.
_PLANNER_NEED = {
    "behavioral": {"behavioral": 4},
    "technical": {"technical": 4},
    "system_design": {"system_design": 3},
    "full": {"behavioral": 2, "technical": 3, "system_design": 2},
}


@pytest.mark.parametrize("role", _ROLE_KEYS)
@pytest.mark.parametrize("mode", sorted(_PLANNER_NEED))
@pytest.mark.parametrize("level", ["junior", "mid", "senior"])
def test_bank_meets_planner_need_for_every_mode_and_level(role, mode, level):
    picked = bank_for(role, mode=mode, level=level)
    for t, need in _PLANNER_NEED[mode].items():
        assert sum(q.type == t for q in picked) >= need, (t, need)
