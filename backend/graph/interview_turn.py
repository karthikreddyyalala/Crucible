from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from models.contracts import AnswerEvaluation, InterviewDecision, QuestionPlan
from agents.evaluator import EvaluatorAgent
from agents.interviewer import InterviewerAgent


class InterviewTurnState(TypedDict, total=False):
    plan: QuestionPlan
    current_question_idx: int
    follow_up_count: int
    candidate_answer: str
    decision: InterviewDecision
    evaluation: AnswerEvaluation | None
    evaluations: list[AnswerEvaluation]
    session_complete: bool


def build_interview_turn_graph(*, llm, interviewer_model: str, evaluator_model: str,
                               interviewer_temperature: float = 0.3,
                               evaluator_temperature: float = 0.0):
    interviewer = InterviewerAgent(llm=llm, model=interviewer_model, temperature=interviewer_temperature)
    evaluator = EvaluatorAgent(llm=llm, model=evaluator_model, temperature=evaluator_temperature)

    def interviewer_node(state: InterviewTurnState) -> InterviewTurnState:
        idx = state["current_question_idx"]
        questions = state["plan"].questions
        question = questions[idx]
        is_last = idx == len(questions) - 1

        decision = interviewer.run_turn(
            question=question,
            candidate_answer=state["candidate_answer"],
            follow_up_count=state["follow_up_count"],
            is_last_question=is_last,
        )
        updates: InterviewTurnState = {"decision": decision}
        if decision.action == "follow_up":
            updates["follow_up_count"] = state["follow_up_count"] + 1
        return updates

    def evaluator_node(state: InterviewTurnState) -> InterviewTurnState:
        idx = state["current_question_idx"]
        question = state["plan"].questions[idx]

        evaluation = evaluator.run(
            question=question,
            transcript=state["candidate_answer"],
            follow_up_count=state["follow_up_count"],
        )
        prior = list(state.get("evaluations") or [])
        action = state["decision"].action
        return {
            "evaluation": evaluation,
            "evaluations": [*prior, evaluation],
            "current_question_idx": idx + 1 if action == "advance" else idx,
            "follow_up_count": 0,
            "session_complete": action == "complete",
        }

    def route_after_interviewer(state: InterviewTurnState) -> str:
        return "evaluator" if state["decision"].action in ("advance", "complete") else END

    g = StateGraph(InterviewTurnState)
    g.add_node("interviewer", interviewer_node)
    g.add_node("evaluator", evaluator_node)
    g.add_edge(START, "interviewer")
    g.add_conditional_edges(
        "interviewer",
        route_after_interviewer,
        {"evaluator": "evaluator", END: END},
    )
    g.add_edge("evaluator", END)
    return g.compile()
