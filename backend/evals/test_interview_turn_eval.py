import json
import os
from pathlib import Path

import pytest

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import PlannedQuestion
from agents.interviewer import InterviewerAgent
from agents.evaluator import EvaluatorAgent

_CASES_FILE = Path(__file__).parent / "golden" / "interview_turn_cases.json"

pytestmark = pytest.mark.skipif(
    os.getenv("INTERVIEWAI_RUN_LLM_EVALS", "0") != "1",
    reason="Set INTERVIEWAI_RUN_LLM_EVALS=1 to run real-LLM evals (costs money).",
)


@pytest.fixture(scope="module")
def agents():
    settings = Settings()
    llm = LLMClient(region=settings.aws_region)
    return {
        "interviewer": InterviewerAgent(llm=llm, model=settings.planner_model, temperature=settings.interviewer_temperature),
        "evaluator": EvaluatorAgent(llm=llm, model=settings.planner_model, temperature=settings.evaluator_temperature),
    }


@pytest.mark.parametrize("case", json.loads(_CASES_FILE.read_text()))
def test_interview_turn_behavior(case, agents):
    question = PlannedQuestion.model_validate(case["question"])
    interviewer: InterviewerAgent = agents["interviewer"]
    evaluator: EvaluatorAgent = agents["evaluator"]

    decision = interviewer.run_turn(
        question=question,
        candidate_answer=case["candidate_answer"],
        follow_up_count=case["follow_up_count"],
        is_last_question=case["is_last_question"],
    )

    assert decision.action == case["expect_action"], (
        f"[{case['case']}] expected action={case['expect_action']!r} "
        f"but got {decision.action!r}. "
        f"follow_up_prompt={decision.follow_up_prompt!r}"
    )

    if decision.action == "follow_up":
        assert decision.follow_up_prompt, f"[{case['case']}] follow_up_prompt must be non-empty"
        assert len(decision.follow_up_prompt) > 10, "follow_up_prompt too short to be meaningful"

    if case["expect_would_survive"] is not None:
        evaluation = evaluator.run(
            question=question,
            transcript=case["candidate_answer"],
            follow_up_count=case["follow_up_count"],
        )
        assert evaluation.would_survive_real_interview == case["expect_would_survive"], (
            f"[{case['case']}] wouldSurviveRealInterview expected "
            f"{case['expect_would_survive']} but got {evaluation.would_survive_real_interview}. "
            f"Reasoning: {evaluation.survival_reasoning}"
        )
        assert evaluation.survival_reasoning, "survivalReasoning must not be empty"
