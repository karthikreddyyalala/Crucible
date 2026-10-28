import pytest
from pydantic import ValidationError
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
    assert q.signal and q.levels == ["mid", "senior"] and q.weak_answer_signs


def test_exemplar_requires_at_least_three_follow_ups():
    with pytest.raises(ValidationError):
        QuestionExemplar.model_validate({**_Q, "followUpHooks": ["only one"]})


def test_bank_rejects_duplicate_ids():
    with pytest.raises(ValidationError):
        QuestionBank.model_validate({"role": "SDE", "questions": [_Q, _Q]})
