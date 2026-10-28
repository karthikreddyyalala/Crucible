from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class _Base(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Competency(_Base):
    area: str
    weight: float


class CompetencyMap(_Base):
    role: str
    competencies: list[Competency]


class Rubric(_Base):
    criteria: dict[str, str]


Level = Literal["junior", "mid", "senior"]


class QuestionExemplar(_Base):
    id: str
    role: str
    competency: str
    type: Literal["behavioral", "technical", "system_design"]
    difficulty: Literal[1, 2, 3, 4, 5]
    prompt: str
    ideal_answer_points: list[str]
    follow_up_hooks: list[str] = Field(min_length=3)  # the follow-up ladder, shallow -> deep
    rubric: Rubric
    # What this question is really testing, in one line.
    signal: str = ""
    levels: list[Level] = ["junior", "mid", "senior"]
    weak_answer_signs: list[str] = []


class QuestionBank(_Base):
    role: str
    questions: list[QuestionExemplar]

    @model_validator(mode="after")
    def _unique_ids(self) -> "QuestionBank":
        ids = [q.id for q in self.questions]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate question ids in bank")
        return self
