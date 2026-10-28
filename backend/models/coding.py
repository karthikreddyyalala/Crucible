import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

_PROBLEM_DIR = Path(__file__).resolve().parent.parent / "data" / "coding" / "problems"
RUBRIC_KEYS = frozenset({"correctness", "efficiency", "code_quality", "communication"})
# Server-side only: Marcus and the Evaluator use these; the browser never sees them.
_PRIVATE = {"reference_solution", "hints", "follow_ups", "ideal_answer_points", "weak_answer_signs", "rubric"}


class _Frozen(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class CodingExample(_Frozen):
    input: str
    output: str
    explanation: str = ""


class CodingTest(_Frozen):
    args: list[Any]  # positional, in signature order; plain JSON (adapters build nodes)
    expected: Any


class CodingProblem(_Frozen):
    id: str = Field(pattern=r"^code-[a-z0-9]+(-[a-z0-9]+)*$")  # must equal the JSON file name stem
    title: str
    difficulty: Literal["easy", "medium", "hard"]
    topics: tuple[str, ...] = Field(min_length=1)
    asked: Literal["very_common", "common"] = "very_common"
    statement: str
    function_name: str
    signature: str
    starter_code: str
    examples: tuple[CodingExample, ...] = Field(min_length=2, max_length=3)
    # The first N tests are shown to the candidate. 2-3 is always <= len(tests) since tests >= 10.
    visible_test_count: int = Field(ge=2, le=3)
    tests: tuple[CodingTest, ...] = Field(min_length=10, max_length=15)
    compare: Literal["exact", "unordered", "unordered_nested", "float", "custom"] = "exact"
    validator: str = ""  # a key of VALIDATORS in data/coding/harness.py, when compare == "custom"
    adapters: dict[str, Literal["linked_list", "tree", "graph"]] = {}  # param name (or "return") -> structure
    reference_solution: str
    target_complexity: dict[str, str]
    hints: tuple[str, ...] = Field(min_length=3, max_length=5)
    follow_ups: tuple[str, ...] = Field(min_length=3, max_length=5)
    ideal_answer_points: tuple[str, ...] = Field(min_length=1)
    weak_answer_signs: tuple[str, ...] = Field(min_length=1)
    rubric: dict[str, str]

    @model_validator(mode="after")
    def _consistent(self) -> "CodingProblem":
        if set(self.rubric) != RUBRIC_KEYS:
            raise ValueError(f"rubric keys must be exactly {sorted(RUBRIC_KEYS)}")
        if set(self.target_complexity) != {"time", "space"}:
            raise ValueError("targetComplexity needs exactly 'time' and 'space'")
        if not all(f.rstrip().endswith("?") for f in self.follow_ups):
            raise ValueError("every follow-up must be a question ending with '?'")
        if self.compare == "custom" and not self.validator:
            raise ValueError("compare 'custom' needs a validator name")
        if not self.signature.startswith(f"def {self.function_name}("):
            raise ValueError("signature must define functionName")
        if not self.starter_code.startswith(self.signature):
            raise ValueError("starterCode must start with the signature")
        return self

    def public(self) -> dict[str, Any]:
        """What the browser gets: everything except the reference solution and Marcus's notes."""
        return self.model_dump(mode="json", by_alias=True, exclude=_PRIVATE)


@lru_cache(maxsize=None)
def load_problems() -> dict[str, CodingProblem]:
    problems: dict[str, CodingProblem] = {}
    for path in sorted(_PROBLEM_DIR.glob("*.json")):
        problem = CodingProblem.model_validate(json.loads(path.read_text(encoding="utf-8")))
        if problem.id != path.stem:
            raise ValueError(f"{path.name}: id '{problem.id}' must equal the file name")
        problems[problem.id] = problem
    return problems


def find_problem(problem_id: str | None) -> CodingProblem | None:
    return load_problems().get(problem_id) if problem_id else None


def problems_for(difficulties: set[str]) -> list[CodingProblem]:
    return sorted((p for p in load_problems().values() if p.difficulty in difficulties), key=lambda p: p.id)
