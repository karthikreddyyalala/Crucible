import json
import os
import uuid
from pathlib import Path

import pytest

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import MemoryProfile
from graph.session_start import build_session_start_graph

_GOLDEN = Path(__file__).parent / "golden"

pytestmark = pytest.mark.skipif(
    os.getenv("INTERVIEWAI_RUN_LLM_EVALS", "0") != "1",
    reason="Set INTERVIEWAI_RUN_LLM_EVALS=1 to run real-LLM evals (costs money).",
)


@pytest.mark.parametrize("case_file", list(_GOLDEN.glob("*.json")))
def test_session_start_quality(case_file):
    case = json.loads(case_file.read_text())
    settings = Settings()
    llm = LLMClient(region=settings.aws_region)
    graph = build_session_start_graph(
        llm=llm, intake_model=settings.intake_model, planner_model=settings.planner_model,
        intake_temperature=settings.intake_temperature, planner_temperature=settings.planner_temperature,
    )
    result = graph.invoke({
        "session_id": str(uuid.uuid4()),
        "resume_text": case["resume_text"],
        "jd_text": case["jd_text"],
        "role_key": case["role_key"],
        "memory": MemoryProfile(candidateId="eval", recurringWeaknesses=[],
                                improvementTrend=[], strongAreas=[]),
    })

    gaps_joined = " ".join(result["profile"].resume_to_jd_gaps).lower()
    for needle in case["expect_gap_substrings"]:
        assert needle in gaps_joined, f"expected gap '{needle}' missing: {gaps_joined}"

    assert len(result["plan"].questions) >= case["expect_min_questions"]
    for q in result["plan"].questions:
        assert 1 <= q.target_difficulty <= 5
