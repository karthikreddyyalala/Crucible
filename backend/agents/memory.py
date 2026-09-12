import json
from pathlib import Path
from models.contracts import AnswerEvaluation, MemoryProfile

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "memory.md").read_text()


class MemoryAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(
        self,
        *,
        candidate_id: str,
        session_date: str,
        evaluations: list[AnswerEvaluation],
        existing_memory: MemoryProfile,
    ) -> MemoryProfile:
        evals_json = json.dumps(
            [e.model_dump(by_alias=True) for e in evaluations], indent=2
        )
        user = (
            f"candidateId: {candidate_id}\n"
            f"sessionDate: {session_date}\n\n"
            f"existingMemory:\n{existing_memory.model_dump_json(by_alias=True, indent=2)}\n\n"
            f"evaluations:\n{evals_json}"
        )
        return self._llm.structured(
            agent="memory",
            model=self._model, system=_PROMPT, user=user, schema=MemoryProfile,
        )
