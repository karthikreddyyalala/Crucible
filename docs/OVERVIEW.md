# Crucible — project overview

Written 2026-09-12, kept current as work lands. Read this first; it links out to
everything else rather than duplicating it.

## What this is

An AI mock-interview platform. Live at https://dvbk879zy1q2l.cloudfront.net.
GitHub: https://github.com/karthikreddyyalala/Crucible (renamed from
`Interview.ai` on 2026-09-09 — the old URL still redirects).

The pitch, in one line: most AI mock interviewers forget you between sessions and
validate everything you say. This one remembers your recurring weak spots across
sessions and pushes back on vague answers instead of saying "great answer."

Full product story, architecture table, and stack: **[README.md](../README.md)**
(this doc doesn't repeat that — it covers what README doesn't: status, decisions,
and what's left).

## Architecture at a glance

Six agents in a LangGraph pipeline (`backend/agents/`): **Intake → Planner →
Interviewer → Evaluator → Memory → Coach**. Every agent call routes through one
choke point (`backend/llm/client.py`) that validates output against a Pydantic
schema and retries on parse/schema failure — no raw LLM text ever crosses an
agent boundary. See README's Architecture section for what each agent does.

Frontend: React + TypeScript + Vite + Zustand, talking to the backend through
`src/lib/api.ts` (or a local mock engine when `VITE_USE_MOCK=true`, which is the
default — the whole UI is demoable with zero AWS credentials).

Backend: FastAPI on a single Lambda, DynamoDB for state, Cognito for auth,
Bedrock for inference, Tavus (optional, feature-flagged) for the video avatar.

## Status as of 2026-09-12

**Shipped and verified** (don't re-litigate these, they're done):

- Core 6-agent pipeline, cross-session memory loop verified via tests that
  assert on actual generated prompt text, not just schema shape.
- Golden-dataset eval: 35 hand-labeled cases (23 regression + 12 adversarial),
  100% decision accuracy on the Interviewer's action calls, live Bedrock calls,
  no mocking. Full story and the corrected-labels detail: README's "Engineering
  depth" section.
- Deployed to AWS (Lambda + API Gateway + DynamoDB + Cognito + CloudFront),
  Cognito auth enforced in prod, deploy scripts hard-fail instead of silently
  disabling auth if config is missing.
- Optimistic locking fixed a real concurrent-write data-loss bug in
  `backend/store/dynamo.py` (two tabs / a retry could silently lose
  `MemoryProfile` writes).
- CI running (pytest + vitest), MIT license, README rewritten to lead with the
  pitch and numbers instead of the personal story.
- **Prompt injection fencing** (2026-09-12): candidate answers, resumes, and job
  descriptions are untrusted user text fed into agent prompts. All four
  user-text agents (interviewer, evaluator, coach, intake) now fence that text
  in `<tag>` delimiters via `backend/agents/untrusted.py`, and every prompt
  states tag contents are data, never directives. Found during a security pass,
  not part of the original build — worth mentioning if asked "how do you handle
  adversarial input," since almost nobody asks this unprompted and even fewer
  have an answer.
- **Observability, cost/latency logging** (2026-09-12): every LLM call logs
  cost, latency, tokens, and retries to CloudWatch (agent-labeled explicitly,
  never inferred from the call stack). Session-wide cost accumulates
  client-side across `/start` + `/turn` and is echoed to `/finalize`, which
  adds its own cost and stores the total on `SessionRecord.cost_usd`. Full
  detail and the one thing still missing (a real measurement run): see the
  plan doc linked below.

**Tests:** 119 backend (pytest), 55 frontend (vitest), typecheck clean. Run:
```bash
cd backend && pytest              # backend
npm test                          # frontend
npx tsc -b --noEmit                # typecheck
```

**Deliberate, not gaps** (don't "fix" these without a reason):

- Interviewer voice is ElevenLabs Flash v2.5 through the backend (`/api/tts`;
  measured ~0.9s per line, vs ~2.8s on eleven_v4 — Lambda can't stream, so the
  fast model wins). Candidate speech is browser-native recognition, not Deepgram.
- Deploy is plain shell scripts, no Terraform/CDK — fine for a single-Lambda app.
- Tavus avatar is optional and feature-flagged; the app must never block on it.

## What's next

The full task-by-task breakdown — exact files, acceptance criteria, why each
task is scoped the way it is — lives in
**[superpowers/plans/2026-09-12-remaining-work.md](superpowers/plans/2026-09-12-remaining-work.md)**.
Short version, in the order we're tackling them:

1. ~~Observability~~ — done (see above), except the real measurement run (needs
   live credentials).
2. **Adversarial input eval cases**: written (2026-09-24), not yet run. 8 cases in
   `backend/evals/golden/interview_turn_adversarial_input_cases.json` cover
   injection, the fence-escape case, gibberish, off-topic, near-empty, and another
   language, plus one case that forces the Evaluator to run so we can test that it
   can't be talked into a passing verdict. Every label is marked unverified until
   it's run against real Bedrock (needs credentials):
   `cd backend && python -m evals.run_accuracy_eval adversarial_input evals/golden/interview_turn_adversarial_input_cases.json`
3. **Demo video**: script ready and verified, see **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)**.
   Every beat (greeting by name, push-back on a vague answer, a pass, a
   WOULDN'T SURVIVE verdict) was confirmed by driving the real session store
   against the mock engine. You just need to record it.
4. **GitHub "About" section** — still blank, two minutes, needs the GitHub UI.

## Resume bullets (current, verified)

```
Crucible AI -- AI Interview Platform | LangGraph, Amazon Bedrock, FastAPI, React, DynamoDB, AWS Lambda | 2026

- Built and deployed a production AI interview platform with a 6-agent LangGraph pipeline for intake,
  planning, live interview execution, evaluation, cross-session memory, and coaching; rewrote each
  session's question plan around persisted candidate weak spots and verified adaptation through
  end-to-end tests on generated prompt text.
- Designed a golden-dataset evaluation harness with 23 regression and 12 adversarial cases
  (buzzword-padded inputs, subtle logic traps); achieved 97%+ routing and action accuracy across
  live Bedrock test runs by tiering Claude Haiku for extraction and Sonnet for multi-step reasoning.
- Shipped to AWS Lambda, API Gateway, DynamoDB, Cognito, and CloudFront with 100+ backend tests and CI;
  eliminated concurrent-write memory loss using optimistic locking and enforced schema-validated
  structured outputs so no raw model text crosses agent boundaries.
```

Why "97%+" and not "100%": the eval measures two things — the Interviewer's
action decision (100%, 35/35) and the Evaluator's `wouldSurviveRealInterview`
verdict (93.3%, 14/15, one documented flaky boundary case). Blended, 49/50 =
98%. "97%+" is the honest, conservative, fully defensible number — if pressed
in an interview, walking through that breakdown makes you look more rigorous,
not less.

## Housekeeping notes worth knowing

- **Git rule:** never mention AI, Claude, or "generated" in commit messages —
  see CLAUDE.md. Verified clean across all commits as of this doc.
- **Case-insensitive filesystem hazard:** before deleting a file believed to be
  a case-duplicate of another, verify with `git ls-files | grep -i <name>` —
  `ls` cannot prove two files exist. A past cleanup deleted `CLAUDE.md` this way.
- **Local dev has no AWS/Tavus credentials** (`.env` files are absent). Gated
  LLM evals (`INTERVIEWAI_RUN_LLM_EVALS=1`) and anything needing live Bedrock
  or Tavus need real credentials supplied at runtime.
