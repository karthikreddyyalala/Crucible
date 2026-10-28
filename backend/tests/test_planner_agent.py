from agents.planner import PlannerAgent
from models.contracts import IntakeProfile, MemoryProfile, RecurringWeakness
from models.loader import bank_for, load_competency_map


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload
        self.last = None

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None, temperature=0.0):
        self.last = {"user": user, "model": model, "temperature": temperature}
        return schema.model_validate(self._payload)


def _profile():
    return IntakeProfile(
        candidateSkills=["python"], yearsExperience=3.0, projectHighlights=[],
        targetRole="SDE", jdRequirements=["kafka"], resumeToJdGaps=["no kafka"],
    )


def test_planner_returns_plan_with_session_id():
    payload = {
        "sessionId": "sess-1",
        "questions": [
            {"id": "q1", "type": "technical", "prompt": "Explain kafka partitions",
             "targetDifficulty": 4, "weightedFromWeakness": True},
        ],
    }
    llm = _FakeLLM(payload)
    agent = PlannerAgent(llm=llm, model="planner-model")
    mem = MemoryProfile(
        candidateId="c1",
        recurringWeaknesses=[RecurringWeakness(tag="vague-impact", frequency=3, lastSeen="2026-06-01")],
        improvementTrend=[], strongAreas=[],
    )
    plan = agent.run(
        session_id="sess-1", profile=_profile(), memory=mem,
        competency_map=load_competency_map("sde"),
    )
    assert plan.session_id == "sess-1"
    assert plan.questions[0].weighted_from_weakness is True
    assert "vague-impact" in llm.last["user"]


def test_planner_forwards_mode_and_level():
    payload = {
        "sessionId": "s",
        "questions": [
            {"id": "q1", "type": "technical", "prompt": "p",
             "targetDifficulty": 5, "weightedFromWeakness": False},
        ],
    }
    llm = _FakeLLM(payload)
    agent = PlannerAgent(llm=llm, model="planner-model")
    mem = MemoryProfile(candidateId="c1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[])
    agent.run(
        session_id="s", profile=_profile(), memory=mem,
        competency_map=load_competency_map("sde"),
        mode="technical", level="senior",
    )
    assert "mode: technical" in llm.last["user"]
    assert "level: senior" in llm.last["user"]


def test_planner_receives_bank_candidates_as_input():
    llm = _FakeLLM({"sessionId": "s", "questions": [
        {"id": "q1", "type": "behavioral", "prompt": "p",
         "targetDifficulty": 1, "weightedFromWeakness": False}]})
    mem = MemoryProfile(candidateId="c1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[])
    PlannerAgent(llm=llm, model="m").run(
        session_id="s", profile=_profile(), memory=mem,
        competency_map=load_competency_map("sde"), mode="behavioral", level="junior",
        bank=bank_for("sde", mode="behavioral", level="junior"))
    assert "QuestionBank" in llm.last["user"]
    assert "sde-beh-" in llm.last["user"]
    assert '"asked":' in llm.last["user"]
    assert "followUpHooks" not in llm.last["user"] and "follow_up_hooks" not in llm.last["user"]
    for hidden in ("rubric", "idealAnswerPoints", "ideal_answer_points", "weakAnswerSigns", "weak_answer_signs"):
        assert hidden not in llm.last["user"]


def test_planner_forwards_temperature():
    llm = _FakeLLM({"sessionId": "s", "questions": [
        {"id": "q1", "type": "behavioral", "prompt": "p",
         "targetDifficulty": 1, "weightedFromWeakness": False}]})
    mem = MemoryProfile(candidateId="c1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[])
    kw = dict(session_id="s", profile=_profile(), memory=mem, competency_map=load_competency_map("sde"))
    PlannerAgent(llm=llm, model="m", temperature=0.2).run(**kw)
    assert llm.last["temperature"] == 0.2
    PlannerAgent(llm=llm, model="m").run(**kw)
    assert llm.last["temperature"] == 0.0


def _run_planner(**kw):
    llm = _FakeLLM({"sessionId": "s", "questions": [
        {"id": "q1", "type": "coding", "prompt": "Let's do a coding problem: find two numbers that add up to a target.",
         "targetDifficulty": 2, "weightedFromWeakness": False, "exemplarId": "code-two-sum"}]})
    mem = MemoryProfile(candidateId="c1", recurringWeaknesses=[], improvementTrend=[], strongAreas=[])
    PlannerAgent(llm=llm, model="m").run(
        session_id="s", profile=_profile(), memory=mem, competency_map=load_competency_map("sde"),
        mode="coding", level="junior", **kw)
    return llm.last["user"]


def test_planner_receives_coding_problems_without_private_fields():
    import json
    from models.coding import problems_for
    problems = problems_for({"easy"})
    user = _run_planner(coding_problems=problems)
    header = "CodingProblems (choose from these for coding questions):\n"
    assert header in user
    listed = json.loads(user.split(header, 1)[1].split("\n\n")[0])
    assert [p["id"] for p in listed] == [p.id for p in problems]
    assert all(set(p) == {"id", "title", "difficulty", "topics", "asked"} for p in listed)
    assert problems[0].statement not in user and problems[0].reference_solution not in user
    assert "CodingProblems" not in _run_planner()


def test_planner_receives_company_style_guidance():
    from models.company_style import find_style
    style = find_style("amazon")
    user = _run_planner(company_style=style)
    assert style.name in user
    assert "weight question choice toward these themes" in user
    for theme in style.behavioral_themes:
        assert theme in user
    for kind, weight in dict(style.question_mix).items():
        assert f"{kind} {weight}" in user
    assert style.interviewer_note not in user  # that one is for Marcus, not the Planner


def test_planner_prompt_describes_coding_shapes_and_company_style():
    from agents.planner import _PROMPT
    assert '"coding"' in _PROMPT and "CodingProblems" in _PROMPT and "CompanyStyle" in _PROMPT
    full = _PROMPT.split('- "full":', 1)[1].split("\n- ", 1)[0]
    assert "1 behavioral" in full and "1 coding" in full and "1 technical" in full and "1 system_design" in full
    coding = _PROMPT.split('- "coding":', 1)[1].split("\n## ", 1)[0]
    for shape in ("2 easy", "1 easy + 1 medium", "1 medium + 1 hard", "2 medium"):
        assert shape in coding


def test_planner_prompt_only_writes_non_coding_questions_itself():
    from agents.planner import _PROMPT
    assert "write all non-coding questions yourself" in _PROMPT
    assert "write all questions yourself" not in _PROMPT
