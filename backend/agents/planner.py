import json
from pathlib import Path
from models.coding import CodingProblem
from models.company_style import CompanyStyle
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan
from models.question_data import CompetencyMap, QuestionExemplar

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "planner.md").read_text()


class PlannerAgent:
    def __init__(self, llm, model: str, temperature: float = 0.0):
        self._llm = llm
        self._model = model
        self._temperature = temperature

    def run(self, *, session_id: str, profile: IntakeProfile,
            memory: MemoryProfile, competency_map: CompetencyMap,
            mode: str = "full", level: str = "mid",
            usage_sink: list | None = None,
            bank: list[QuestionExemplar] | None = None,
            coding_problems: list[CodingProblem] | None = None,
            company_style: CompanyStyle | None = None) -> QuestionPlan:
        user = (
            f"sessionId: {session_id}\n"
            f"mode: {mode}\n"
            f"level: {level}\n\n"
            f"IntakeProfile:\n{profile.model_dump_json(by_alias=True, indent=2)}\n\n"
            f"MemoryProfile:\n{memory.model_dump_json(by_alias=True, indent=2)}\n\n"
            f"CompetencyMap:\n{competency_map.model_dump_json(by_alias=True, indent=2)}"
        )
        if bank:
            keys = ("id", "type", "competency", "difficulty", "levels", "signal", "prompt", "asked")
            user += "\n\nQuestionBank (choose from these):\n" + json.dumps(
                [{k: getattr(q, k) for k in keys} for q in bank], indent=2)
        if coding_problems:
            # Only what choosing needs; statements, solutions and hints stay with Marcus/the Evaluator.
            keys = {"id", "title", "difficulty", "topics", "asked"}
            user += "\n\nCodingProblems (choose from these for coding questions):\n" + json.dumps(
                [p.model_dump(mode="json", include=keys) for p in coding_problems], indent=2)
        if company_style:
            mix = ", ".join(f"{k} {v}" for k, v in company_style.question_mix.items())
            user += (
                f"\n\nCompanyStyle: {company_style.name}\n"
                f"- Behavioral themes (weight question choice toward these themes): "
                f"{', '.join(company_style.behavioral_themes)}\n"
                f"- Question mix (relative emphasis; never changes the mode's round shape): {mix}"
            )
        return self._llm.structured(
            agent="planner", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=QuestionPlan,
            temperature=self._temperature,
        )
