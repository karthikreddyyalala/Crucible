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
