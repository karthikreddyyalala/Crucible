import re
import sys
from pathlib import Path

from agents.untrusted import wrap_untrusted
from models.contracts import FactCheck, FalseClaim

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "fact_check.md").read_text()

# Question types where a plain factual error is possible; behavioral stories are not fact-checked.
CHECKED_TYPES = {"technical", "system_design", "coding"}


def latest_reply(thread: str) -> str:
    """The candidate's newest reply in a "Q: ... / A: ..." thread (the whole text if unlabelled)."""
    parts = re.split(r"(?:^|\n)A:\s*", thread)
    return parts[-1].split("\nQ:")[0].strip() if len(parts) > 1 else thread.strip()


def candidate_lines(thread: str) -> str:
    """Only what the candidate said (the A: lines), so the check never judges the interviewer."""
    lines = re.findall(r"(?:^|\n)A:\s*(.*?)(?=\nQ:|\Z)", thread, re.DOTALL)
    return "\n".join(line.strip() for line in lines) if lines else thread.strip()


class FactCheckAgent:
    """Lists plainly false technical claims in the candidate's words. Advisory only: a failure
    returns no claims, so it can never break or delay a live turn beyond its one call."""

    def __init__(self, llm, model: str, temperature: float = 0.0):
        self._llm = llm
        self._model = model
        self._temperature = temperature

    def run(self, *, question: str, answer: str, usage_sink: list | None = None) -> list[FalseClaim]:
        if not answer.strip():
            return []
        user = f"Question:\n{wrap_untrusted('question', question)}\n\nCandidate said:\n{wrap_untrusted('candidate_answer', answer)}"
        try:
            result = self._llm.structured(
                agent="fact_check", sink=usage_sink, model=self._model, system=_PROMPT, user=user,
                schema=FactCheck, max_tokens=600, max_retries=0, temperature=self._temperature,
            )
        except Exception as e:  # advisory: the interview goes on without it
            print(f"fact_check skipped: {type(e).__name__}", file=sys.stderr)
            return []
        return result.false_claims


def format_claims(claims: list[FalseClaim]) -> str:
    """Claims quote the candidate, so the block is fenced like their answer."""
    body = "\n".join(f"- They said: {c.claim}\n  Fact: {c.correction}" for c in claims)
    return wrap_untrusted("fact_check", body)
