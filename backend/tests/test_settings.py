from config.settings import Settings


def test_defaults_present():
    s = Settings()
    assert s.intake_model
    assert s.planner_model
    assert s.interviewer_model
    assert s.evaluator_model
    assert s.memory_model
    assert s.aws_region == "us-west-2"
    # cost guard: Opus must not be a default on any agent
    assert not any(
        "opus" in m
        for m in (
            s.intake_model,
            s.planner_model,
            s.interviewer_model,
            s.evaluator_model,
            s.memory_model,
        )
    )


def test_env_override(monkeypatch):
    monkeypatch.setenv("INTERVIEWAI_PLANNER_MODEL", "custom-model-id")
    s = Settings()
    assert s.planner_model == "custom-model-id"


def test_temperature_defaults():
    s = Settings()
    assert s.interviewer_temperature == 0.3
    assert (s.intake_temperature, s.planner_temperature, s.evaluator_temperature,
            s.memory_temperature, s.coach_temperature) == (0.0, 0.0, 0.0, 0.0, 0.0)


def test_temperature_env_override(monkeypatch):
    monkeypatch.setenv("INTERVIEWAI_INTERVIEWER_TEMPERATURE", "0.7")
    assert Settings().interviewer_temperature == 0.7
