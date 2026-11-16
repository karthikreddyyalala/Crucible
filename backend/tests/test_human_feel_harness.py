"""The human-feel eval harness, run end to end with fake models ($0): the loop follows the app's
stages, the free checks flag AI-sounding lines, and a hard fail caps the judge's overall score."""
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app import create_app
from evals import human_feel_interview as hf
from store.in_memory import InMemoryStore

PLAN = {"sessionId": "hf-1", "questions": [
    {"id": "q0", "type": "behavioral", "prompt": "Tell me about a project you're proud of.",
     "targetDifficulty": 2, "weightedFromWeakness": False},
    {"id": "q1", "type": "technical", "prompt": "How does a hash map work?",
     "targetDifficulty": 2, "weightedFromWeakness": False}]}
INTAKE = {"candidateSkills": ["Python"], "yearsExperience": 0, "projectHighlights": [],
          "targetRole": "SWE I", "jdRequirements": ["Python"], "resumeToJdGaps": []}
EVAL = {"questionId": "q0", "transcript": "", "rubricScores": {"depth": 2}, "weaknessTags": ["vague-impact"],
        "followUpCount": 1, "wouldSurviveRealInterview": False, "survivalReasoning": "No number for the result."}
MEMORY = {"candidateId": "x", "recurringWeaknesses": [], "improvementTrend": [], "strongAreas": []}


class _FakeLLM:
    """App agents: answers by schema; the interviewer probes once per question, then moves on."""

    def __init__(self):
        self.turns = 0
        self.users: list[str] = []

    def structured(self, *, schema, user="", **_):
        self.users.append(user)
        name = schema.__name__
        if name == "InterviewDecision":
            self.turns += 1
            probe = self.turns in (3, 5)  # first reply to each question (after warmup + background)
            return schema.model_validate({"action": "follow_up" if probe else "advance",
                                          "say": "How did you measure that?" if probe else "Okay. Next one.",
                                          "currentQuestionId": "q0"})
        data = {"IntakeProfile": INTAKE, "AnswerEvaluation": EVAL, "MemoryProfile": MEMORY}.get(name, PLAN)
        return schema.model_validate(data)


JUDGE = {"scores": {c: {"score": 4, "evidence": "q"} for c in ["probing_depth", "human_voice"]},
         "robotic_lines": [], "best_moment": "b", "worst_moment": "w", "student_leaves_confident": True,
         "confidence_reasoning": "r", "top_fixes": ["f"]}


class _FakeClaude:
    def __init__(self):
        self.calls = []
        self.messages = self

    def create(self, **kw):
        self.calls.append(kw)
        text = json.dumps(JUDGE) if kw["model"] == hf.JUDGE_MODEL else "Um, I built a pantry app."
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)],
                               usage=SimpleNamespace(input_tokens=1000, output_tokens=100))


PERSONA = {"id": "p", "name": "Dana Okafor", "mode": "behavioral", "level": "junior", "role": "sde",
           "resume": "CS grad.", "jd": "SWE I.", "style": "nervous", "sample_lines": ["um"],
           "good_interviewer": "steady"}


def test_full_interview_runs_through_every_stage():
    client = TestClient(create_app(llm=_FakeLLM(), store=InMemoryStore()))
    claude, meter = _FakeClaude(), hf.Meter()
    run = hf.run_interview(client, claude, meter, PERSONA)

    stages = [s for s, _, _ in run["log"]]
    assert stages[:2] == ["warmup", "warmup"] and "background" in stages and stages[-1] == "closing"
    assert [e["questionId"] for e in run["evaluations"]] == ["q0", "q0"]  # one evaluation per question
    assert any(t == "How did you measure that?" for _, s, t in run["log"] if s == "Marcus")
    # Marcus greets by first name; the candidate model never got Bedrock ids
    assert run["log"][0][2].startswith("Hi Dana,")
    assert all(c["model"] == hf.CANDIDATE_MODEL for c in claude.calls)
    assert meter.sim > 0

    verdict = hf.judge(claude, meter, json.loads((hf.GOLDEN / "human_feel_rubric.json").read_text()),
                       PERSONA, hf.to_markdown(PERSONA, run), run["evaluations"])
    assert verdict.overall() == 4.0


def test_slop_checks_flag_ai_lines_and_pass_human_ones():
    assert "generic praise" in hf.slop_hits("Great answer! Now tell me about your role.")
    assert "echo summary" in hf.slop_hits("So what I'm hearing is you built the cache.")
    assert "dash in speech" in hf.slop_hits("Okay — what was your part?")
    assert "more than one question" in hf.slop_hits("What did you build? And how did you test it?")
    assert hf.slop_hits("Okay. Faster by how much, and how did you measure it?") == []
    assert hf.slop_hits("Got it. Let me pause you there. What was your part?") == []


def test_opener_repeats_counts_scripted_starts():
    lines = ["Got it. What next?", "Got it. Why?", "Got it, how?", "Okay, so what broke?", "Okay, so why?"]  # two of a kind is fine
    assert hf.opener_repeats(lines) == {"got it": 3}


def test_hard_fail_caps_overall_at_two():
    v = hf.Judgement.model_validate({**JUDGE, "hard_fail": ["'Great answer' to a wrong claim"]})
    assert v.overall() == 2.0


def test_data_files_line_up():
    personas = json.loads((hf.GOLDEN / "human_feel_personas.json").read_text())
    rubric = json.loads((hf.GOLDEN / "human_feel_rubric.json").read_text())
    assert len({p["id"] for p in personas}) == len(personas) == 8
    assert all({"resume", "jd", "style", "sample_lines", "good_interviewer", "mode"} <= p.keys() for p in personas)
    assert len(rubric["criteria"]) == 8 and all(set(c["anchors"]) == {"1", "3", "5"} for c in rubric["criteria"])


def test_follow_ups_reach_the_evaluator_like_the_app_counts_them():
    llm = _FakeLLM()
    client = TestClient(create_app(llm=llm, store=InMemoryStore()))
    hf.run_interview(client, _FakeClaude(), hf.Meter(), PERSONA)
    graded = [u for u in llm.users if u.startswith("Question ID:")]  # evaluator prompts
    assert len(graded) == 2 and all("Follow-up count: 1" in u for u in graded)
