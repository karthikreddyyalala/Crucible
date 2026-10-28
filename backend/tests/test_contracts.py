from models.contracts import (
    IntakeProfile, ProjectHighlight, QuestionPlan, PlannedQuestion,
    AnswerEvaluation, MemoryProfile, InterviewDecision,
)


def test_intake_profile_camelcase_roundtrip():
    payload = {
        "candidateSkills": ["python", "aws"],
        "yearsExperience": 4.5,
        "projectHighlights": [
            {"title": "Billing", "description": "Rewrote billing", "technologies": ["python"]}
        ],
        "targetRole": "SDE",
        "jdRequirements": ["distributed systems"],
        "resumeToJdGaps": ["no kafka experience"],
    }
    profile = IntakeProfile.model_validate(payload)
    assert profile.years_experience == 4.5
    assert profile.project_highlights[0].title == "Billing"
    assert profile.model_dump(by_alias=True)["candidateSkills"] == ["python", "aws"]


def test_planned_question_difficulty_bounds():
    q = PlannedQuestion(
        id="q1", type="technical", prompt="Explain a deadlock",
        targetDifficulty=3, weightedFromWeakness=False,
    )
    assert q.target_difficulty == 3


def test_answer_evaluation_requires_survival_fields():
    ev = AnswerEvaluation(
        questionId="q1", transcript="...", rubricScores={"depth": 2},
        weaknessTags=["vague-impact"], followUpCount=1,
        wouldSurviveRealInterview=False, survivalReasoning="No concrete metrics given.",
    )
    assert ev.would_survive_real_interview is False
    assert ev.survival_reasoning


def test_interview_decision_follow_up():
    d = InterviewDecision(
        action="follow_up",
        followUpPrompt="You said you optimized the query — what was the before/after latency?",
        currentQuestionId="q1",
    )
    assert d.action == "follow_up"
    assert d.follow_up_prompt is not None
    assert d.current_question_id == "q1"


def test_interview_decision_advance_has_no_prompt():
    d = InterviewDecision(
        action="advance",
        followUpPrompt=None,
        currentQuestionId="q2",
    )
    assert d.action == "advance"
    assert d.follow_up_prompt is None


def test_planned_question_carries_optional_exemplar_id():
    base = {"id": "q0", "type": "behavioral", "prompt": "p", "targetDifficulty": 3,
            "weightedFromWeakness": False}
    assert PlannedQuestion.model_validate(base).exemplar_id is None
    q = PlannedQuestion.model_validate({**base, "exemplarId": "sde-beh-ownership-1"})
    assert q.model_dump(by_alias=True)["exemplarId"] == "sde-beh-ownership-1"


def test_coding_question_type_and_end_action_round_trip():
    q = PlannedQuestion.model_validate({
        "id": "q1", "type": "coding", "prompt": "Let's do a coding problem: find two numbers that add up to a target.",
        "targetDifficulty": 2, "weightedFromWeakness": False, "exemplarId": "code-two-sum"})
    assert PlannedQuestion.model_validate(q.model_dump(by_alias=True)) == q
    d = InterviewDecision(action="end", currentQuestionId="q1", say="I'm going to end the interview here. Take care.")
    assert InterviewDecision.model_validate(d.model_dump(by_alias=True)).action == "end"


def test_session_record_carries_company_style_and_conduct_flag_with_defaults():
    from models.contracts import SessionRecord
    base = {"sessionId": "s", "candidateId": "c", "date": "2026-10-28", "mode": "coding",
            "level": "mid", "questions": [], "evaluations": []}
    old = SessionRecord.model_validate(base)  # records written before these fields existed
    assert old.company_style == "general" and old.ended_for_conduct is False
    rec = SessionRecord.model_validate({**base, "companyStyle": "amazon", "endedForConduct": True})
    dumped = rec.model_dump(by_alias=True)
    assert dumped["companyStyle"] == "amazon" and dumped["endedForConduct"] is True
    assert SessionRecord.model_validate_json(rec.model_dump_json(by_alias=True)) == rec


def test_coach_response_code_defaults_empty():
    from models.contracts import CoachResponse
    assert CoachResponse(modelAnswer="m", improvements=[]).code == ""
    r = CoachResponse.model_validate({"modelAnswer": "m", "improvements": [], "code": "def f(): pass"})
    assert r.model_dump(by_alias=True)["code"] == "def f(): pass"
