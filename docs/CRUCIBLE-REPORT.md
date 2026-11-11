# Crucible: full project report

Context for anyone (person or AI agent) picking up this project. Brief by design; links go
to the detail. Accurate as of 2026-11-10 (main at PR #18).

## 1. What it is

An AI mock interviewer. The interviewer, "Marcus", runs a real interview by voice, text or
video avatar, pushes back on vague answers instead of saying "great answer", and remembers
each candidate's weak spots across sessions so the next interview targets them.

- Live: https://dvbk879zy1q2l.cloudfront.net (demo mode needs no account and costs $0)
- Code: https://github.com/karthikreddyyalala/Crucible (demo video at the top of the README)
- Owner: Karthik Reddy. Built Sep to Nov 2026.

Pitch: "Most AI mock interviewers forget you between sessions. This one doesn't." and "It
pushes back on vague answers instead of saying great answer."

## 2. Architecture

Six agents in a LangGraph pipeline (`backend/agents/`, wired in `backend/graph/`):

| Agent | Job | Model |
|---|---|---|
| Intake | Resume + job description to a structured profile with gaps | Haiku 4.5 |
| Planner | Builds the question plan, weighting past weak spots | Sonnet 4.6 |
| Interviewer (Marcus) | Live conversation: follow up, clarify, move on, end | Sonnet 4.6 |
| Evaluator | Rubric scores, weakness tags, `wouldSurviveRealInterview` + reasoning | Sonnet 4.6 |
| Memory | Folds evaluations into a cross-session MemoryProfile | Haiku 4.5 |
| Coach | On demand, rewrites the candidate's own answer into a model answer | Sonnet 4.6 |

- Every LLM call goes through `backend/llm/client.py`: output must validate against a
  Pydantic schema or it retries. No raw model text crosses an agent boundary.
- Temperature 0 for scoring, planning and extraction; 0.3 for Marcus.
- Candidate text (answers, resume, JD, code) is fenced as untrusted data
  (`backend/agents/untrusted.py`) against prompt injection.
- Stack: React + TypeScript + Vite + Zustand, FastAPI on AWS Lambda behind API Gateway,
  DynamoDB (optimistic locking in `backend/store/dynamo.py` fixed lost Memory writes),
  Cognito auth, CloudFront, Claude on Amazon Bedrock, ElevenLabs voice, Deepgram speech to
  text, Tavus video avatar (optional), Pyodide in a Web Worker for code.

## 3. What works today (all merged to main)

- **Interviews:** full mock, behavioral, technical, system design and coding modes. Company
  styles: General, Amazon, Google, Meta, Microsoft, Startup. Question bank of 111 curated
  questions (SDE and AI Engineer), rubric anchors and follow-up ladders per question.
- **Coding round:** all 75 Blind 75 problems, run in the browser in Python or JavaScript
  against real test cases. Marcus runs approach, coding, then review, and never gives away
  the solution.
- **Voice:** Deepgram Flux detects when you've finished a thought, Marcus says "Mm-hm"
  while he thinks, and you can interrupt him mid-sentence. Falls back to Nova-3, then the
  browser recognizer. Interview terms and resume skills boost transcription accuracy.
- **Video:** Tavus avatar, falls back to voice if it doesn't connect in 25 s.
- **Feedback:** each answer gets a SURVIVES / WOULDN'T SURVIVE verdict with reasoning,
  rubric scores, weakness tags and key points. Scores sit behind "Details" so the verdict
  leads.
- **Memory and progress:** the next session's plan targets recurring weak spots. The
  dashboard shows each weak spot across the last 8 sessions (Looks fixed / Still showing up
  / New) and a coding history (problem, language, tests passed, time).
- **Safety:** abuse gets warn, warn, end; casual swearing is allowed; input limits;
  injection attempts are ignored.
- **Reliability:** autosave and refresh-safe sessions, clear recoverable error messages, no
  retries on rejected requests (stays under API Gateway's 30 s limit).

## 4. Proof (verified numbers)

- **Evals** (`backend/evals/`, summary in `docs/EVAL-RESULTS.md` on PR #9): 76 hand-labeled
  cases in 5 suites (core 28, coding 20, adversarial 12, adversarial input 8, question bank
  8), each run 3 times on live Bedrock.
  - 76/76 correct interviewer decisions; 34/34 correct survival verdicts, identical on all 3 runs
  - 96 to 100% run-to-run agreement
  - two-part follow-ups cut from 17.9% to 0%; 0 spoken verdicts in 204 lines
  - prompt injection held in every case
  - grew from 35 cases (23 regression + 12 adversarial, Sep 2026) through v2, v3 and v4
  - the evals caught a production SDK bug that unit tests missed
- **Tests:** 1,646 backend (pytest), about 500 frontend (vitest), 7 Playwright end-to-end
  specs in demo mode. CI runs pytest and vitest on every PR.
- **Cost:** about $0.50 to $0.80 of Claude per interview, plus about $0.37 a minute of Tavus
  after the free 25 minutes a month.

## 5. Resume: current text vs reality

| Resume says | Reality | Action |
|---|---|---|
| 6-agent LangGraph pipeline incl. coaching | True (Coach is the 6th agent) | Keep |
| Rewrote each session's plan around persisted weak spots, verified by end-to-end tests on generated prompt text | True | Keep |
| 35 regression and adversarial cases | Outdated: now 76 labeled cases in 5 suites, each run 3x | Update |
| 95%+ routing and action accuracy | Understated: 76/76 decisions, 34/34 survival verdicts, 96 to 100% agreement across runs. "Routing" is the wrong word; it's interviewer action decisions | Update |
| Haiku for extraction, Sonnet for multi-step reasoning | True (Intake and Memory on Haiku; the rest on Sonnet) | Keep |
| 100+ backend tests and CI | Understated: 1,646 backend + ~500 frontend + Playwright e2e | Update |
| Optimistic locking fixed concurrent-write memory loss | True | Keep |
| Schema-validated structured outputs | True | Keep |
| "production AI interview platform" | Deployed and live; no claim of a real user base | Say "deployed", don't imply users |
| Not on the resume | Live coding round (Blind 75, Python + JS in browser), real-time voice with end-of-turn and barge-in, video avatar, prompt-injection fencing, evals catching a prod bug | Add the strongest one or two |

Suggested bullets (all verified):

- Built and deployed an AI mock interviewer with a 6-agent LangGraph pipeline (intake,
  planning, live interviewing, evaluation, cross-session memory, coaching) on Amazon Bedrock;
  each new session's question plan targets the candidate's recurring weak spots.
- Designed an eval harness of 76 hand-labeled interview cases (core, coding, adversarial,
  prompt injection), run 3x on live Bedrock: 76/76 correct interviewer decisions, 34/34
  correct "would survive a real interview" verdicts, two-part questions cut from 17.9% to 0%;
  the evals caught a production SDK bug the unit tests missed.
- Shipped a live coding round (all Blind 75 problems, Python and JavaScript run in the
  browser via Pyodide in a Web Worker) and real-time voice (Deepgram end-of-turn detection,
  barge-in, ElevenLabs) on Lambda, DynamoDB, Cognito and CloudFront, with 1,600+ backend
  tests, CI, optimistic locking and schema-validated agent outputs.

## 6. Not done (parked on purpose)

- 2c: re-check each recording with Deepgram pre-recorded mode to fix misheard words.
- Tavus avatar using the ElevenLabs voice (a Tavus dashboard setting, no code).
- Phase 3: answer replay (your answer next to a strong one) and "hints needed".
- Phase 4: more roles, human interviewers checking the Evaluator, more coding languages.
- Live checks of the 2a voice flow (~$0.10) and the 2b prompt wording (a few cents) never ran.
- Known limits: the Evaluator has not been checked against human interviewers; the
  question bank has not been reviewed by working interviewers.

## 7. Rules for whoever works on this next

- Never run anything that costs money (Claude/Bedrock, Tavus, ElevenLabs, Deepgram, AWS
  resources) without asking Karthik first with a cost estimate. Mocked tests are free.
  An unasked eval loop cost about $40 in Oct 2026.
- `backend/.env` and `.env.local` hold live keys: never print or commit them.
- Never push to main: branch, PR, Karthik merges. Conventional commits, author Karthik, no
  mention of AI in commits or PRs.
- Plain words, no em dashes, no emojis.
- Keep `anthropic==1.4.0` pinned in both `deploy/requirements-lambda.txt` and
  `backend/pyproject.toml` (2.x breaks Bedrock temperature). After any deploy, read the
  CloudWatch logs.
- More detail: `CLAUDE.md`, `docs/OVERVIEW.md`, `docs/PROJECT-HISTORY.md`, `docs/ROADMAP.md`,
  `docs/TODO.md`.
