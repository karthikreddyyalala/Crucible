from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import InterviewDecision, PlannedQuestion

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "interviewer.md").read_text()


class InterviewerAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run_turn(
        self,
        *,
        question: PlannedQuestion,
        candidate_answer: str,
        follow_up_count: int,
        is_last_question: bool,
    ) -> InterviewDecision:
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question: {question.prompt}\n\n"
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', candidate_answer)}\n\n"
            f"followUpCount: {follow_up_count}\n"
            f"isLastQuestion: {'true' if is_last_question else 'false'}"
        )
        return self._llm.structured(
            model=self._model, system=_PROMPT, user=user, schema=InterviewDecision,
        )
