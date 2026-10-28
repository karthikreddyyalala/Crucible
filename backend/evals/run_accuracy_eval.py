"""Runnable accuracy eval for the Interviewer + Evaluator agents.

Measures decision accuracy against backend/evals/golden/interview_turn_cases.json
by calling the real InterviewerAgent and EvaluatorAgent (real Bedrock calls, real
prompts) rather than reimplementing the call. Writes a JSON report per variant to
backend/evals/results/interview_turn_<variant>.json.

Usage:
    python -m evals.run_accuracy_eval [variant_label] [cases_file] [--repeat N]

--repeat N runs every case N times and reports how often the N runs agree on the
action and on the survival verdict. Accuracy metrics use the first run only, so
they stay comparable with single-run results.

Costs real money (Bedrock Sonnet calls) — run deliberately, not in CI.
"""

import argparse
import inspect
import json
import re
import time
from pathlib import Path
from statistics import mean

from anthropic import AnthropicBedrock

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import PlannedQuestion
from models.coding import find_problem
from models.loader import find_exemplar
from agents.interviewer import InterviewerAgent
from agents.evaluator import EvaluatorAgent

CASES_FILE = Path(__file__).parent / "golden" / "interview_turn_cases.json"

# Real interviewers keep a neutral face; the verdict belongs to the Evaluator.
# Any of these in a spoken line is a judgment leaking out loud.
JUDGMENT = re.compile(
    r"\b(great|good|nice|solid|strong|perfect|excellent|awesome|impressive|exactly right|that's exactly"
    r"|reasonable|fair point|that's right|that's wrong|pretty thin|what i was looking for)\b",
    re.IGNORECASE,
)


# Two asks in one turn ("What went wrong, and what would you do differently?").
STACKED = re.compile(r"\?.*\?|,\s*and\s+(what|how|why|who|when|where|which)\b", re.IGNORECASE)


def stacked_ask(say: str) -> bool:
    # "...? Like, what's actually happening?" restates one question the way people talk.
    return bool(STACKED.search(say.replace("? Like,", ", like").replace("? Like ", ", like ")))


def judgment_leak(say: str) -> str | None:
    m = JUDGMENT.search(say)
    return m.group(0) if m else None


def load_cases(cases_file: Path) -> list[dict]:
    """Golden cases; optional `exemplar_id` makes the case run on the bank path
    (and is stamped onto the question), optional `expect_probe_targets` lists
    lowercase keywords the follow-up should be about. A coding case carries
    `problem_id` (stamped onto the question the way session start does) plus
    optional `code`, `test_results`, `coding_stage` and `event`."""
    cases = json.loads(cases_file.read_text())
    for c in cases:
        if c.get("exemplar_id"):
            c["question"] = {**c["question"], "exemplarId": c["exemplar_id"]}
        if c.get("problem_id"):
            if find_problem(c["problem_id"]) is None:
                raise ValueError(f"{c['case']}: unknown problem_id {c['problem_id']!r}")
            c["question"] = {**c["question"], "exemplarId": c["problem_id"]}
    return cases


def say_check(say: str, contains_any: list[str] | None, excludes: list[str] | None) -> bool | None:
    """None when the case has no say checks; else at least one `contains_any` phrase is
    present (case-insensitive) and no `excludes` phrase is."""
    if not contains_any and not excludes:
        return None
    low = say.lower()
    return ((not contains_any or any(k.lower() in low for k in contains_any))
            and not any(k.lower() in low for k in excludes or []))


RESULTS_DIR = Path(__file__).parent / "results"

# Anthropic list pricing for claude-sonnet-4-6 ($/MTok). Bedrock pricing may
# differ slightly; this is an estimate, not a billed figure.
PRICE_IN_PER_MTOK = 3.00
PRICE_OUT_PER_MTOK = 15.00


class _TrackedMessages:
    def __init__(self, real_messages, usage_log: list[dict]):
        self._real = real_messages
        self._usage_log = usage_log

    def create(self, **kwargs):
        # anthropic SDK >= 1.x dropped `temperature` from messages.create; Bedrock still takes it in the body.
        if "temperature" in kwargs and "temperature" not in inspect.signature(self._real.create).parameters:
            kwargs["extra_body"] = {**kwargs.get("extra_body", {}), "temperature": kwargs.pop("temperature")}
        response = self._real.create(**kwargs)
        self._usage_log.append({
            "model": kwargs.get("model"),
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        })
        return response


class _TrackedClient:
    def __init__(self, real_client, usage_log: list[dict]):
        self.messages = _TrackedMessages(real_client.messages, usage_log)


def agreement(runs: list[list[str]]) -> float:
    """Share of cases (one inner list of per-run values each) whose runs all match."""
    if not runs:
        return 1.0
    return sum(len(set(r)) == 1 for r in runs) / len(runs)


def _run_case(case: dict, interviewer: InterviewerAgent, evaluator: EvaluatorAgent) -> dict:
    """One interviewer turn (+ evaluator verdict when the case is labelled) -> a result row."""
    question = PlannedQuestion.model_validate(case["question"])
    exemplar = find_exemplar(case.get("exemplar_id"))
    problem = find_problem(case.get("problem_id"))
    work = {"code": case.get("code", ""), "test_results": case.get("test_results", "")}

    t0 = time.monotonic()
    decision = interviewer.run_turn(
        question=question,
        candidate_answer=case["candidate_answer"],
        follow_up_count=case["follow_up_count"],
        is_last_question=case["is_last_question"],
        exemplar=exemplar,
        coding_problem=problem,
        coding_stage=case.get("coding_stage", ""),
        event=case.get("event", ""),
        **work,
    )
    interviewer_latency = time.monotonic() - t0
    expected = case["expect_action"]  # a string, or a list of acceptable actions
    action_match = decision.action in (expected if isinstance(expected, list) else [expected])

    would_survive_actual = None
    would_survive_match = None
    survival_reasoning = None
    evaluator_latency = None
    if case["expect_would_survive"] is not None:
        t1 = time.monotonic()
        evaluation = evaluator.run(
            question=question,
            transcript=case["candidate_answer"],
            follow_up_count=case["follow_up_count"],
            exemplar=exemplar,
            coding_problem=problem,
            **work,
        )
        evaluator_latency = time.monotonic() - t1
        would_survive_actual = evaluation.would_survive_real_interview
        survival_reasoning = evaluation.survival_reasoning
        would_survive_match = would_survive_actual == case["expect_would_survive"]

    targets = case.get("expect_probe_targets")
    probe_on_target = any(k in decision.say.lower() for k in targets) if targets else None

    return {
        "case": case["case"],
        "type": case["question"]["type"],
        "exemplar_id": case.get("exemplar_id"),
        "probe_on_target": probe_on_target,
        "expected_action": case["expect_action"],
        "actual_action": decision.action,
        "action_match": action_match,
        "expected_would_survive": case["expect_would_survive"],
        "actual_would_survive": would_survive_actual,
        "would_survive_match": would_survive_match,
        "survival_reasoning": survival_reasoning,
        "say": decision.say,
        "say_check": say_check(decision.say, case.get("expect_say_contains_any"), case.get("expect_say_excludes")),
        "judgment_leak": judgment_leak(decision.say),
        "stacked_ask": decision.action == "follow_up" and stacked_ask(decision.say),
        "interviewer_latency_s": round(interviewer_latency, 2),
        "evaluator_latency_s": round(evaluator_latency, 2) if evaluator_latency is not None else None,
    }


def _print_row(case: dict, row: dict) -> None:
    ok = row["action_match"] and row["would_survive_match"] is not False and row["say_check"] is not False
    detail = f"action={row['actual_action']} (expected {case['expect_action']})"
    if row["would_survive_match"] is not None:
        detail += f", survive={row['actual_would_survive']} (expected {case['expect_would_survive']})"
    if row["say_check"] is False:
        detail += f", SAY CHECK failed on: {row['say']}"
    if row["stacked_ask"]:
        detail += f", STACKED ASK in: {row['say']}"
    if row["judgment_leak"]:
        detail += f", JUDGMENT '{row['judgment_leak']}' in: {row['say']}"
    print(f"  {'PASS' if ok else 'FAIL'}  {case['case']}: {detail}")


def main(variant_label: str = "baseline", cases_file: Path = CASES_FILE, repeat: int = 1) -> dict:
    if repeat < 1:
        raise ValueError("repeat must be >= 1")
    settings = Settings()
    usage_log: list[dict] = []
    real_client = AnthropicBedrock(aws_region=settings.aws_region)
    llm = LLMClient(client=_TrackedClient(real_client, usage_log), region=settings.aws_region)

    interviewer = InterviewerAgent(
        llm=llm, model=settings.interviewer_model, temperature=settings.interviewer_temperature)
    evaluator = EvaluatorAgent(
        llm=llm, model=settings.evaluator_model, temperature=settings.evaluator_temperature)

    cases = load_cases(cases_file)

    print(f"Running {len(cases)} cases x{repeat} against interviewer_model={settings.interviewer_model} "
          f"(T={settings.interviewer_temperature}) evaluator_model={settings.evaluator_model} "
          f"(T={settings.evaluator_temperature}) region={settings.aws_region}\n")

    # The first run is the one scored and printed (so accuracy stays comparable across
    # --repeat values); later runs only feed the agreement figures.
    results = []
    for case in cases:
        row = _run_case(case, interviewer, evaluator)
        _print_row(case, row)
        row["actions"] = [row["actual_action"]]
        row["says"] = [row["say"]]
        row["survival_verdicts"] = [] if row["actual_would_survive"] is None else [row["actual_would_survive"]]
        results.append(row)
    for n in range(2, repeat + 1):
        print(f"\nRepeat run {n}/{repeat}...")
        for case, row in zip(cases, results):
            again = _run_case(case, interviewer, evaluator)
            row["actions"].append(again["actual_action"])
            row["says"].append(again["say"])
            if again["actual_would_survive"] is not None:
                row["survival_verdicts"].append(again["actual_would_survive"])

    decision_agreement = agreement([r["actions"] for r in results])
    survival_agreement = agreement(
        [[str(v) for v in r["survival_verdicts"]] for r in results if r["expected_would_survive"] is not None]
    )

    action_accuracy = mean(1.0 if r["action_match"] else 0.0 for r in results)
    survive_cases = [r for r in results if r["would_survive_match"] is not None]
    survive_accuracy = (
        mean(1.0 if r["would_survive_match"] else 0.0 for r in survive_cases)
        if survive_cases else None
    )

    say_cases = [r for r in results if r["say_check"] is not None]

    total_input = sum(u["input_tokens"] for u in usage_log)
    total_output = sum(u["output_tokens"] for u in usage_log)
    estimated_cost = (total_input / 1_000_000) * PRICE_IN_PER_MTOK + (
        total_output / 1_000_000
    ) * PRICE_OUT_PER_MTOK

    summary = {
        "variant": variant_label,
        "case_count": len(results),
        "repeat": repeat,
        "decision_agreement": round(decision_agreement, 4),
        "survival_agreement": round(survival_agreement, 4) if survive_cases else None,
        "action_accuracy": round(action_accuracy, 4),
        "action_correct": sum(1 for r in results if r["action_match"]),
        "survive_accuracy": round(survive_accuracy, 4) if survive_accuracy is not None else None,
        "survive_correct": sum(1 for r in survive_cases if r["would_survive_match"]),
        "survive_case_count": len(survive_cases),
        "stacked_ask_rate": round(mean(1.0 if r["stacked_ask"] else 0.0 for r in results), 4),
        "judgment_leak_rate": round(mean(1.0 if r["judgment_leak"] else 0.0 for r in results), 4),
        "say_check_pass_rate": (
            round(mean(1.0 if r["say_check"] else 0.0 for r in say_cases), 4) if say_cases else None),
        "say_check_case_count": len(say_cases),
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "estimated_cost_usd": round(estimated_cost, 4),
        "results": results,
    }

    RESULTS_DIR.mkdir(exist_ok=True)
    out_file = RESULTS_DIR / f"interview_turn_{variant_label}.json"
    out_file.write_text(json.dumps(summary, indent=2))

    print()
    print(f"Interviewer action accuracy: {action_accuracy:.1%} "
          f"({summary['action_correct']}/{summary['case_count']})")
    if survive_accuracy is not None:
        print(f"Evaluator wouldSurviveRealInterview accuracy: {survive_accuracy:.1%} "
              f"({summary['survive_correct']}/{summary['survive_case_count']})")
    if repeat > 1:
        print(f"Decision agreement across {repeat} runs: {decision_agreement:.1%}")
        if survive_cases:
            print(f"Survival agreement across {repeat} runs: {survival_agreement:.1%}")
    print(f"Bank-backed cases: {sum(1 for r in results if r['exemplar_id'])}")
    probe_cases = [r for r in results if r["probe_on_target"] is not None]
    if probe_cases:
        print(f"Follow-ups aimed at the missing strong point: "
              f"{sum(1 for r in probe_cases if r['probe_on_target'])}/{len(probe_cases)}")
    if say_cases:
        print(f"Say checks passed: {sum(1 for r in say_cases if r['say_check'])}/{len(say_cases)}")
    print(f"Stacked two-question follow-ups: {summary['stacked_ask_rate']:.1%} of lines")
    print(f"Spoken judgment leaks: {summary['judgment_leak_rate']:.1%} of lines")
    print(f"Tokens: {total_input} in / {total_output} out — est. cost ${estimated_cost:.4f}")
    print(f"Results written to {out_file}")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Interviewer + Evaluator accuracy eval (real Bedrock calls).")
    parser.add_argument("label", nargs="?", default="baseline")
    parser.add_argument("cases_file", nargs="?", type=Path, default=CASES_FILE)
    parser.add_argument("--repeat", type=int, default=1, help="run every case N times and report agreement")
    args = parser.parse_args()
    main(args.label, args.cases_file, args.repeat)
