"""One coding interview end to end through the real API routes and live Claude (Bedrock).
The candidate is scripted; its code runs through the same harness the browser runs in Pyodide.
Run from backend/ (costs about $0.35 on Bedrock):
    PYTHONPATH=. python3 evals/live_coding_interview.py 2>/dev/null | grep -v CloudWatchMetrics"""
import json, sys, time
from fastapi.testclient import TestClient
from app import create_app
from store.in_memory import InMemoryStore
from models.coding import find_problem
from data.coding import harness

client = TestClient(create_app(store=InMemoryStore()))
CID = "live-e2e-candidate"
cost = 0.0

RESUME = ("Priya Raman. B.S. Computer Science, Arizona State University, 2026. Internship: Backend intern at "
          "Larkspur Health (2025), built a FastAPI service that deduplicates patient intake records, cut "
          "duplicate rows 31%. Projects: campus bike-share tracker (Python, Postgres). Skills: Python, SQL, Git.")
JD = ("Software Engineer I, new grad. Write and review production Python and Go, design small services, "
      "data structures and algorithms fundamentals, testing, on-call rotation after 6 months.")

def post(path, body):
    t = time.time()
    r = client.post(path, json=body)
    if r.status_code != 200:
        sys.exit(f"{path} -> {r.status_code}: {r.text}")
    return r.json(), time.time() - t

start, dt = post("/api/session/start", {"resumeText": RESUME, "jdText": JD, "role": "sde", "candidateId": CID,
                                        "candidateName": "Priya", "mode": "coding", "level": "junior"})
cost += start["costUsd"]
plan = start["plan"]
print(f"# start ({dt:.1f}s): planner picked " + ", ".join(f"{q['exemplarId']}" for q in plan["questions"]))

# Pinned to the planner's first slot so the candidate's code can be written ahead of time.
problem = find_problem("code-two-sum")
q = {**plan["questions"][0], "exemplarId": problem.id, "prompt": f"Let's do a coding problem — {problem.title}."}
public = problem.public()

def run(code, only_visible):
    rows = harness.run(code, public, only_visible=only_visible)
    vis = [r for r in rows if r["index"] < public["visibleTestCount"]]
    hid = [r for r in rows if r["index"] >= public["visibleTestCount"]]
    bad = next((r for r in vis if not r["passed"]), None)
    show = json.dumps
    why = f" (example {bad['index'] + 1} failed: expected {show(bad['expected'])}, got {show(bad['got'])})" if bad else ""
    s = f"Examples: {sum(r['passed'] for r in vis)}/{len(vis)} passed{why}."
    return s + (f" Hidden tests: {sum(r['passed'] for r in hid)}/{len(hid)} passed." if hid else "")

msgs: list[tuple[str, str]] = []  # (speaker, text) for the coding question thread
follow_ups = 0
code, results, stage = public["starterCode"], "", "approach"

def say(line):
    print(f"\n**Marcus:** {line}")

def turn(phase, answer, *, event="", is_last=True, next_q=None, thread=None):
    global cost
    body = {"question": q, "answer": answer, "followUpCount": follow_ups if phase == "question" else 0,
            "isLast": is_last, "phase": phase, "candidateName": "Priya", "mode": "coding", "level": "junior",
            "profile": start["profile"], "nextQuestion": next_q}
    if phase == "question":
        body.update(code=code, testResults=results, codingStage=stage, event=event)
    d, dt = post("/api/session/turn", body)
    cost += d["costUsd"]
    dec = d["decision"]
    print(f"\n*({dec['action']}, {dt:.1f}s{', stage ' + stage if phase == 'question' else ''}"
          f"{', event ' + event if event else ''})*")
    say(dec["say"])
    return dec

def you(line, note=""):
    print(f"\n**Candidate{' (' + note + ')' if note else ''}:** {line}")

def ask(line, note="", event=""):
    """A question-phase turn: the whole thread so far, as the store builds it."""
    global follow_ups
    prior = "\n".join(f"{'Q' if s == 'm' else 'A'}: {t}" for s, t in msgs)
    if not event:
        you(line, note)
        msgs.append(("c", line))
    thread = prior if event else (f"{prior}\nA: {line}" if prior else line)
    dec = turn("question", thread, event=event)
    msgs.append(("m", dec["say"]))
    if dec["action"] == "follow_up":
        follow_ups += 1
    return dec

print("\n## Transcript\n")
greet = "Hi Priya, I'm Marcus — I'm one of the engineers on the team. Thanks for making the time today. How are you doing?"
say(greet)
you("Doing well, thanks. A little nervous, but ready.")
turn("warmup", f"Q: {greet}\nA: Doing well, thanks. A little nervous, but ready.")
you("Sure. I just finished my CS degree at ASU. Last summer I interned at Larkspur Health on a FastAPI service that deduplicates patient intake records.")
d = turn("background", "I just finished my CS degree at ASU. Last summer I interned at Larkspur Health on a FastAPI service "
         "that deduplicates patient intake records.", next_q=q)
msgs.append(("m", d["say"]))

# Approach
ask("The brute force is checking every pair, which is O(n squared). I think I can do one pass with a dictionary "
    "from value to index: for each number, check whether target minus it is already in the dictionary.", "approach")
if msgs[-1][1] and "go ahead" not in msgs[-1][1].lower():
    ask("Each number is checked against what came before it, so it can't pair with itself. If there's no pair, "
        "the problem says there's always exactly one, so I won't handle that case.", "answers the probe")

# Coding: a half-written function, then three quiet minutes -> the check-in event
stage = "coding"
code = "def two_sum(nums: list[int], target: int) -> list[int]:\n    seen = {}\n    for i, n in enumerate(nums):\n"
print("\n*(candidate types for a while, then goes quiet for three minutes)*")
ask("", event="checkin")
ask("Yeah, I'm fine, just writing the loop.", "replies to the check-in")

# A bug: stores before checking, so a number can pair with itself
code = ("def two_sum(nums: list[int], target: int) -> list[int]:\n    seen = {}\n    for i, n in enumerate(nums):\n"
        "        seen[n] = i\n        if target - n in seen:\n            return [seen[target - n], i]\n")
results = run(code, only_visible=True)
print(f"\n*(Run: {results})*")
ask("Hmm, example two fails, I get zero zero. Let me look.", "after a failing run")

# Fix and submit
code = ("def two_sum(nums: list[int], target: int) -> list[int]:\n    seen = {}\n    for i, n in enumerate(nums):\n"
        "        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n")
results = run(code, only_visible=True)
print(f"\n*(Run: {results})*")
results = run(code, only_visible=False)
stage = "review"
print(f"\n*(Submit: {results})*")
ask("", event="submit")

# Review: answer whatever Marcus asks, a little thin at first
reviews = [
    "It's O(n) time and O(n) space for the dictionary.",
    "If it were sorted I'd use two pointers from both ends and move them in, so no extra memory.",
    "With [4, 4] and target 8, the second 4 finds the first one in the dictionary, so it returns [0, 1]. "
    "That's why I check before I store.",
    "I'd collect every pair instead of returning early, and use a set of the pairs I've already added so I don't repeat one.",
]
for line in reviews:
    if msgs[-1][1] and follow_ups and msgs[-1][0] == "m" and "?" not in msgs[-1][1]:
        break
    dec = ask(line, "review")
    if dec["action"] in ("advance", "complete"):
        break

# Closing
you("Not really a question about the problem, but what does the first month look like for new grads on the team?")
d = turn("closing", "Q: That's everything I wanted to cover. What questions do you have for me?\n"
         "A: What does the first month look like for new grads on the team?")
you("No, that's all. Thanks, Marcus.")
turn("closing", f"Q: {d['say']}\nA: No, that's all. Thanks, Marcus.")

# Scoring, finalize, coach
transcript = "\n".join(f"{'Q' if s == 'm' else 'A'}: {t}" for s, t in msgs)
ev, dt = post("/api/session/evaluate", {"question": q, "transcript": transcript, "followUpCount": follow_ups,
                                         "code": code, "testResults": results})
cost += ev["costUsd"]
e = ev["evaluation"]
print(f"\n## Evaluation ({dt:.1f}s)\n")
print(f"- Would survive a real interview: **{'yes' if e['wouldSurviveRealInterview'] else 'no'}**. {e['survivalReasoning']}")
print(f"- Rubric: {', '.join(f'{k} {v}' for k, v in e['rubricScores'].items())}")
print(f"- Weakness tags: {', '.join(e['weaknessTags']) or 'none'}")
print(f"- Follow-ups counted: {e['followUpCount']}; transcript kept verbatim: {e['transcript'] == transcript}")

fin, dt = post("/api/session/finalize", {"candidateId": CID, "evaluations": [e], "sessionId": plan["sessionId"],
                                          "mode": "coding", "level": "junior", "questions": [q], "costUsd": cost})
print(f"\n## Memory after finalize ({dt:.1f}s)\n")
print("- Recurring weaknesses: " + (", ".join(w["tag"] for w in fin["recurringWeaknesses"]) or "none"))
print("- Strong areas: " + (", ".join(fin["strongAreas"]) or "none"))

coach, dt = post("/api/coach", {"question": q, "transcript": transcript, "weaknessTags": e["weaknessTags"],
                                 "sessionId": plan["sessionId"], "candidateId": CID, "code": code})
print(f"\n## Coach ({dt:.1f}s)\n")
print(coach["modelAnswer"])
for imp in coach.get("improvements", []):
    print(f"- {imp}")
if coach.get("code"):
    print(f"\n```python\n{coach['code']}\n```")

ungated, _ = post("/api/coach", {"question": q, "transcript": transcript, "weaknessTags": e["weaknessTags"],
                                  "sessionId": "not-a-finished-session", "candidateId": CID, "code": code})
print(f"\n*(Coach with an unfinished session id returns code: {bool(ungated.get('code'))})*")
print(f"\n*Estimated model cost for the session: ${cost:.3f} (plus the two coach calls)*")
