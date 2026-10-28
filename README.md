# Crucible

AI mock interview platform with a real-time video avatar interviewer, a six-agent reasoning pipeline, resume/JD-driven personalization, and cross-session memory that reshapes future interviews around your actual weak spots.

**Live app:** https://dvbk879zy1q2l.cloudfront.net

Most AI mock interviewers forget you between sessions. This one doesn't — and it pushes back on vague answers instead of saying "great answer."

- **It remembers.** A dedicated Memory Agent aggregates weaknesses across every session and feeds them straight into the next session's question plan — not a score trend line, an actual change in what gets asked.
- **It pushes back.** The Interviewer Agent is instructed to never accept a vague answer, probes with "why" and "how," and is banned from saying "great answer" unless the response actually meets the rubric.
- **It asks what a real interviewer would ask.** A curated bank of 63 questions (software and AI engineering; behavioral, technical, system design; junior → senior), each with the signal it tests, strong- and weak-answer anchors, and a follow-up ladder from shallow to deep. The Planner picks and personalizes from it; the Interviewer climbs the ladder; the Evaluator scores against the anchors. No public dataset has graded interview answers with rubrics, so the anchors and ladders are written, not scraped — sources and licenses in `backend/data/question_bank/ATTRIBUTION.md`. Read a full live interview: [`docs/sample-interview-2026-10-27.md`](docs/sample-interview-2026-10-27.md).
- **It's measured, not vibes.** A 48-case golden-dataset eval (28 regression, 12 adversarial, 8 injection/junk input) against the real agents on live Bedrock calls: **100% (48/48) on the Interviewer's decisions, 100% (20/20) on the Evaluator's survival verdict in the latest run** (one known boundary case has flipped ~1 in 5 runs), **0% of interview lines leak a judgment** ("great", "solid"…) — verdicts stay with the Evaluator — and two-part follow-ups are tracked as a watch metric (~14%). 490+ backend tests. Details below.

Every evaluated answer gets a `wouldSurviveRealInterview` verdict with reasoning — a sharper, more honest signal than a 1–10 score, and what this product leads with instead of a numeric grade.

## Architecture

The avatar and voice make a session feel real, but the reasoning underneath is the point. Six agents orchestrated with LangGraph, each with exactly one job:

| Agent | Responsibility |
|---|---|
| **Intake** | Parses resume + job description into a structured profile (skills, experience, project depth, resume-to-JD gaps). Structured output only, never free text. |
| **Planner** | Builds the session the way a real loop runs (full mock: 1 behavioral, 2 technical, 1 system-design problem) by choosing from the curated question bank and personalizing each question to the résumé, weighting weak areas from prior sessions higher. Runs once per session. |
| **Interviewer** | Holds live session state, asks questions, and decides in real time whether to follow up, push back, or advance — never passively accepts a vague answer. |
| **Evaluator** | Scores each answer against a rubric (STAR for behavioral, correctness/complexity/edge-cases for technical) and outputs a `wouldSurviveRealInterview` verdict with reasoning. |
| **Memory** | A retrieval/write layer, not a chat agent. Aggregates evaluations into a persistent profile of recurring weaknesses, strengths, and improvement trend that the Planner reads at the start of every future session. |
| **Coach** | Reworks a candidate's own weak answer into a model answer grounded in their actual content — an on-demand complement to live evaluation. |

Every agent's output is validated against a Pydantic schema before it's passed to the next stage; no raw LLM text crosses an agent boundary.

## Why this exists

I was using Claude's and ChatGPT's voice mode to practice for interviews. No matter what I said, it kept telling me "that's great," "you're acing it." It felt good in the moment, but it was building a false sense of confidence — the kind that falls apart the second a real interviewer pushes back on a vague answer instead of validating it.

That gap is the whole reason this exists: practice that only ever agrees with you isn't practice. After looking at what existing competitors in this space (Revarta, OphyAI, Final Round AI, HireMindPro, and others) actually ship, almost none of them do the two things above — remember you, or push back — so I built around exactly those two gaps.

## Engineering depth

Things here that go beyond a demo wrapper around an LLM call:

- **Structured output is enforced, not hoped for.** Every agent call routes through a single choke point (`backend/llm/client.py`) that parses and validates the response against a Pydantic schema, with retry-on-parse-failure and retry-on-schema-failure — not a bare try/except. No raw LLM text is ever passed between agents or to the frontend.
- **Prompts are constrained to testable behavior, not vibes.** The Interviewer's prompt bans specific validating phrases outright ("great answer," "interesting"), defines concrete vagueness criteria per question type, and caps a progressive follow-up arc — STAR-based for behavioral, "can we do better" for technical, scope-then-tradeoffs for system design.
- **The pipeline is tested at three separate layers**: per-agent unit tests (a fake LLM verifying plumbing), LangGraph-level tests (verifying state transitions with scripted decisions), and an end-to-end suite that asserts on the *actual prompt text* the Planner receives after a prior session — proving the cross-session memory loop changes what gets asked, not just that the code paths exist.
- **A gated eval harness with golden datasets** (`backend/evals/`) regression-tests judgment quality — vague-vs-strong answers, two-session memory aggregation — skipped by default since real runs cost Bedrock tokens, triggered explicitly via `INTERVIEWAI_RUN_LLM_EVALS=1`.
- **A measured accuracy benchmark, not a vibes check.** `backend/evals/run_accuracy_eval.py` runs the real Interviewer and Evaluator agents (real Bedrock calls, no mocking) against 35 hand-labeled cases — 23 covering the core decision rules plus 12 deliberately adversarial ones designed to find weak spots (buzzword-padded system design answers, length-biased rambling, subtly wrong Big-O claims buried in a fluent explanation, ownership decoys, implausible metrics). Result: **100% (35/35) on the Interviewer's follow-up/advance/complete decision**, and **93% (14/15) on the Evaluator's `wouldSurviveRealInterview` verdict**, which is only labelled on the 15 cases where survival is unambiguous. Three cases initially looked like failures; inspecting the actual model reasoning showed the agents were right and my own golden labels were wrong (e.g. the Interviewer directly named a merge-sort complexity error — *"how many levels of merging are there, and how does that affect the overall complexity?"* — that my label had assumed it would miss), and the one Evaluator miss is a documented boundary condition whose verdict flips run to run (~1-in-5), confirmed by a 5-rep spot-check rather than guessed at. Re-run on 2026-10-25 after the conversational interviewer rewrite: 43/43 decisions, 17/17 verdicts, 0/43 judgment leaks. Four labels were changed in that run, each with a `note` in the golden file: strong system-design answers now get one deep-dive probe (what a real system-design round does, and what CLAUDE.md requires), and a candidate who calls BFS "depth-first" gets asked about it instead of passed over silently. Re-run on 2026-10-27 after the interview-structure rewrite (at least one probe per question, per-type follow-up budget, five-rung hint ladder, wrong-answer and rehearsed-story probes): 48/48 decisions, 20/20 verdicts, 0% judgment leaks. Fifteen labels changed in that rewrite — most were written for the old cap of two follow-ups — and every one carries a `note`. Full results and reasoning notes: `backend/evals/results/` and the corrected golden files; pipeline diagram: `docs/diagrams/05-eval-pipeline.mmd`.
- **Deliberate cost/latency tiering, not "call the biggest model everywhere."** Haiku handles structured extraction (Intake, Memory); Sonnet is reserved for the agents that actually carry the product's judgment (Planner, Interviewer, Evaluator, Coach) — enforced by a test asserting Opus is never a default anywhere in config.
- **Every optional integration degrades gracefully.** Tavus, auth, and the persistence backend are all feature-flagged; the app is fully demoable with zero AWS credentials via a local mock engine, and falls back to a stylized avatar if no Tavus key is configured — the video layer was built to never block the agent logic underneath it.

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, Zustand, React Router
- **Backend:** FastAPI on AWS Lambda (Mangum), LangGraph for agent orchestration
- **Model:** Claude on Amazon Bedrock (Sonnet for reasoning-heavy agents, Haiku for structured extraction)
- **Persistence:** DynamoDB (session state, cross-session memory profiles)
- **Auth:** AWS Cognito
- **Video avatar:** Tavus (via Daily.co WebRTC), optional and gated — the app degrades gracefully to a stylized avatar if unconfigured
- **Voice:** ElevenLabs text-to-speech (Flash v2.5, "Chris" voice) via the backend's `/api/tts` — the key stays server-side — with the browser's built-in voice as fallback; browser-native Speech Recognition for the candidate, hands-free turn-taking in voice mode
- **Infra:** API Gateway, S3 + CloudFront for the static frontend, deployed via plain shell scripts (no Terraform/CDK)

## Project structure

```
src/
  components/   Pure UI components
  hooks/        External API integration hooks (Tavus, speech, PDF)
  lib/          API client, auth wrapper, mock engine
  types/        Shared TypeScript contracts, mirrors backend Pydantic models
  pages/        Route-level screens
  stores/       Zustand stores

backend/
  agents/       intake.py, planner.py, interviewer.py, evaluator.py, memory.py, coach.py
  graph/        LangGraph wiring for session start, live turns, and session end
  models/       Pydantic schemas
  routes/       FastAPI route handlers
  prompts/      One versioned system prompt per agent
  store/        Pluggable persistence (in-memory for tests, DynamoDB in production)

deploy/         Shell scripts for IAM setup, Cognito, Lambda packaging, and deployment
docs/           Architecture specs and diagrams
```

## Running locally

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill in AWS/Bedrock credentials
uvicorn app:app --reload
```

**Frontend**

```bash
npm install
npm run dev
```

By default the frontend runs against a local mock engine (`VITE_USE_MOCK`) so the UI is demoable without any backend or AWS credentials. Set `VITE_USE_MOCK=false` and `VITE_API_BASE` to exercise the real agent pipeline.

## Testing

```bash
cd backend && pytest            # unit, graph, and end-to-end tests
npm test                        # frontend unit tests
```

Evaluation harnesses that make real LLM calls (`backend/evals/`) are gated behind `INTERVIEWAI_RUN_LLM_EVALS=1` since they incur Bedrock cost; they cover judgment-quality checks like vague-vs-strong answers and two-session memory aggregation.

## Deployment

The app is deployed serverlessly on AWS: CloudFront + S3 for the frontend, API Gateway + a single Lambda for the backend, DynamoDB for state, Bedrock for inference. See [deploy/README.md](deploy/README.md) for the full setup and deploy scripts.
