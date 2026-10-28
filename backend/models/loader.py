import json
from functools import lru_cache
from pathlib import Path
from models.question_data import CompetencyMap, QuestionBank, QuestionExemplar

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "competencies"


def load_competency_map(role_key: str) -> CompetencyMap:
    path = _DATA_DIR / f"{role_key}.json"
    if not path.exists():
        raise FileNotFoundError(f"No competency map for role '{role_key}' at {path}")
    return CompetencyMap.model_validate(json.loads(path.read_text()))


_BANK_DIR = Path(__file__).resolve().parent.parent / "data" / "question_bank"
_ROLES = ("sde", "ai_engineer")


@lru_cache(maxsize=None)
def load_question_bank(role_key: str) -> QuestionBank:
    path = _BANK_DIR / f"{role_key}.json"
    if not path.exists():
        raise FileNotFoundError(f"No question bank for role '{role_key}' at {path}")
    return QuestionBank.model_validate(json.loads(path.read_text()))


def bank_for(role_key: str, *, mode: str, level: str) -> list[QuestionExemplar]:
    return [
        q for q in load_question_bank(role_key).questions
        if level in q.levels and (mode == "full" or q.type == mode)
    ]


def find_exemplar(exemplar_id: str | None) -> QuestionExemplar | None:
    if not exemplar_id:
        return None
    for role in _ROLES:
        for q in load_question_bank(role).questions:
            if q.id == exemplar_id:
                return q
    return None
