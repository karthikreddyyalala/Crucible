# Crucible

A mock interviewer that talks with you, pushes back on vague answers, and remembers your weak spots for the next session.

Live app: https://dvbk879zy1q2l.cloudfront.net

## Why I built this

I practiced interviews with AI voice modes, and every answer got "that's great." A real interviewer would have stopped me and asked what I actually did. So I built one that does.

The interviewer is called Marcus. He asks one question at a time and follows up on what you said. If you say "we shipped it on time," he asks what you did. If you say "I don't know," he gives you a smaller version of the problem. He never says "great answer." Scoring happens after the interview, like a real one.

Full sample sessions: [system design](docs/sample-interview-2026-10-27.md), [coding](docs/sample-coding-interview-2026-10-28.md).

## What it does

- **Remembers you.** After each session it records your repeated weak spots (no edge cases, vague impact, "we" instead of "I"). The next session targets them.
- **Pushes back.** Every answer gets at least one follow-up. A confidently wrong answer gets a question about the case that breaks it, not a pass.
- **Real questions.** 111 questions for software and AI engineering roles: behavioral, technical and system design, junior to senior. The most commonly asked ones come first.
- **Coding round.** Blind 75 style problems in Python or JavaScript, with tests that run in your browser. You explain your approach first, code while Marcus stays quiet, then review the result together.
- **Honest verdict.** Each answer gets "would this survive a real interview?" with the reason, one thing that worked, and one thing to fix. Not a 1 to 10 score.
- **Voice.** Marcus speaks (ElevenLabs) and you talk back. It waits for you to finish a thought instead of cutting you off at a pause, and you can interrupt him.
- **Company styles.** General, Amazon, Google, Meta, Microsoft or Startup. Based on public interview guides, not inside information.
- **Stays professional.** Abuse gets a warning, then the session ends. Text that tries to instruct the model is treated as an answer, not an instruction.

## How it works

Six agents, each with one job, connected with LangGraph. Every output is checked against a schema before the next agent uses it.

| Agent | Job |
|---|---|
| Intake | Compares your resume to the job description and finds the gaps |
| Planner | Picks this session's questions, weighted toward your past weak spots |
| Interviewer | Marcus. Runs the conversation and decides when to dig, hint or move on |
| Evaluator | Scores each answer and gives the "would survive" verdict |
| Memory | Turns each session into a profile of your recurring weaknesses |
| Coach | After the session, rewrites a weak answer into a strong one using your own example |

## How I tested it

- **76 labeled eval cases** (normal answers, wrong answers, attacks, coding moments), each run 3 times on Claude Sonnet. Marcus made the right call in 76 of 76, and the verdict was right in 34 of 34.
- **Full simulated interviews.** A second model plays 8 kinds of students (nervous, vague, confidently wrong and others), and a judge scores whether Marcus sounds like a real interviewer. This found him repeating answers back and letting wrong claims slide. Both are fixed and measured: [docs/evals-human-feel.md](docs/evals-human-feel.md).
- **Over 2,000 automated tests:** about 1,650 backend, 500 frontend, and browser tests that run whole sessions.

Not everything went my way. Giving Marcus private notes on each question did not measurably improve his first follow-up (11 of 24 with notes, 14 of 24 without). The rubrics have not yet been reviewed by human interviewers. All results are in `backend/evals/results/`.

## Built with

- Frontend: React, TypeScript, Vite, Tailwind, Zustand
- Backend: FastAPI on AWS Lambda, LangGraph
- Models: Claude on Amazon Bedrock (Sonnet for judgment, Haiku for extraction)
- Coding: Pyodide and a JavaScript worker in the browser, CodeMirror editor
- Voice: ElevenLabs for Marcus, Deepgram or browser speech recognition for you
- Video (optional): Tavus avatar, with a simple animated avatar as fallback
- Data and auth: DynamoDB, Cognito. Hosting: S3, CloudFront, API Gateway

## Run it locally

The frontend runs in demo mode by default, with no backend or AWS account needed:

```bash
npm install
npm run dev
```

To use the real agents, start the backend and set `VITE_USE_MOCK=false` and `VITE_API_BASE`:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # add your AWS / Bedrock settings
uvicorn app:app --reload
```

## Tests

```bash
cd backend && pytest   # backend
npm test               # frontend
npm run test:e2e       # browser tests (first run: npx playwright install chromium)
```

Live-model evals cost money, so they are off by default. Turn them on with `INTERVIEWAI_RUN_LLM_EVALS=1`.

## Project layout

```
src/        React app: components, hooks, pages, stores, shared types
backend/    agents, prompts, question bank, schemas, routes, evals
deploy/     AWS setup and deploy scripts (see deploy/README.md)
docs/       research, plans, sample interviews
```
