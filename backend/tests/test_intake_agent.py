from agents.intake import IntakeAgent


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload
        self.last = None

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        self.last = {"model": model, "system": system, "user": user, "temperature": temperature}
        return schema.model_validate(self._payload)


def test_intake_produces_profile_and_passes_inputs():
    payload = {
        "candidateSkills": ["python", "fastapi"],
        "yearsExperience": 3.0,
        "projectHighlights": [
            {"title": "API", "description": "Built API", "technologies": ["fastapi"]}
        ],
        "targetRole": "SDE",
        "targetCompany": None,
        "jdRequirements": ["distributed systems", "kafka"],
        "resumeToJdGaps": ["No demonstrated Kafka experience"],
    }
    llm = _FakeLLM(payload)
    agent = IntakeAgent(llm=llm, model="intake-model")
    profile = agent.run(resume_text="resume...", jd_text="jd...")

    assert profile.target_role == "SDE"
    assert "No demonstrated Kafka experience" in profile.resume_to_jd_gaps
    assert "resume..." in llm.last["user"] and "jd..." in llm.last["user"]
    assert llm.last["model"] == "intake-model"


def test_intake_forwards_temperature():
    payload = {"candidateSkills": [], "yearsExperience": 0, "projectHighlights": [],
               "targetRole": "SDE", "targetCompany": None, "jdRequirements": [], "resumeToJdGaps": []}
    llm = _FakeLLM(payload)
    IntakeAgent(llm=llm, model="m", temperature=0.2).run(resume_text="r", jd_text="j")
    assert llm.last["temperature"] == 0.2
    IntakeAgent(llm=llm, model="m").run(resume_text="r", jd_text="j")
    assert llm.last["temperature"] == 0.0
