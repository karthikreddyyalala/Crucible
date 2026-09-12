from graph.interview_turn import build_interview_turn_graph, InterviewTurnState
from models.contracts import AnswerEvaluation, PlannedQuestion, QuestionPlan


class _ScriptedLLM:
    """Pops payloads in order — first call returns payload[0], second returns payload[1]."""
    def __init__(self, *payloads: dict):
        self._payloads = list(payloads)

    def structured(self, *, agent="test", model, system, user, schema, max_tokens=2000, sink=None):
        return schema.model_validate(self._payloads.pop(0))


def _plan(n: int = 2) -> QuestionPlan:
    return QuestionPlan(
        sessionId="sess-t",
        questions=[
            PlannedQuestion(id=f"q{i}", type="technical",
                            prompt=f"Q{i}", targetDifficulty=3, weightedFromWeakness=False)
            for i in range(n)
        ],
    )


_FOLLOW_UP_DECISION = {
    "action": "follow_up",
    "followUpPrompt": "What was the time complexity?",
    "currentQuestionId": "q0",
}

_ADVANCE_DECISION = {
    "action": "advance",
    "followUpPrompt": None,
    "currentQuestionId": "q0",
}

_COMPLETE_DECISION = {
    "action": "complete",
    "followUpPrompt": None,
    "currentQuestionId": "q1",
}

_EVAL = {
    "questionId": "q0", "transcript": "some answer",
    "rubricScores": {"correctness": 4.0}, "weaknessTags": [],
    "followUpCount": 0, "wouldSurviveRealInterview": True,
    "survivalReasoning": "Answer was correct and specific.",
}


def test_follow_up_action_returns_prompt_without_evaluating():
    """When interviewer says follow_up, evaluator must NOT be called."""
    llm = _ScriptedLLM(_FOLLOW_UP_DECISION)  # only 1 payload — evaluator firing would pop empty list
    graph = build_interview_turn_graph(llm=llm, interviewer_model="iv", evaluator_model="ev")

    state: InterviewTurnState = {
        "plan": _plan(),
        "current_question_idx": 0,
        "follow_up_count": 0,
        "candidate_answer": "It runs fast.",
        "evaluations": [],
    }
    result = graph.invoke(state)

    assert result["decision"].action == "follow_up"
    assert result["decision"].follow_up_prompt == "What was the time complexity?"
    assert result.get("evaluation") is None
    assert result["follow_up_count"] == 1  # incremented


def test_advance_action_triggers_evaluator_and_advances_idx():
    """advance → evaluator runs → current_question_idx increments."""
    llm = _ScriptedLLM(_ADVANCE_DECISION, _EVAL)
    graph = build_interview_turn_graph(llm=llm, interviewer_model="iv", evaluator_model="ev")

    state: InterviewTurnState = {
        "plan": _plan(),
        "current_question_idx": 0,
        "follow_up_count": 1,
        "candidate_answer": "Floyd's uses two pointers...",
        "evaluations": [],
    }
    result = graph.invoke(state)

    assert result["decision"].action == "advance"
    assert isinstance(result["evaluation"], AnswerEvaluation)
    assert result["evaluation"].would_survive_real_interview is True
    assert len(result["evaluations"]) == 1
    assert result["current_question_idx"] == 1
    assert result["follow_up_count"] == 0  # reset for next question


def test_complete_action_sets_session_complete_flag():
    """complete → evaluator runs → session_complete=True."""
    llm = _ScriptedLLM(_COMPLETE_DECISION, {**_EVAL, "questionId": "q1"})
    graph = build_interview_turn_graph(llm=llm, interviewer_model="iv", evaluator_model="ev")

    state: InterviewTurnState = {
        "plan": _plan(),
        "current_question_idx": 1,
        "follow_up_count": 0,
        "candidate_answer": "Floyd's uses two pointers...",
        "evaluations": [],
    }
    result = graph.invoke(state)

    assert result["session_complete"] is True
    assert len(result["evaluations"]) == 1
