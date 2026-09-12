from pathlib import Path
from agents.untrusted import wrap_untrusted
from models.contracts import IntakeProfile

_PROMPT = (Path(__file__).resolve().parent.parent / "prompts" / "intake.md").read_text()


class IntakeAgent:
    def __init__(self, llm, model: str):
        self._llm = llm
        self._model = model

    def run(self, *, resume_text: str, jd_text: str,
            usage_sink: list | None = None) -> IntakeProfile:
        user = (
            f"RESUME:\n{wrap_untrusted('resume', resume_text)}\n\n"
            f"JOB DESCRIPTION:\n{wrap_untrusted('job_description', jd_text)}"
        )
        return self._llm.structured(
            agent="intake", sink=usage_sink,
            model=self._model, system=_PROMPT, user=user, schema=IntakeProfile,
        )
