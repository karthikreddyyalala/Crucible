from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan
from models.question_data import QuestionExemplar
from models.loader import bank_for, load_competency_map
from agents.intake import IntakeAgent
from agents.planner import PlannerAgent


def keep_known_exemplars(plan: QuestionPlan, bank: list[QuestionExemplar]) -> QuestionPlan:
    """The model may invent, misspell or repeat bank ids; only the session bank's, once each, survive."""
    allowed, types, qs = {q.id for q in bank}, {q.id: q.type for q in bank}, []
    for q in plan.questions:
        ok = q.exemplar_id in allowed and types[q.exemplar_id] == q.type
        if ok:
            allowed.discard(q.exemplar_id)
        qs.append(q.model_copy(update={"exemplar_id": q.exemplar_id if ok else None}))
    return plan.model_copy(update={"questions": qs})


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


def build_session_start_graph(*, llm, intake_model: str, planner_model: str,
                              intake_temperature: float = 0.0, planner_temperature: float = 0.0):
    intake = IntakeAgent(llm=llm, model=intake_model, temperature=intake_temperature)
    planner = PlannerAgent(llm=llm, model=planner_model, temperature=planner_temperature)

    def intake_node(state: SessionStartState) -> SessionStartState:
        profile = intake.run(
            resume_text=state["resume_text"], jd_text=state["jd_text"],
            usage_sink=state.get("usage"),
        )
        return {"profile": profile}

    def planner_node(state: SessionStartState) -> SessionStartState:
        mode, level = state.get("mode", "full"), state.get("level", "mid")
        bank = bank_for(state["role_key"], mode=mode, level=level)
        plan = planner.run(
            session_id=state["session_id"],
            profile=state["profile"],
            memory=state["memory"],
            competency_map=load_competency_map(state["role_key"]),
            mode=mode,
            level=level,
            usage_sink=state.get("usage"),
            bank=bank,
        )
        return {"plan": keep_known_exemplars(plan, bank)}

    g = StateGraph(SessionStartState)
    g.add_node("intake", intake_node)
    g.add_node("planner", planner_node)
    g.add_edge(START, "intake")
    g.add_edge("intake", "planner")
    g.add_edge("planner", END)
    return g.compile()
