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


def test_answer_evaluation_key_points_default_and_alias():
    base = dict(
        questionId="q1", transcript="...", rubricScores={"depth": 2},
        weaknessTags=[], followUpCount=0,
        wouldSurviveRealInterview=True, survivalReasoning="ok",
    )
    assert AnswerEvaluation(**base).key_points == []
    ev = AnswerEvaluation.model_validate({**base, "keyPoints": ["a"]})
    assert ev.key_points == ["a"]
    assert ev.model_dump(by_alias=True)["keyPoints"] == ["a"]


def test_evaluator_prompt_asks_for_key_points_from_the_candidate_only():
    from pathlib import Path
    prompt = (Path(__file__).parent.parent / "prompts" / "evaluator.md").read_text()
    assert "keyPoints" in prompt
    key_points = prompt[prompt.index("- keyPoints"):].split("\n- ")[0]
    assert "only" in key_points and "A: lines" in key_points
    assert "never from the interviewer" in key_points


def test_session_summary_weakness_tags_union_and_old_default():
    from models.contracts import SessionRecord, SessionSummary

    def ev(qid: str, tags: list[str]) -> dict:
        return {"questionId": qid, "transcript": "...", "rubricScores": {"depth": 2},
                "weaknessTags": tags, "followUpCount": 0,
                "wouldSurviveRealInterview": False, "survivalReasoning": "r"}
    rec = SessionRecord.model_validate({
        "sessionId": "s", "candidateId": "c", "date": "2026-10-28", "mode": "full", "level": "mid",
        "questions": [], "evaluations": [ev("q1", ["vague-impact", "rambling"]), ev("q2", ["vague-impact"])],
    })
    summary = rec.summary()
    assert summary.weakness_tags == ["rambling", "vague-impact"]
    assert summary.model_dump(by_alias=True)["weaknessTags"] == ["rambling", "vague-impact"]
    old = SessionSummary.model_validate({"sessionId": "s", "date": "2026-10-01", "mode": "full",
                                         "level": "mid", "survived": 1, "total": 2})
    assert old.weakness_tags == []
    assert old.coding == []


def test_coding_attempt_limits_and_session_record_coding():
    import pytest
    from pydantic import ValidationError
    from models.contracts import CodingAttempt, SessionRecord

    ok = {"questionId": "q1", "problemId": "code-two-sum", "language": "python",
          "testsPassed": 12, "testsTotal": 14, "submitted": True, "seconds": 660}
    assert CodingAttempt.model_validate(ok).model_dump(by_alias=True) == ok
    assert CodingAttempt.model_validate({**ok, "seconds": None}).seconds is None
    for bad in ({"problemId": "x" * 81}, {"testsPassed": -1}, {"testsTotal": 1001},
                {"seconds": 86401}, {"seconds": -1}, {"language": "ruby"}):
        with pytest.raises(ValidationError):
            CodingAttempt.model_validate({**ok, **bad})

    base = {"sessionId": "s", "candidateId": "c", "date": "2026-10-29", "mode": "coding",
            "level": "mid", "questions": [], "evaluations": []}
    old = SessionRecord.model_validate(base)  # records written before coding existed
    assert old.coding == [] and old.summary().coding == []
    rec = SessionRecord.model_validate({**base, "coding": [ok]})
    assert rec.summary().model_dump(by_alias=True)["coding"] == [ok]
