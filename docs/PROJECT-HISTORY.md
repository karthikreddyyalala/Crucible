# Crucible: what happened, from the start

A plain record of what was built, in what order, what went wrong and what's next.
Day-to-day status is in [TODO.md](TODO.md); the phase plan is in [ROADMAP.md](ROADMAP.md).
Last updated 2026-10-29, after PR #11 and the Phase 2a branch.

## The product in one paragraph

Crucible is an AI mock interviewer. You paste your resume and a job description, pick a
mode, level and company style, and Marcus interviews you by voice or text. He asks one
question at a time and digs into vague answers instead of praising them. Each answer
gets a plain verdict: would it survive a real interviewer, and why. A memory agent
remembers your weak spots, so the next session gets harder exactly where you're weak.
Live at https://dvbk879zy1q2l.cloudfront.net.

## How it works

Six agents, each with one job, wired with LangGraph. Every output is checked against a
schema before the next agent sees it.

| Agent | Job | Model, temperature |
|---|---|---|
| Intake | Resume + JD into a profile and the gaps between them | Haiku 4.5, 0 |
| Planner | Picks the session's questions from the bank, weighted by past weak spots | Sonnet 4.6, 0 |
| Interviewer (Marcus) | Runs each turn: follow up, hint, clarify, advance or complete | Sonnet 4.6, 0.3 |
| Evaluator | Rubric scores, weakness tags, `wouldSurviveRealInterview` + reasoning | Sonnet 4.6, 0 |
| Memory | Turns a session's results into recurring weaknesses for next time | Haiku 4.5, 0 |
| Coach | On request, a strong version of your answer (and clean code for coding) | Sonnet 4.6 |

Stack: React + TypeScript + Vite + Tailwind + Zustand, FastAPI on AWS Lambda, Claude on
Bedrock, DynamoDB, Cognito, ElevenLabs voice ("Chris", Flash v2.5) through the backend,
Deepgram (Flux, falling back to Nova-3, then the browser) for the candidate's speech, Tavus video avatar behind a flag, Pyodide +
CodeMirror for the coding round, Playwright for browser tests.

## The conversation flow

1. Warmup: Marcus greets you, reacts to how you say you're doing, describes the session.
2. Background: a short "tell me about yourself", not scored.
3. Questions, one at a time. After each answer Marcus probes at least once ("what did you
   do?", "what happens when that fails?"). "I don't know" gets a smaller hint, never the
   answer. "Can you repeat that?" gets a rephrase and doesn't count as a follow-up.
4. Coding questions run like a real coding interview: explain the approach and its
   complexity first, then code quietly (one check-in after about three minutes of
   silence; a failing run is yours to debug), then Submit runs hidden tests and Marcus
   reviews: failures, complexity, an edge case, a variant. On a phone there's no editor,
   so you talk the code through.
5. Closing: you ask him questions, he wraps up.
6. Results: verdict and reasoning per answer, weak spots, the coach on request.

Abuse: first time "Let's keep this professional", second time a warning, third time the
interview ends. Casual swearing is fine. Slurs and sexual content never reach the model.

A full mock is 1 behavioral, 1 coding, 1 technical, 1 system design.

## Timeline

### Before 2026-10-25: the base
Five-agent pipeline, cross-session memory in DynamoDB, Cognito login, deployed on AWS
(S3 + CloudFront frontend, Lambda + API Gateway backend). Account `557690618983`,
region `us-west-2`, AWS CLI profile `crucible`.

### 2026-10-25: PR #1, a real interview conversation
Marcus rewritten to talk like a person: interview stages (warmup, background, questions,
closing), a spoken reply each turn, a "clarify" action, graduated hints, no praise.
ElevenLabs replaced Kokoro (Kokoro froze the browser and was removed). Live eval 43/43,
0% spoken judgments.

### 2026-10-26 to 10-28: PRs #2, #3, #4, the question bank
- 111 curated questions (software and AI engineering; behavioral, technical, system
  design; junior to senior), each with what it tests, strong and weak answer signs, and
  a follow-up ladder. A full mock is shaped like a real loop.
- Hands-free voice: smarter pause detection and a send progress bar.
- Research on which questions are asked most (`docs/research/`), classics preferred.
- README rewritten in plain language.
- PR #2 merged into the wrong base by mistake; PR #3 brought it to main.

### 2026-10-28: PR #5, Phase 1
Planned with a spec and a wave plan, built with parallel agents, reviewed, tested live.
- Coding round: all 75 Blind 75 problems in our own words (19 easy, 49 medium, 7 hard),
  Python in the browser, one shared test harness used by both the browser and the
  backend tests, so every reference solution is proven against every test.
- Company styles: General, Amazon, Google, Meta, Microsoft, Startup.
- Safety: moderation before the model, three-strike conduct rule, untrusted-input fences.
- Consistency: temperature 0 for scoring agents, 0.3 for Marcus.
- Coach shows clean code only for a finished session (checked on the server).
- Editor lazy-loaded: main bundle 1,142 kB to 668 kB.

### 2026-10-28: PRs #6 to #11, voice, video and a live-site fix
- PR #6: this history and the docs.
- PR #7: video and voice fixes. Tavus counts as ready only when the replica's video
  arrives; after 25 s it falls back to voice with a notice; the paid call ends on tab close.
  Long spoken answers keep their start. Fewer dashes in Marcus's lines.
- PR #8: live transcription with Deepgram Nova-3 (30-second tokens minted by the backend,
  interview keyterms plus the candidate's skills), falling back to the browser recognizer.
- PR #9: eval results summary and the new-chat prompt.
- PR #10: the live site failed on Begin interview: the Lambda had anthropic 2.3, which
  Bedrock rejects. Pinned to 1.4.0 in both the Lambda and the backend, with a test.
- PR #11: clear error messages, fail fast on rejected model calls, no em dashes on screen.

### 2026-10-29: Phase 2a, conversation feel (branch `feat/phase-2a-voice-turns`)
Phase 2 split into 2a to 2d. 2a, built with parallel workers and reviewed:
- Deepgram Flux decides when you've finished a thought, so a pause to think doesn't send
  the answer. Nova-3 and the browser recognizer stay as fallbacks with the old timer.
- A quick "Mm-hm" in Marcus's voice right after a spoken answer, while he thinks.
- Interrupting: on Flux the mic stays open while he talks; two or more new words that
  aren't fillers or his own words stop him.
- All tested with mocks ($0). Live check and the clip recording wait for Karthik's OK.

## Bugs worth remembering

- **Every real AI call would have failed.** The installed Anthropic SDK has no
  `temperature` argument; fake clients in tests accepted anything. Fixed by sending it in
  `extra_body`, plus a test that checks our call against the real SDK signature.
- **ReDoS in moderation** (a slow regex on long input). Fixed with simple tokenizing and a
  10,000 character cap.
- **Real names flagged as abuse** (e.g. "Dyke", "Bonner"). Fixed with allow-lists; a
  flagged name is never an error, Marcus just doesn't say it.
- **Strike bypass** by typing a fake "Q:" line. Fixed by screening every segment.
- **Lambda would have shipped without the safety module.** Added to the build, plus a test.
- **Pyodide null bug**: passing JS `null` into Python crashed one test mode. Fixed by
  passing JSON.
- **Marcus asked two things at once** in ~1 in 8 follow-ups. Prompt rules weren't
  enough; a small guard in `agents/interviewer.py` now cuts the second ask.
- **Marcus hinted at the bug** while the candidate was still debugging. Found in the live
  end-to-end run, fixed, eval case added.
- **Browser tests failed on a cold start**: the dev server reloaded every page when it
  first found the lazy editor. Fixed with `optimizeDeps.include` in `vite.config.ts`.

## How it's tested

- Backend: 1,573 pytest tests. Frontend: 226 vitest tests. Browser: 8 Playwright tests
  against demo mode (`npm run test:e2e`).
- Live evals (`backend/evals/`): 76 hand-labeled cases, each run 3 times on Sonnet 4.6.
  Final run: 76/76 right decisions, 34/34 survival verdicts, identical across runs.
  Details: [evals-phase-1.md](evals-phase-1.md).
- Live end-to-end coding interview: [sample-coding-interview-2026-10-28.md](sample-coding-interview-2026-10-28.md),
  reproducible with `backend/evals/live_coding_interview.py` (about $0.35).

## Costs

- Idle hosting: about $0 to $2 a month. One interview: about $0.12 to $0.30 in Bedrock.
- Phase 1 testing on 2026-10-28: roughly $15 to $20 of Bedrock in total.
- Budget alert `crucible-monthly` ($10). ASU Sun Devil Hacks credits: couldn't verify
  from here (no billing access on the deploy role). Check Billing > Credits in the console.

## Known gaps

- Small wording slips, no wrong decisions: small-talk praise on off-topic answers ("that's
  a good hobby"), occasional praise when moving on ("that's the right move"), two-part
  questions in Spanish.
- No human interviewer has reviewed the questions, rubrics or coding problems yet.
- Flux auth and keyterms on /v2 are not yet confirmed live; the fallback covers a rejection.
- Barge-in can misfire if speaker echo is misheard as new words; not yet tested live.

## Next

1. **Now:** redeploy backend and frontend so the live site has Phase 1
   (commands in [deploy/README.md](../deploy/README.md)). Then try a coding interview yourself.
2. **Phase 2, feels like a person** (needs a Deepgram account and API key):
   Deepgram Flux streaming speech-to-text with real end-of-turn detection, instant
   "mm-hm" while Marcus thinks, barge-in (interrupt him), Tavus avatar using the same
   ElevenLabs voice, JavaScript in the coding round.
3. **Small fixes:** an LLM judge in the evals to catch praise the regex misses; tighten
   the off-topic small talk.
4. **Phase 3, shows you're improving:** progress dashboard from Memory, answer replay next
   to a strong answer, coding history.
5. **Phase 4, more people:** more roles; 2 to 3 real interviewers review the bank and
   blind-score answers to check the Evaluator.

## Working rules (from CLAUDE.md and Karthik)

- Never push to main. Work on a branch, open a PR; Karthik merges.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), author Karthik, never
  mention AI or Claude in commits or PRs, no co-author trailers.
- Document everything in files and keep TODO.md current.
- Plain, human writing in docs and the README; no em dashes in README prose.
- Marcus's prompt must stay strict: push back, never "great answer".
