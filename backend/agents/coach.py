from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.coding import CodingProblem
from models.contracts import CoachResponse, PlannedQuestion

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "coach.md").read_text()


class CoachAgent:
    """Reworks the candidate's own attempt into a model 5/5 answer, on demand."""

    def __init__(self, llm, model: str, temperature: float = 0.0):
        self._llm = llm
        self._model = model
        self._temperature = temperature

    def run(
        self,
        *,
        question: PlannedQuestion,
        transcript: str,
        weakness_tags: list[str],
        usage_sink: list | None = None,
        coding_problem: CodingProblem | None = None,
        code: str = "",
        language: str = "python",
    ) -> CoachResponse:
        tags = ", ".join(weakness_tags) if weakness_tags else "(none flagged)"
        user = (
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question:\n{wrap_untrusted('question', question.prompt)}\n\n"  # client-supplied
            f"Candidate Answer (their attempt):\n{wrap_untrusted('candidate_answer', transcript)}\n\n"
            f"Weakness tags to fix: {tags}"
            + (f"\n\nCandidate's language: {'JavaScript' if language == 'javascript' else 'Python'}"
               if question.type == "coding" else "")
            + (f"\n\nCandidate's final code:\n{wrap_untrusted('candidate_code', code)}" if code else "")
        )
        if coding_problem:
            p = coding_problem  # trusted server data (the interview is over, so the solution may be shown)
            brief = p.statement.split("\n\n")[0]
            user += (
                "\n\nCoding problem (trusted, from the problem set):\n"
                f"- {p.title}: {brief}\n"
                f"- Signature: {p.signature}\n"
                f"- Target complexity: time {p.target_complexity['time']}, space {p.target_complexity['space']}\n"
                f"- A strong answer covers: {'; '.join(p.ideal_answer_points)}\n"
                f"- Reference solution (check your code against it; write your own clean version):\n"
                f"{p.reference_solution}"
            )
        response = self._llm.structured(
            agent="coach", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=CoachResponse,
            temperature=self._temperature,
        )
        # Solution code only alongside the problem (which the route passes only after finalize).
        return response if coding_problem else response.model_copy(update={"code": ""})
