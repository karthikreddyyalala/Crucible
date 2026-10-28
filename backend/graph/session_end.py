from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from models.contracts import AnswerEvaluation, MemoryProfile
from agents.memory import MemoryAgent


class SessionEndState(TypedDict, total=False):
    candidate_id: str
    session_date: str
    evaluations: list[AnswerEvaluation]
    existing_memory: MemoryProfile
    updated_memory: MemoryProfile


def build_session_end_graph(*, llm, memory_model: str, memory_temperature: float = 0.0):
    memory_agent = MemoryAgent(llm=llm, model=memory_model, temperature=memory_temperature)

    def memory_node(state: SessionEndState) -> SessionEndState:
        updated = memory_agent.run(
            candidate_id=state["candidate_id"],
            session_date=state["session_date"],
            evaluations=state["evaluations"],
            existing_memory=state["existing_memory"],
        )
        return {"updated_memory": updated}

    g = StateGraph(SessionEndState)
    g.add_node("memory", memory_node)
    g.add_edge(START, "memory")
    g.add_edge("memory", END)
    return g.compile()
