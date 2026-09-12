from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan
from models.loader import load_competency_map
from agents.intake import IntakeAgent
from agents.planner import PlannerAgent


class SessionStartState(TypedDict, total=False):
    session_id: str
    resume_text: str
    jd_text: str
    role_key: str
    mode: str
    level: str
    memory: MemoryProfile
    profile: IntakeProfile
    plan: QuestionPlan
    usage: list


def build_session_start_graph(*, llm, intake_model: str, planner_model: str):
    intake = IntakeAgent(llm=llm, model=intake_model)
    planner = PlannerAgent(llm=llm, model=planner_model)

    def intake_node(state: SessionStartState) -> SessionStartState:
        profile = intake.run(
            resume_text=state["resume_text"], jd_text=state["jd_text"],
            usage_sink=state.get("usage"),
        )
        return {"profile": profile}

    def planner_node(state: SessionStartState) -> SessionStartState:
        plan = planner.run(
            session_id=state["session_id"],
            profile=state["profile"],
            memory=state["memory"],
            competency_map=load_competency_map(state["role_key"]),
            mode=state.get("mode", "full"),
            level=state.get("level", "mid"),
            usage_sink=state.get("usage"),
        )
        return {"plan": plan}

    g = StateGraph(SessionStartState)
    g.add_node("intake", intake_node)
    g.add_node("planner", planner_node)
    g.add_edge(START, "intake")
    g.add_edge("intake", "planner")
    g.add_edge("planner", END)
    return g.compile()
