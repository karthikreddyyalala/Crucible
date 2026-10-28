from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import AnswerEvaluation, PlannedQuestion
from models.question_data import QuestionExemplar

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "evaluator.md").read_text()


class EvaluatorAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(self, *, question: PlannedQuestion, transcript: str, follow_up_count: int,
            usage_sink: list | None = None,
            exemplar: QuestionExemplar | None = None) -> AnswerEvaluation:
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question: {question.prompt}\n\n"
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', transcript)}\n\n"
            f"Follow-up count: {follow_up_count}\n"
        )
        if exemplar:
            # Trusted server data from the bank (never from the client): outside the fence.
            user += (
                "\nRubric anchors for this question (trusted, from the question bank):\n"
                f"- Tests: {exemplar.signal}\n"
                f"- A strong answer covers: {'; '.join(exemplar.ideal_answer_points)}\n"
                f"- Weak-answer signs: {'; '.join(exemplar.weak_answer_signs)}\n"
                + "".join(f"- {k}: {v}\n" for k, v in exemplar.rubric.criteria.items())
            )
        return self._llm.structured(
            agent="evaluator", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=AnswerEvaluation,
        )
