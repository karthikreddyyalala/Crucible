import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator
from pydantic.alias_generators import to_camel

_PATH = Path(__file__).resolve().parent.parent / "data" / "company_styles.json"
CompanyStyleId = Literal["general", "amazon", "google", "meta", "microsoft", "startup"]


class QuestionMix(BaseModel):
    """Relative weight per question type. Snake_case keys, same shape as the JSON object."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    behavioral: int = Field(ge=0)
    technical: int = Field(ge=0)
    system_design: int = Field(ge=0)
    coding: int = Field(ge=0)

    @model_validator(mode="after")
    def _some_weight(self) -> "QuestionMix":
        if sum(self.model_dump().values()) <= 0:
            raise ValueError("question_mix weights must sum to more than 0")
        return self


class CompanyStyle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)

    id: CompanyStyleId
    name: str
    description: str = Field(min_length=1, max_length=120)
    question_mix: QuestionMix
    behavioral_themes: tuple[str, ...] = Field(min_length=3, max_length=8)
    interviewer_note: str = Field(min_length=1)  # what Marcus digs for


@lru_cache(maxsize=None)
def load_company_styles() -> dict[str, CompanyStyle]:
    styles = TypeAdapter(list[CompanyStyle]).validate_python(json.loads(_PATH.read_text()))
    return {s.id: s for s in styles}


def find_style(style_id: str) -> CompanyStyle:
    styles = load_company_styles()
    return styles.get(style_id) or styles["general"]
