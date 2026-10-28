import json
import os
from pathlib import Path

import pytest

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import AnswerEvaluation, MemoryProfile
from agents.memory import MemoryAgent

_CASES_FILE = Path(__file__).parent / "golden" / "memory_cases.json"

pytestmark = pytest.mark.skipif(
    os.getenv("INTERVIEWAI_RUN_LLM_EVALS", "0") != "1",
    reason="Set INTERVIEWAI_RUN_LLM_EVALS=1 to run real-LLM evals (costs money).",
)


@pytest.fixture(scope="module")
def agent():
    settings = Settings()
    llm = LLMClient(region=settings.aws_region)
    return MemoryAgent(llm=llm, model=settings.planner_model, temperature=settings.memory_temperature)


@pytest.mark.parametrize("case", json.loads(_CASES_FILE.read_text()))
def test_memory_aggregation(case, agent):
    existing = MemoryProfile.model_validate(case["existing_memory"])
    evals = [AnswerEvaluation.model_validate(e) for e in case["evaluations"]]

    result = agent.run(
        candidate_id=case["candidate_id"],
        session_date=case["session_date"],
        evaluations=evals,
        existing_memory=existing,
    )

    assert result.candidate_id == case["candidate_id"], "candidateId must be preserved"
    assert len(result.improvement_trend) == case["expect_trend_length"], (
        f"[{case['case']}] expected {case['expect_trend_length']} trend points "
        f"but got {len(result.improvement_trend)}"
    )

    top = result.recurring_weaknesses[0] if result.recurring_weaknesses else None
    assert top is not None, f"[{case['case']}] expected recurring weaknesses but got none"
    assert top.tag == case["expect_top_weakness"], (
        f"[{case['case']}] expected top weakness={case['expect_top_weakness']!r} "
        f"but got {top.tag!r}"
    )
    assert top.frequency == case["expect_top_weakness_frequency"], (
        f"[{case['case']}] expected frequency={case['expect_top_weakness_frequency']} "
        f"but got {top.frequency}"
    )
    assert top.last_seen == case["session_date"], "lastSeen must be updated to current session date"
