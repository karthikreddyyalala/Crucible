from pathlib import Path
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan
from models.question_data import CompetencyMap

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "planner.md").read_text()


class PlannerAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(self, *, session_id: str, profile: IntakeProfile,
            memory: MemoryProfile, competency_map: CompetencyMap,
            mode: str = "full", level: str = "mid") -> QuestionPlan:
        user = (
            f"sessionId: {session_id}\n"
            f"mode: {mode}\n"
            f"level: {level}\n\n"
            f"IntakeProfile:\n{profile.model_dump_json(by_alias=True, indent=2)}\n\n"
            f"MemoryProfile:\n{memory.model_dump_json(by_alias=True, indent=2)}\n\n"
            f"CompetencyMap:\n{competency_map.model_dump_json(by_alias=True, indent=2)}"
        )
        return self._llm.structured(
            agent="planner",
            model=self._model, system=_PROMPT, user=user, schema=QuestionPlan,
        )
