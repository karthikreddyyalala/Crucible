import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator
from pydantic.alias_generators import to_camel

_PATH = Path(__file__).resolve().parent.parent / "data" / "company_styles.json"
_MIX_KEYS = {"behavioral", "technical", "system_design", "coding"}


class CompanyStyle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)

    id: Literal["general", "amazon", "google", "meta", "microsoft", "startup"]
    name: str
    description: str = Field(min_length=1, max_length=120)
    question_mix: dict[str, int]  # relative weights per question type
    behavioral_themes: tuple[str, ...] = Field(min_length=3, max_length=8)
    interviewer_note: str = Field(min_length=1)  # what Marcus digs for

    @field_validator("question_mix")
    @classmethod
    def _valid_mix(cls, mix: dict[str, int]) -> dict[str, int]:
        if set(mix) != _MIX_KEYS or min(mix.values()) < 0 or sum(mix.values()) <= 0:
            raise ValueError(f"question_mix needs exactly {sorted(_MIX_KEYS)}, weights >= 0, sum > 0")
        return mix


@lru_cache(maxsize=None)
def load_company_styles() -> dict[str, CompanyStyle]:
    styles = TypeAdapter(list[CompanyStyle]).validate_python(json.loads(_PATH.read_text()))
    return {s.id: s for s in styles}


def find_style(id: str) -> CompanyStyle:
    styles = load_company_styles()
    return styles.get(id) or styles["general"]
