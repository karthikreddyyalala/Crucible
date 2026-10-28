from evals.run_accuracy_eval import agreement


def test_all_runs_identical_is_full_agreement():
    assert agreement([["a", "a", "a"], ["b", "b", "b"]]) == 1.0


def test_one_flipped_case_halves_agreement():
    assert agreement([["a", "a", "a"], ["b", "a", "b"]]) == 0.5


def test_single_run_agrees_with_itself():
    assert agreement([["a"], ["b"]]) == 1.0


def test_no_cases_is_vacuously_full_agreement():
    assert agreement([]) == 1.0


def test_main_repeat_reports_agreement_and_scores_first_run(monkeypatch, tmp_path):
    import json
    from types import SimpleNamespace
    from evals import run_accuracy_eval as ev

    q = {"id": "q", "type": "behavioral", "prompt": "p", "targetDifficulty": 3, "weightedFromWeakness": False}
    base = {"question": q, "candidate_answer": "a", "follow_up_count": 0, "is_last_question": False,
            "expect_action": "advance"}
    cases = tmp_path / "cases.json"
    cases.write_text(json.dumps([
        {**base, "case": "flaky", "expect_would_survive": True},
        {**base, "case": "stable", "expect_would_survive": None},
    ]))
    flaky_actions = iter(["advance", "follow_up", "advance"])

    class _FlakyInterviewer:
        calls = 0

        def __init__(self, **kw): pass

        def run_turn(self, **kw):
            _FlakyInterviewer.calls += 1
            # per run the cases go flaky, stable: the flaky one is every odd call
            if _FlakyInterviewer.calls % 2 == 1:
                return SimpleNamespace(action=next(flaky_actions), say="ok")
            return SimpleNamespace(action="advance", say="ok")

    class _Evaluator:
        def __init__(self, **kw): pass
        def run(self, **kw):
            return SimpleNamespace(would_survive_real_interview=True, survival_reasoning="r")

    monkeypatch.setattr(ev, "AnthropicBedrock", lambda **kw: SimpleNamespace(messages=None))
    monkeypatch.setattr(ev, "InterviewerAgent", _FlakyInterviewer)
    monkeypatch.setattr(ev, "EvaluatorAgent", _Evaluator)
    monkeypatch.setattr(ev, "RESULTS_DIR", tmp_path)

    summary = ev.main("t", cases, repeat=3)

    assert summary["repeat"] == 3
    assert summary["decision_agreement"] == 0.5
    assert summary["survival_agreement"] == 1.0
    assert summary["action_accuracy"] == 1.0  # first run only: both cases advanced
    assert summary["results"][0]["actions"] == ["advance", "follow_up", "advance"]
