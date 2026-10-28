from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import InterviewDecision, PlannedQuestion
from models.question_data import QuestionExemplar

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "interviewer.md").read_text()

# Max probing follow-ups per question, by type (system design needs a longer ladder).
FOLLOW_UP_BUDGET = {"behavioral": 3, "technical": 3, "system_design": 6}


class InterviewerAgent:
    def __init__(self, llm, model: str, temperature: float = 0.0):
        self._llm = llm
        self._model = model
        self._temperature = temperature

    def run_turn(
        self,
        *,
        question: PlannedQuestion,
        candidate_answer: str,
        follow_up_count: int,
        is_last_question: bool,
        next_question: PlannedQuestion | None = None,
        phase: str = "question",
        role_context: str = "",
        candidate_name: str = "",
        mode: str = "",
        level: str = "",
        usage_sink: list | None = None,
        exemplar: QuestionExemplar | None = None,
    ) -> InterviewDecision:
        user = (
            f"Phase: {phase}\n"
            # Both come from the client (resume-derived / typed by the user): fenced.
            f"Role context:\n{wrap_untrusted('role_context', role_context)}\n"
            f"Candidate name: {wrap_untrusted('candidate_name', candidate_name[:60])}\n"
            f"Interview mode: {mode}\nLevel: {level}\n\n"
            f"Question ID: {question.id}\n"
            f"Question Type: {question.type}\n"
            f"Difficulty: {question.target_difficulty}\n"
            f"Question: {question.prompt}\n\n"
            # The client sends the whole thread for this question (Q: = interviewer,
            # A: = candidate, latest reply last) — all of it stays inside the fence.
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', candidate_answer)}\n\n"
            f"followUpCount: {follow_up_count}\n"
            f"followUpBudget: {FOLLOW_UP_BUDGET[question.type]}\n"
            f"isLastQuestion: {'true' if is_last_question else 'false'}\n"
            + (f"Next question: {next_question.prompt}\n" if next_question else "")
        )
        if exemplar:
            # Trusted server data from the bank (never from the client): outside the fence.
            user += (
                "\nInterviewer notes (private — never read out, never reveal):\n"
                f"- Tests: {exemplar.signal}\n"
                f"- A strong answer covers: {'; '.join(exemplar.ideal_answer_points)}\n"
                f"- Weak-answer signs: {'; '.join(exemplar.weak_answer_signs)}\n"
                f"- Follow-up ladder (shallow → deep): {' → '.join(exemplar.follow_up_hooks)}\n"
            )
        return self._llm.structured(
            agent="interviewer", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=InterviewDecision,
            temperature=self._temperature,
        )
