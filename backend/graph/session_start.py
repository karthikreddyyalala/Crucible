from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from models.coding import CodingProblem, problems_for
from models.company_style import find_style
from models.contracts import IntakeProfile, MemoryProfile, QuestionPlan
from models.question_data import QuestionExemplar
from models.loader import bank_for, load_competency_map
from agents.intake import IntakeAgent
from agents.planner import PlannerAgent


# Coding problem difficulties offered to the Planner per (mode, level); other modes get none.
CODING_DIFFICULTIES: dict[tuple[str, str], set[str]] = {
    ("coding", "junior"): {"easy"},
    ("coding", "mid"): {"easy", "medium"},
    ("coding", "senior"): {"medium", "hard"},
    ("full", "junior"): {"easy"},
    ("full", "mid"): {"medium"},
    ("full", "senior"): {"medium", "hard"},
}


def keep_known_exemplars(plan: QuestionPlan, bank: list[QuestionExemplar],
                         coding: list[CodingProblem] = ()) -> QuestionPlan:
    """The model may invent, misspell or repeat ids. Only ids offered this session (bank questions,
    and coding problems for coding questions), on a question of the matching type, once each, survive."""
    allowed = {q.id: q.type for q in bank} | {p.id: "coding" for p in coding}
    qs = []
    for q in plan.questions:
        ok = allowed.get(q.exemplar_id) == q.type
        if ok:
            del allowed[q.exemplar_id]
        qs.append(q.model_copy(update={"exemplar_id": q.exemplar_id if ok else None}))
    return plan.model_copy(update={"questions": qs})


def assign_coding_problems(plan: QuestionPlan, coding: list[CodingProblem]) -> QuestionPlan:
    """The editor needs a real problem for every coding question. One left without an id gets an unused
    offered problem — its slot's difficulty first, then very_common, then a topic the plan doesn't
    have yet, then by id — and with none left it becomes technical."""
    used = {q.exemplar_id for q in plan.questions}
    topics = {t for p in coding if p.id in used for t in p.topics}
    qs = []
    for q in plan.questions:
        if q.type == "coding" and q.exemplar_id is None:
            want = "easy" if q.target_difficulty <= 2 else "hard" if q.target_difficulty == 5 else "medium"
            pick = min((p for p in coding if p.id not in used), default=None, key=lambda p: (
                p.difficulty != want, p.asked != "very_common", bool(topics.intersection(p.topics)), p.id))
            if pick:
                used.add(pick.id)
                topics.update(pick.topics)
                q = q.model_copy(update={"exemplar_id": pick.id, "prompt": f"Let's do a coding problem — {pick.title}."})
            else:
                q = q.model_copy(update={"type": "technical"})
        qs.append(q)
    return plan.model_copy(update={"questions": qs})


class SessionStartState(TypedDict, total=False):
    session_id: str
    resume_text: str
    jd_text: str
    role_key: str
    mode: str
    level: str
    company_style: str
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
        coding = problems_for(CODING_DIFFICULTIES.get((mode, level), set()))
        plan = planner.run(
            session_id=state["session_id"],
            profile=state["profile"],
            memory=state["memory"],
            competency_map=load_competency_map(state["role_key"]),
            mode=mode,
            level=level,
            usage_sink=state.get("usage"),
            bank=bank,
            coding_problems=coding,
            company_style=find_style(state.get("company_style", "general")),
        )
        return {"plan": assign_coding_problems(keep_known_exemplars(plan, bank, coding), coding)}

    g = StateGraph(SessionStartState)
    g.add_node("intake", intake_node)
    g.add_node("planner", planner_node)
    g.add_edge(START, "intake")
    g.add_edge("intake", "planner")
    g.add_edge("planner", END)
    return g.compile()
