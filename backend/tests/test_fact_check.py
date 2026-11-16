"""A cheap fact check of the candidate's technical claims, handed to Marcus and the Evaluator.

Human-feel eval, 2026-11-16: "a LEFT JOIN drops rows with no match" and "indexes are hash maps, so
lookup is O(1)" went unchallenged in the interview and were credited in the feedback, even with a
prompt rule to check for wrong claims first. A separate, focused call finds them; Marcus still
decides how to probe (counter-case first)."""
from pathlib import Path

from fastapi.testclient import TestClient

from agents.fact_check import FactCheckAgent, latest_reply
from agents.interviewer import InterviewerAgent
from app import create_app
from models.contracts import FalseClaim, PlannedQuestion
from store.in_memory import InMemoryStore

PROMPTS = Path(__file__).parent.parent / "prompts"
CLAIM = {"claim": "a LEFT JOIN drops rows with no match", "correction": "A LEFT JOIN keeps every left row."}
TECH = {"id": "q1", "type": "technical", "prompt": "INNER vs LEFT JOIN?", "targetDifficulty": 2,
        "weightedFromWeakness": False}
BEHAV = {**TECH, "type": "behavioral", "prompt": "Tell me about a conflict."}


class _LLM:
    """Answers every agent by schema and records each call's agent label and user prompt."""

    def __init__(self, claims=(CLAIM,), fail_fact_check=False):
        self.calls: list[tuple[str, str]] = []
        self._claims = list(claims)
        self._fail = fail_fact_check

    def structured(self, *, agent, schema, user, **_):
        self.calls.append((agent, user))
        name = schema.__name__
        if name == "FactCheck":
            if self._fail:
                raise RuntimeError("model down")
            return schema.model_validate({"falseClaims": self._claims})
        if name == "InterviewDecision":
            return schema.model_validate({"action": "follow_up", "say": "Okay. What comes back for an unmatched row?",
                                          "currentQuestionId": "q1"})
        return schema.model_validate({"questionId": "q1", "transcript": "", "rubricScores": {"correctness": 2},
                                      "weaknessTags": ["incorrect-core"], "followUpCount": 0,
                                      "wouldSurviveRealInterview": False, "survivalReasoning": "x"})

    def users(self, agent):
        return [u for a, u in self.calls if a == agent]


def test_latest_reply_is_the_last_answer_line_of_the_thread():
    assert latest_reply("Q: Joins?\nA: inner keeps matches\nQ: And left?\nA: it drops rows") == "it drops rows"
    assert latest_reply("just one reply") == "just one reply"


def test_agent_returns_claims_and_never_breaks_a_turn():
    assert FactCheckAgent(_LLM(), model="m").run(question="q", answer="a") == [FalseClaim(**CLAIM)]
    assert FactCheckAgent(_LLM(fail_fact_check=True), model="m").run(question="q", answer="a") == []


def test_claims_reach_the_interviewer_fenced_and_only_when_there_are_some():
    llm = _LLM()
    agent = InterviewerAgent(llm, model="m")
    q = PlannedQuestion.model_validate(TECH)
    kw = dict(question=q, candidate_answer="A: it drops rows", follow_up_count=0, is_last_question=False)
    agent.run_turn(**kw, false_claims=[FalseClaim(**CLAIM)])
    user = llm.users("interviewer")[-1]
    assert "<fact_check>" in user and "a LEFT JOIN drops rows with no match" in user
    agent.run_turn(**kw)
    assert "fact_check" not in llm.users("interviewer")[-1]


def _client(llm):
    return TestClient(create_app(llm=llm, store=InMemoryStore()))


def _turn(question, answer="Q: INNER vs LEFT JOIN?\nA: a LEFT JOIN drops rows with no match", **extra):
    return {"question": question, "answer": answer, "followUpCount": 0, "isLast": False, "phase": "question", **extra}


def test_technical_turn_is_fact_checked_on_the_latest_reply_only():
    llm = _LLM()
    r = _client(llm).post("/api/session/turn", json=_turn(TECH))
    assert r.status_code == 200
    (checked,) = llm.users("fact_check")
    assert "a LEFT JOIN drops rows with no match" in checked and "INNER vs LEFT JOIN?" in checked
    assert "a LEFT JOIN drops rows with no match" in llm.users("interviewer")[0].split("<fact_check>")[1]


def test_behavioral_turns_events_and_small_talk_skip_the_check():
    llm = _LLM()
    c = _client(llm)
    c.post("/api/session/turn", json=_turn(BEHAV))
    c.post("/api/session/turn", json=_turn(TECH, event="checkin"))
    c.post("/api/session/turn", json=_turn(TECH, phase="background"))
    assert llm.users("fact_check") == []


def test_a_failed_check_still_gives_a_normal_turn():
    llm = _LLM(fail_fact_check=True)
    r = _client(llm).post("/api/session/turn", json=_turn(TECH))
    assert r.status_code == 200 and r.json()["decision"]["action"] == "follow_up"
    assert "fact_check" not in llm.users("interviewer")[0]


def test_evaluation_checks_all_candidate_lines():
    llm = _LLM()
    thread = "Q: INNER vs LEFT JOIN?\nA: inner keeps matches\nQ: And left?\nA: a LEFT JOIN drops rows with no match"
    r = _client(llm).post("/api/session/evaluate", json={"question": TECH, "transcript": thread, "followUpCount": 1})
    assert r.status_code == 200
    (checked,) = llm.users("fact_check")
    assert "inner keeps matches" in checked and "drops rows" in checked and "And left?" not in checked
    assert "<fact_check>" in llm.users("evaluator")[0]


def test_prompts_tell_marcus_and_the_evaluator_what_to_do_with_it():
    interviewer = " ".join((PROMPTS / "interviewer.md").read_text().split())
    evaluator = " ".join((PROMPTS / "evaluator.md").read_text().split())
    assert "When a Fact check is listed" in interviewer
    assert "When a Fact check is listed" in evaluator and "incorrect-core" in evaluator
    assert (PROMPTS / "fact_check.md").exists()
