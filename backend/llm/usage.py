"""Per-call cost/latency accounting for LLM calls, and a CloudWatch EMF emitter.

The backend runs on Lambda, so a structured JSON line on stdout in Embedded
Metric Format reaches CloudWatch metrics with no new dependency and no new
vendor. Anthropic list pricing (Bedrock may differ slightly) — same caveat
`backend/evals/run_accuracy_eval.py` already carries.
"""

import json
import sys
import time
from dataclasses import dataclass

# $/MTok, matched against a substring of the model id so both the bare
# Anthropic id and the "us.anthropic.<id>:0" Bedrock id resolve.
MODEL_PRICING_PER_MTOK: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-sonnet-4-6": (3.00, 15.00),
}


def price_for_model(model: str) -> tuple[float, float]:
    for key, price in MODEL_PRICING_PER_MTOK.items():
        if key in model:
            return price
    raise ValueError(f"No pricing entry for model {model!r} — add it to MODEL_PRICING_PER_MTOK")


def estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    price_in, price_out = price_for_model(model)
    return (input_tokens / 1_000_000) * price_in + (output_tokens / 1_000_000) * price_out


@dataclass
class CallUsage:
    agent: str
    model: str
    latency_s: float
    attempts: int
    success: bool
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def cost_usd(self) -> float:
        if self.input_tokens == 0 and self.output_tokens == 0:
            return 0.0
        return estimate_cost_usd(self.model, self.input_tokens, self.output_tokens)


def log_call_usage(usage: CallUsage) -> None:
    """Emit one CloudWatch EMF line. Best-effort: a logging failure must never
    break the interview turn that triggered it."""
    try:
        record = {
            "_aws": {
                "Timestamp": int(time.time() * 1000),
                "CloudWatchMetrics": [{
                    "Namespace": "InterviewerAI/LLM",
                    "Dimensions": [["agent", "model"]],
                    "Metrics": [
                        {"Name": "LatencySeconds", "Unit": "Seconds"},
                        {"Name": "InputTokens", "Unit": "Count"},
                        {"Name": "OutputTokens", "Unit": "Count"},
                        {"Name": "CostUsd", "Unit": "None"},
                        {"Name": "Attempts", "Unit": "Count"},
                        {"Name": "Success", "Unit": "Count"},
                    ],
                }],
            },
            "agent": usage.agent,
            "model": usage.model,
            "LatencySeconds": usage.latency_s,
            "InputTokens": usage.input_tokens,
            "OutputTokens": usage.output_tokens,
            "CostUsd": usage.cost_usd,
            "Attempts": usage.attempts,
            "Success": 1 if usage.success else 0,
        }
        print(json.dumps(record), file=sys.stdout)
    except Exception:  # noqa: BLE001 — logging must never break a real turn
        pass
