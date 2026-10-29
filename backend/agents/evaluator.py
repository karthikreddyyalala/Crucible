from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.coding import CodingProblem
from models.contracts import AnswerEvaluation, PlannedQuestion
from models.question_data import QuestionExemplar

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "evaluator.md").read_text()


class EvaluatorAgent:
    def __init__(self, llm, model: str, temperature: float = 0.0):
        self._llm = llm
        self._model = model
        self._temperature = temperature

    def run(self, *, question: PlannedQuestion, transcript: str, follow_up_count: int,
            usage_sink: list | None = None,
            exemplar: QuestionExemplar | None = None,
            coding_problem: CodingProblem | None = None,
            code: str = "", test_results: str = "", language: str = "python") -> AnswerEvaluation:
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question:\n{wrap_untrusted('question', question.prompt)}\n\n"  # client-supplied
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', transcript)}\n\n"
            f"Follow-up count: {follow_up_count}\n"
            # Final editor text and test summary come from the browser: fenced.
            + (f"\nFinal code{' (JavaScript)' if language == 'javascript' else ''}:\n{wrap_untrusted('candidate_code', code)}\n" if code else "")
            + (f"\nTest results (reported by the browser):\n{wrap_untrusted('test_results', test_results)}\n"
               if test_results else "")
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
        if coding_problem:
            p = coding_problem  # trusted server data from the problem set: outside the fence
            brief = p.statement.split("\n\n")[0]
            user += (
                "\nRubric anchors for this coding problem (trusted, from the problem set):\n"
                f"- Problem: {p.title}. {brief}\n"
                f"- Target complexity: time {p.target_complexity['time']}, space {p.target_complexity['space']}\n"
                f"- A strong answer covers: {'; '.join(p.ideal_answer_points)}\n"
                f"- Weak-answer signs: {'; '.join(p.weak_answer_signs)}\n"
                + "".join(f"- {k}: {v}\n" for k, v in p.rubric.items())
            )
        evaluation = self._llm.structured(
            agent="evaluator", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=AnswerEvaluation,
            temperature=self._temperature,
        )
        # The model outputs "" (echoing a long thread would eat its output budget); the record keeps the real one.
        return evaluation.model_copy(update={"transcript": transcript})
