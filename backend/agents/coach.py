from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import CoachResponse, PlannedQuestion

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "coach.md").read_text()


class CoachAgent:
    """Reworks the candidate's own attempt into a model 5/5 answer, on demand."""

    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(
        self,
        *,
        question: PlannedQuestion,
        transcript: str,
        weakness_tags: list[str],
        usage_sink: list | None = None,
    ) -> CoachResponse:
        tags = ", ".join(weakness_tags) if weakness_tags else "(none flagged)"
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question: {question.prompt}\n\n"
            f"Candidate Answer (their attempt):\n{wrap_untrusted('candidate_answer', transcript)}\n\n"
            f"Weakness tags to fix: {tags}"
        )
        return self._llm.structured(
            agent="coach", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=CoachResponse,
        )
