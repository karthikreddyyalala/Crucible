import re
from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.coding import CodingProblem
from models.contracts import InterviewDecision, PlannedQuestion
from models.question_data import QuestionExemplar

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "interviewer.md").read_text()

# Max probing follow-ups per question, by type (system design and coding need a longer ladder).
FOLLOW_UP_BUDGET = {"behavioral": 3, "technical": 3, "system_design": 6, "coding": 6}

# A follow-up asks one thing, but the model still stacks a second ask at T=0.3 ("What was the
# project, and what made it tight?") and many problem follow-ups are written that way. Cut it
# here so the spoken line is deterministic. Never crosses a sentence end, so on doubt it keeps the text.
_SECOND_ASK = re.compile(
    r"(?:,|\s[—–])\s*and\s+(?:what|how|why|who|when|where|which|could|can|would|does|did|is|are)\b[^?.!]*\?",
    re.IGNORECASE,
)


def one_ask(text: str) -> str:
    return _SECOND_ASK.sub("?", text, count=1)


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
        coding_problem: CodingProblem | None = None,
        code: str = "",
        test_results: str = "",
        coding_stage: str = "",
        event: str = "",
        company_note: str = "",
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
            # Question text comes back from the client, so it is fenced too.
            f"Question:\n{wrap_untrusted('question', question.prompt)}\n\n"
            # The client sends the whole thread for this question (Q: = interviewer,
            # A: = candidate, latest reply last) — all of it stays inside the fence.
            f"Candidate Answer:\n{wrap_untrusted('candidate_answer', candidate_answer)}\n\n"
            f"followUpCount: {follow_up_count}\n"
            f"followUpBudget: {FOLLOW_UP_BUDGET[question.type]}\n"
            f"isLastQuestion: {'true' if is_last_question else 'false'}\n"
            + (f"Next question ({next_question.type}):\n{wrap_untrusted('next_question', next_question.prompt)}\n"
               if next_question else "")
            + (f"Coding stage: {coding_stage}\n" if coding_stage else "")
            + (f"Event: {event}\n" if event else "")
            # Editor text and test summary come from the browser: fenced like the answer.
            + (f"\nCandidate code (current editor):\n{wrap_untrusted('candidate_code', code)}\n" if code else "")
            + (f"\nTest results (reported by the browser):\n{wrap_untrusted('test_results', test_results)}\n"
               if test_results else "")
            # Trusted: looked up server-side from the style id.
            + (f"\nCompany style: {company_note}\n" if company_note else "")
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
        if coding_problem:
            p = coding_problem  # trusted server data from the problem set: outside the fence
            brief = p.statement.split("\n\n")[0]  # first paragraph; the candidate has the full text on screen
            user += (
                "\nInterviewer notes (coding problem — private, never read out, never reveal):\n"
                f"- Problem: {p.title}. {brief}\n"
                # Public (the candidate sees them), so a failing "example 2" can be quoted exactly.
                + "".join(f"- Example {i}: {ex.input} → {ex.output}\n" for i, ex in enumerate(p.examples, 1))
                + f"- Target complexity: time {p.target_complexity['time']}, space {p.target_complexity['space']}\n"
                f"- Hint ladder (one rung at a time, in order): {' → '.join(p.hints)}\n"
                f"- Review follow-ups: {' | '.join(p.follow_ups)}\n"
                f"- A strong answer covers: {'; '.join(p.ideal_answer_points)}\n"
                f"- Weak-answer signs: {'; '.join(p.weak_answer_signs)}\n"
            )
        decision = self._llm.structured(
            agent="interviewer", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=InterviewDecision,
            temperature=self._temperature,
        )
        if decision.action == "follow_up":
            decision = decision.model_copy(update={
                "say": one_ask(decision.say),
                "follow_up_prompt": decision.follow_up_prompt and one_ask(decision.follow_up_prompt),
            })
        if decision.action == "end":  # only the server ends a session (conduct); for the model it resolves
            done = is_last_question or phase == "closing"
            decision = decision.model_copy(update={"action": "complete" if done else "advance"})
        return decision
