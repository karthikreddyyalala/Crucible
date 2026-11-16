"""Full mock interviews with simulated students, judged for how human and useful Marcus is.

A persona (backend/evals/golden/human_feel_personas.json) plays the candidate on Claude Haiku;
the real app (start, every turn, evaluate, finalize) runs through the same routes and the same
stage logic as src/stores/sessionStore.ts; Claude Sonnet then judges each transcript against
backend/evals/golden/human_feel_rubric.json. Free regex checks run on every Marcus line too.

Costs real money. Uses the Claude API (`ant auth login` or ANTHROPIC_API_KEY), never Bedrock:
    cd backend && INTERVIEWAI_LLM_PROVIDER=anthropic \\
      SSL_CERT_FILE=$(python3 -c "import certifi;print(certifi.where())") \\
      python3 -m evals.human_feel_interview --personas nervous-rambler,vague-generalist --budget 3
It stops before starting another interview once --budget (USD, estimated) is spent.
"""
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field

GOLDEN = Path(__file__).parent / "golden"
OUT_ROOT = Path(__file__).parent / "results" / "human_feel"

CANDIDATE_MODEL = "claude-haiku-5-5"
JUDGE_MODEL = "claude-sonnet-5-5"
PRICE_PER_MTOK = {CANDIDATE_MODEL: (0.10, 0.50), JUDGE_MODEL: (2.00, 10.00)}

MAX_TURNS_PER_QUESTION = 9  # the server's follow-up budget is lower; this only stops a runaway loop
MAX_CLOSING_TURNS = 3
EARLIER_LIMIT = 3000  # same as LIMIT.earlier in the store

# Free checks on every Marcus line. Patterns, not opinions: each one is something a real
# interviewer doesn't say, or says once, not every turn.
SLOP = [  # from docs/superpowers/research/2026-11-16-realistic-interviews.md section 2.1
    (r"\b(?:great|good|excellent|fantastic) (?:answer|question|point|example)\b", "generic praise"),
    (r"\b(?:fantastic|excellent|amazing|awesome|wonderful|brilliant|impressive)\b", "gushing word"),
    (r"\b(?:absolutely|certainly)\b", "chatbot agreement"),
    (r"\bthat'?s a (?:really )?(?:good|great|solid|interesting) (?:answer|start|approach)\b", "generic praise"),
    (r"\b(?:love that|love how you|well done|spot on|nailed it|you'?re doing great|keep up the good work)\b", "cheerleading"),
    (r"\b(?:thank you for sharing|i appreciate (?:you|that|your))\b", "chatbot courtesy"),
    (r"\b(?:so what i'?m hearing|if i understand correctly|to summarize|so you'?re saying|in other words|it sounds like you)\b", "echo summary"),
    (r"\blet'?s (?:dive in|delve|unpack|explore)\b|\bi'?d be happy to\b|\bfeel free to\b", "chatbot filler"),
    (r"\b(?:delve|tapestry|leverage|robust|seamless|synergy|holistic|landscape|journey)\b", "AI vocabulary"),
    (r"\bas an ai\b|\blanguage model\b", "breaks character"),
    (r"[—–]", "dash in speech"),
    (r"^\s*(?:[-*•]|\d+\.)\s|\*\*", "markdown in speech"),
]


def slop_hits(line: str, stage: str = "") -> list[str]:
    hits = [label for pat, label in SLOP if re.search(pat, line, re.IGNORECASE | re.MULTILINE)]
    if line.count("?") > 1:
        hits.append("more than one question")
    if stage != "closing" and len(line.split()) > 70:
        hits.append("monologue (70+ words)")
    return hits


def opener_repeats(lines: list[str]) -> dict[str, int]:
    """Same first two words on 3+ Marcus lines ("Got it.", "Okay, so") reads as a script."""
    counts: dict[str, int] = {}
    for line in lines:
        key = " ".join(re.findall(r"[a-z']+", line.lower())[:2])
        if key:
            counts[key] = counts.get(key, 0) + 1
    return {k: v for k, v in counts.items() if v >= 3}


class Criterion(BaseModel):
    score: int = Field(ge=1, le=5)
    evidence: str


class Judgement(BaseModel):
    scores: dict[str, Criterion]
    robotic_lines: list[str] = []
    best_moment: str
    worst_moment: str
    student_leaves_confident: bool
    confidence_reasoning: str
    top_fixes: list[str]
    praise_unearned: bool = False
    stacked_question_count: int = 0
    hard_fail: list[str] = []

    def overall(self) -> float:
        """Mean of the criteria, capped at 2 on any hard fail (rubric scoring notes)."""
        mean = sum(c.score for c in self.scores.values()) / len(self.scores)
        return round(min(mean, 2.0) if self.hard_fail else mean, 2)


def _text(message) -> str:
    return "".join(b.text for b in message.content if getattr(b, "type", "") == "text")


class Meter:
    def __init__(self) -> None:
        self.app = 0.0
        self.sim = 0.0

    def add(self, model: str, usage) -> None:
        price_in, price_out = PRICE_PER_MTOK[model]
        self.sim += usage.input_tokens / 1e6 * price_in + usage.output_tokens / 1e6 * price_out

    @property
    def total(self) -> float:
        return self.app + self.sim


def candidate_reply(claude, meter: Meter, persona: dict, transcript: list[tuple[str, str]]) -> str:
    convo = "\n".join(f"{'Interviewer' if s == 'm' else 'You'}: {t}" for s, t in transcript)
    system = (
        "You are role-playing a job candidate in a live spoken mock interview, for testing an interviewer. "
        "Stay fully in character the whole time. Reply with ONLY the words you say out loud next: no stage "
        "directions, no quotes, no labels, no markdown. Talk like a real person speaking, not writing.\n\n"
        f"Who you are: {persona['name']}. {persona['resume']}\n"
        f"Role you're interviewing for: {persona['jd']}\n"
        f"How you talk and behave: {persona['style']}\n"
        f"Example lines in your voice: {' | '.join(persona['sample_lines'])}\n"
        "Never get better just because the interviewer pushes, unless your style says you do. "
        "If the interviewer asks what questions you have, ask one real question once, then say you're all set."
    )
    msg = claude.messages.create(
        model=CANDIDATE_MODEL, max_tokens=2000, system=system,
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": f"The interview so far:\n{convo}\n\nYour next reply:"}],
    )
    meter.add(CANDIDATE_MODEL, msg.usage)
    return _text(msg).strip().strip('"')


def feedback_lines(evals: list[dict]) -> str:
    """Each answer's feedback as the student sees it on Results: verdict, reasoning, what worked."""
    return "\n".join(
        f"- {e['questionId']}: survives={e['wouldSurviveRealInterview']}; {e['survivalReasoning']} "
        + (f"What worked: {e['strength']} " if e.get("strength") else "")
        + f"(tags: {', '.join(e['weaknessTags']) or 'none'})" for e in evals)


def judge(claude, meter: Meter, rubric: dict, persona: dict, transcript_md: str, evals: list[dict]) -> Judgement:
    criteria = "\n".join(
        f"- {c['id']}: {c['question']}\n  1 = {c['anchors']['1']}\n  3 = {c['anchors']['3']}\n  5 = {c['anchors']['5']}"
        for c in rubric["criteria"])
    feedback = feedback_lines(evals)
    system = (
        "You are a veteran hiring manager who has run hundreds of real interviews and trains new interviewers. "
        "You are reviewing a transcript of an AI interviewer named Marcus with a student, plus the written "
        "feedback the student received afterwards. Judge Marcus against what a skilled human interviewer would "
        "do with THIS candidate. Be strict and specific: quote exact lines as evidence. Score every criterion."
    )
    user = (
        f"Candidate persona (what the student was simulating): {persona['style']}\n"
        f"What a good interviewer does with this candidate: {persona['good_interviewer']}\n\n"
        f"Criteria (score 1-5 each):\n{criteria}\n\n"
        f"Hard fails (list each one that happened, quoting the line): {'; '.join(rubric['hard_fail'])}\n\n"
        f"Transcript:\n{transcript_md}\n\nFeedback shown to the student:\n{feedback or '(none)'}\n\n"
        "Return ONLY a JSON object: {\"scores\": {\"<criterion id>\": {\"score\": 1-5, \"evidence\": \"quote + why\"}}, "
        "\"robotic_lines\": [exact Marcus lines that sound scripted or AI], \"best_moment\": str, "
        "\"worst_moment\": str, \"student_leaves_confident\": bool, \"confidence_reasoning\": str, "
        "\"top_fixes\": [up to 3 concrete changes to Marcus], \"praise_unearned\": bool, "
        "\"stacked_question_count\": int, \"hard_fail\": [quoted hard-fail lines, empty if none]}"
    )
    from llm.json_utils import extract_json
    last: Exception | None = None
    for _ in range(2):
        msg = claude.messages.create(
            model=JUDGE_MODEL, max_tokens=16000, system=system,
            output_config={"effort": "medium"},
            messages=[{"role": "user", "content": user}],
        )
        meter.add(JUDGE_MODEL, msg.usage)
        try:
            return Judgement.model_validate(extract_json(_text(msg)))
        except Exception as e:  # one retry on a malformed verdict
            last = e
    raise RuntimeError(f"judge returned no valid verdict: {last}")


def run_interview(client, claude, meter: Meter, persona: dict) -> dict:
    """One session, stage by stage, the way the browser store drives it."""
    def post(path: str, body: dict) -> dict:
        r = client.post(path, json=body)
        if r.status_code != 200:
            raise RuntimeError(f"{path} -> {r.status_code}: {r.text[:300]}")
        d = r.json()
        meter.app += d.get("costUsd", 0.0)
        return d

    cid = f"human-feel-{persona['id']}"
    start = post("/api/session/start", {
        "resumeText": persona["resume"], "jdText": persona["jd"], "role": persona["role"],
        "candidateId": cid, "candidateName": persona["name"], "mode": persona["mode"], "level": persona["level"]})
    plan, profile = start["plan"], start["profile"]
    questions = plan["questions"]

    msgs: list[dict] = []  # {speaker: m|c, text, thread}
    log: list[tuple[str, str, str]] = []  # (stage, speaker, text) for the report
    evals: list[dict] = []
    slop: list[dict] = []
    first = persona["name"].split()[0]
    greet = (f"Hi {first}, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. "
             "Before we dive in, how are you doing?")

    def marcus(thread: str, text: str, stage: str) -> None:
        msgs.append({"speaker": "m", "text": text, "thread": thread})
        log.append((stage, "Marcus", text))
        if hits := slop_hits(text, stage):
            slop.append({"line": text, "issues": hits})

    def candidate(thread: str, stage: str) -> str:
        line = candidate_reply(claude, meter, persona, [(m["speaker"], m["text"]) for m in msgs])
        msgs.append({"speaker": "c", "text": line, "thread": thread})
        log.append((stage, first, line))
        return line

    def thread_text(thread: str) -> str:
        return "\n".join(f"{'Q' if m['speaker'] == 'm' else 'A'}: {m['text']}" for m in msgs if m["thread"] == thread)

    def turn(phase: str, question: dict, thread: str, follow_ups: int, next_q: dict | None) -> dict:
        earlier = ""
        if next_q:
            earlier = "\n".join(m["text"] for m in msgs if m["speaker"] == "c"
                                and m["thread"] not in (thread, "intro", "closing"))[-EARLIER_LIMIT:]
        d = post("/api/session/turn", {
            "question": question, "answer": thread_text(thread), "followUpCount": follow_ups,
            "isLast": phase == "question" and next_q is None, "phase": phase, "nextQuestion": next_q,
            "earlier": earlier, "candidateName": persona["name"], "mode": persona["mode"],
            "level": persona["level"], "profile": profile})
        return d["decision"]

    def say(dec: dict, fallback: str) -> str:
        return re.sub(r",?\s*[—–]\s*", ", ", (dec.get("say") or dec.get("followUpPrompt") or fallback).strip())

    marcus("intro", greet, "warmup")
    candidate("intro", "warmup")
    dec = turn("warmup", questions[0], "intro", 0, None)
    marcus("background", say(dec, "To start, walk me through your background. What have you been working on most recently?"), "background")
    candidate("background", "background")
    dec = turn("background", questions[0], "background", 0, questions[0])
    marcus(questions[0]["id"], say(dec, questions[0]["prompt"]), questions[0]["id"])

    for i, q in enumerate(questions):
        nxt = questions[i + 1] if i + 1 < len(questions) else None
        follow_ups = 0
        for _ in range(MAX_TURNS_PER_QUESTION):
            candidate(q["id"], q["id"])
            dec = turn("question", q, q["id"], follow_ups, nxt)
            if dec["action"] in ("follow_up", "clarify"):
                follow_ups += dec["action"] == "follow_up"
                marcus(q["id"], say(dec, q["prompt"]), q["id"])
                continue
            break
        ev = post("/api/session/evaluate", {"question": q, "transcript": thread_text(q["id"]), "followUpCount": follow_ups})
        evals.append(ev["evaluation"])
        if nxt:
            marcus(nxt["id"], say(dec, nxt["prompt"]), nxt["id"])
        else:
            marcus("closing", say(dec, "That's everything I wanted to cover. What questions do you have for me?"), "closing")

    for _ in range(MAX_CLOSING_TURNS):
        candidate("closing", "closing")
        dec = turn("closing", questions[-1], "closing", 0, None)
        if dec["action"] == "complete":
            marcus("closing", say(dec, "Thanks for your time today. I'll put your feedback together now."), "closing")
            break
        marcus("closing", say(dec, "Anything else you'd like to ask?"), "closing")

    fin = post("/api/session/finalize", {
        "candidateId": cid, "evaluations": evals, "sessionId": plan["sessionId"], "mode": persona["mode"],
        "level": persona["level"], "questions": questions, "costUsd": meter.app})
    marcus_lines = [t for _, s, t in log if s == "Marcus"]
    return {"plan": questions, "log": log, "evaluations": evals, "slop": slop,
            "opener_repeats": opener_repeats(marcus_lines), "memory": fin}


def to_markdown(persona: dict, run: dict) -> str:
    out, stage = [f"# {persona['id']} ({persona['mode']}, {persona['level']})\n"], None
    for st, who, text in run["log"]:
        if st != stage:
            out.append(f"\n### {st}\n")
            stage = st
        out.append(f"**{who}:** {text}\n")
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--personas", required=True, help="comma-separated persona ids, or 'all'")
    ap.add_argument("--budget", type=float, required=True, help="estimated USD cap for the whole run")
    args = ap.parse_args()
    if os.getenv("INTERVIEWAI_LLM_PROVIDER") != "anthropic":
        sys.exit("Set INTERVIEWAI_LLM_PROVIDER=anthropic: this eval runs on Claude API credits, never Bedrock.")

    from anthropic import Anthropic
    from fastapi.testclient import TestClient
    from app import create_app
    from config.settings import Settings
    from store.in_memory import InMemoryStore

    personas = json.loads((GOLDEN / "human_feel_personas.json").read_text())
    rubric = json.loads((GOLDEN / "human_feel_rubric.json").read_text())
    chosen = personas if args.personas == "all" else [p for p in personas if p["id"] in args.personas.split(",")]
    if not chosen:
        sys.exit(f"No personas matched. Known: {', '.join(p['id'] for p in personas)}")

    # No local .env: it holds a live Tavus key, and nothing here should touch Tavus or voice.
    client = TestClient(create_app(settings=Settings(_env_file=None), store=InMemoryStore()))
    claude = Anthropic()
    meter = Meter()
    out = OUT_ROOT / datetime.now().strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True, exist_ok=True)
    summary = []

    for persona in chosen:
        if meter.total >= args.budget:
            print(f"Budget ${args.budget:.2f} reached (${meter.total:.2f}); skipping the rest.")
            break
        spent_before, t0 = meter.total, time.time()
        print(f"\n=== {persona['id']} ===", flush=True)
        try:
            run = run_interview(client, claude, meter, persona)
            md = to_markdown(persona, run)
            verdict = judge(claude, meter, rubric, persona, md, run["evaluations"])
        except Exception as e:
            print(f"  FAILED: {e}")
            summary.append({"persona": persona["id"], "error": str(e), "costUsd": round(meter.total - spent_before, 4)})
            continue
        cost = meter.total - spent_before
        (out / f"{persona['id']}.md").write_text(md)
        (out / f"{persona['id']}.json").write_text(json.dumps(
            {"persona": persona["id"], "costUsd": cost, "judgement": verdict.model_dump(), **run}, indent=2))
        scores = {k: v.score for k, v in verdict.scores.items()}
        row = {"persona": persona["id"], "mode": persona["mode"], "scores": scores,
               "avg": verdict.overall(), "hardFail": verdict.hard_fail, "confident": verdict.student_leaves_confident,
               "slopLines": len(run["slop"]), "openerRepeats": run["opener_repeats"],
               "survived": f"{sum(e['wouldSurviveRealInterview'] for e in run['evaluations'])}/{len(run['evaluations'])}",
               "costUsd": round(cost, 4), "seconds": round(time.time() - t0)}
        summary.append(row)
        print(f"  avg {row['avg']} | confident {row['confident']} | slop lines {row['slopLines']} | "
              f"survived {row['survived']} | ${cost:.3f} | {row['seconds']}s")
        for k, v in verdict.scores.items():
            print(f"    {k}: {v.score}")

    (out / "summary.json").write_text(json.dumps({"totalCostUsd": round(meter.total, 4), "runs": summary}, indent=2))
    print(f"\nEstimated total: ${meter.total:.3f} (app ${meter.app:.3f}, candidate+judge ${meter.sim:.3f}). Results: {out}")


if __name__ == "__main__":
    main()
