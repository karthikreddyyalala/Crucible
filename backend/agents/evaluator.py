from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import AnswerEvaluation, PlannedQuestion

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "evaluator.md").read_text()


class EvaluatorAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(self, *, question: PlannedQuestion, transcript: str, follow_up_count: int,
            usage_sink: list | None = None) -> AnswerEvaluation:
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question: {question.prompt}\n\n"
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', transcript)}\n\n"
            f"Follow-up count: {follow_up_count}"
        )
        return self._llm.structured(
            agent="evaluator", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=AnswerEvaluation,
        )
