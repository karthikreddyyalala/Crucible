# Prompt for a new chat (Phase 2)

Copy everything inside the box below into a new Claude Code chat opened in this repo.

```text
I'm Karthik. We're continuing work on Crucible, my AI mock interviewer (repo
karthikreddyyalala/Crucible, live at https://dvbk879zy1q2l.cloudfront.net). Before doing
anything, read these files so you have the full context:

1. CLAUDE.md: product goals, agent architecture, data contracts, code style, git rules.
2. docs/PROJECT-HISTORY.md: everything built so far, the bugs we hit, costs, known gaps.
3. docs/TODO.md: the live to-do list.
4. docs/ROADMAP.md: phases 1 to 4.
5. docs/EVAL-RESULTS.md: every live eval run, final numbers, and what they cost.
6. docs/evals-phase-1.md: detailed Phase 1 eval results and open wording issues.

COST RULE, READ THIS FIRST. In October about $40 went on Claude (Bedrock) because live
eval rounds (41 runs, 1,136 Sonnet calls, every case x3, versions v1 to v4) were run
without asking me. My AWS promo credit does not cover Claude. This must never happen again:
- Never run anything that costs real money without asking me first and giving an estimated
  cost ("about 100 Haiku calls, about $0.30, OK?"). Wait for my yes.
- That covers: live evals or scripts against Bedrock/Claude, local backend sessions with real
  keys, live tests with Tavus (about $0.37 a minute), ElevenLabs or Deepgram, and creating or
  changing anything in AWS.
- Default to mocked tests (pytest, vitest, Playwright demo mode); they cost $0.
- If a live check is truly needed: smallest batch first (10 to 15 cases), Haiku before
  Sonnet, no x3 repeats unless I agree, and tell me the actual cost afterwards.
- Don't touch AWS billing or support; I'm handling that myself.
- One real interview costs about $0.50 to $0.80 in Claude; a video interview adds Tavus.

Where we are (all merged to main):
- PR #5, Phase 1: coding round with all 75 Blind 75 problems in Python in the browser
  (Pyodide in a Web Worker, CodeMirror), company styles (General, Amazon, Google, Meta,
  Microsoft, Startup), three-strike conduct rule, temperature 0 for scoring agents and 0.3
  for Marcus.
- PR #6: project history and docs.
- PR #7: video and voice fixes. Tavus is "ready" only when the replica's video arrives, a 25 s
  timeout falls back to voice with a notice, one conversation per activation, the paid call
  ends on tab close (pagehide), and voice-only mode never starts Tavus. Chrome speech
  recognition no longer drops the start of long answers.
  Fewer em dashes in Marcus's speech (code post-processing in backend/agents/interviewer.py).
- PR #8: live transcription with Deepgram Nova-3 streaming. The backend mints 30-second
  tokens at POST /api/stt/token (key stays server side in .env.local as DEEPGRAM_API_KEY,
  never print or commit it); the browser connects with the ["bearer", token] subprotocol,
  with interview keyterms plus the candidate's resume skills; falls back to the browser
  recognizer if Deepgram can't start. Hooks: src/hooks/useDeepgramSTT.ts,
  useSpeechInput.ts, useSpeechRecognition.ts, useTavus.ts.
- PR #9: docs/EVAL-RESULTS.md (eval summary, resume bullets) and this prompt.
- Tests: backend pytest about 1,578 passed / 37 skipped, frontend vitest 241, Playwright 8
  (npm run test:e2e). Live evals (final): 76/76 decisions, 34/34 survival verdicts.
- Deploy: deploy/README.md. AWS account 557690618983, region us-west-2, CLI profile
  "crucible". Deploys need CRUCIBLE_COGNITO_USER_POOL_ID and CRUCIBLE_COGNITO_CLIENT_ID in
  the shell (copied from the live Lambda's env). I deploy myself.
- Local backend on macOS needs SSL_CERT_FILE=$(python3 -m certifi).

Phase 2, "feels like a person". In rough priority order:
1. Smarter end of turn: Deepgram Flux (or similar) so Marcus knows when I've finished a
   thought, instead of waiting about 2.8 s of silence.
2. Instant backchannel ("Mm-hm") while the reply is generated, and barge-in (I can
   interrupt Marcus mid-sentence).
3. Skip questions I've already answered (in a live test Marcus asked for my background
   right after I gave it in the warmup).
4. Transcription accuracy pass: when I finish an answer, re-check the recording with
   Deepgram's pre-recorded mode to fix misheard words ("p99" heard as "page 99"). Never
   rewrite or tidy my wording; Marcus grades what I actually said.
5. Key points of each of my answers in the end-of-session report (Fireflies-style notes),
   next to Marcus's verdict. Grading still uses my real words.
6. Tavus avatar speaking with the same ElevenLabs voice ("Chris").
7. JavaScript in the coding round.
Small follow-ups: an LLM judge in the evals for praise the regex misses (cheap model, ask
first), less small-talk praise on off-topic answers.

How I want you to work:
- Never push to main. Branch, open a PR, I merge. After a PR is merged, put new work on a
  new branch and a new PR.
- Conventional commits, author Karthik, never mention AI or Claude in commits or PRs, no
  co-author lines.
- Plan first (spec + plan in docs/superpowers/), then build.
- Test everything with mocked tests; live checks only per the cost rule above. Tell me
  honestly what failed.
- Document everything and keep docs/TODO.md, docs/PROJECT-HISTORY.md and
  docs/EVAL-RESULTS.md current.
- Explain things to me in simple words. No em dashes in anything Marcus says.

Start by reading those files, then tell me in a few lines what you understood and what
you'd do first for Phase 2, with the estimated cost of anything that isn't free.
```
