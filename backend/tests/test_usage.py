import json

import pytest

from llm.usage import CallUsage, estimate_cost_usd, log_call_usage, price_for_model


def test_price_for_model_matches_by_substring():
    assert price_for_model("us.anthropic.claude-haiku-4-5-20251001-v1:0") == (1.00, 5.00)
    assert price_for_model("us.anthropic.claude-sonnet-4-6") == (3.00, 15.00)


def test_price_for_unknown_model_raises():
    with pytest.raises(ValueError, match="No pricing entry"):
        price_for_model("us.anthropic.claude-opus-9000")


def test_estimate_cost_usd_matches_hand_computed_value():
    # 1000 in @ $3/MTok + 500 out @ $15/MTok = 0.003 + 0.0075
    cost = estimate_cost_usd("claude-sonnet-4-6", 1000, 500)
    assert cost == pytest.approx(0.0105)


def test_call_usage_cost_is_zero_for_a_failed_call_with_no_usage():
    usage = CallUsage(agent="interviewer", model="claude-sonnet-4-6",
                       latency_s=0.4, attempts=3, success=False)
    assert usage.cost_usd == 0.0


def test_call_usage_cost_matches_estimate_for_a_successful_call():
    usage = CallUsage(agent="planner", model="claude-haiku-4-5-20251001-v1:0",
                       latency_s=1.1, attempts=1, success=True,
                       input_tokens=2000, output_tokens=100)
    assert usage.cost_usd == pytest.approx(estimate_cost_usd(usage.model, 2000, 100))


def test_log_call_usage_emits_one_parseable_emf_line(capsys):
    usage = CallUsage(agent="coach", model="claude-sonnet-4-6", latency_s=0.9,
                       attempts=1, success=True, input_tokens=500, output_tokens=200)
    log_call_usage(usage)
    out = capsys.readouterr().out.strip()
    record = json.loads(out)
    assert record["agent"] == "coach"
    assert record["Success"] == 1
    assert record["_aws"]["CloudWatchMetrics"][0]["Namespace"] == "InterviewerAI/LLM"


def test_log_call_usage_never_raises_even_if_serialization_fails(monkeypatch):
    monkeypatch.setattr("llm.usage.json.dumps", lambda *a, **k: (_ for _ in ()).throw(TypeError()))
    usage = CallUsage(agent="memory", model="claude-haiku-4-5", latency_s=0.1,
                       attempts=1, success=True)
    log_call_usage(usage)  # must not raise
