# Crucible — Working To-Do

Living list. Updated as work happens; newest decisions at the bottom of each section.
Status: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` dropped (with reason)

## Done — Question quality (branch `feat/question-bank`, merged)

Goal: every question Marcus asks is one a strong real interviewer would ask, with
planned follow-up depth and fair, calibrated scoring.

- [x] Research: how open-source AI interviewers and real interviewers run each round
      → `docs/research/interviewer-prompts-and-flow.md`
- [x] Research: question sources, datasets, licenses, canonical system-design problems
      → `docs/research/question-sources-and-datasets.md`
- [x] Implementation plan → `docs/superpowers/plans/2026-10-27-question-bank.md`
- [x] Question bank data model (extend the unused `QuestionExemplar`) + loader — TDD
      (Tasks 1–3, reviewed twice; review caught 2-part prompts + missing content tests)
- [x] Question bank content: SDE — 32 questions (behavioral / technical / system design, all levels)
- [x] Question bank content: AI Engineer — 31 questions
      (reviewed: 18 level/difficulty fixes, neutral first rungs, no spoilers, 2 duplicates replaced)
- [x] Planner picks from the bank and personalizes (keeps memory weighting) — TDD
      (only ids from the session's own bank survive; round shape 1 beh / 2 tech / 1 SD)
- [x] Interviewer gets the question's follow-up ladder as private notes — TDD
- [x] Evaluator gets the question's rubric anchors for calibration — TDD
- [x] Interview structure + prompt changes from research (plan Task 8: round shape,
      no give-away requirements, per-type follow-up budgets, ≥1 probe, 5-rung hints,
      wrong-answer branch, behavioral probes, stricter survival)
- [x] Live eval run, results recorded: 48/48 decisions, 20/20 verdicts, 0% leaks
- [x] Live end-to-end interview run; transcript in docs/sample-interview-2026-10-27.md
      (fixed: interviewer was adding asks/hints to new questions and verdicts to transitions)
- [x] Docs: README updated with what changed and measured results

Measured (2026-10-27, live): 48/48 interviewer decisions, 20/20 survival verdicts, 0%
judgment leaks, 12.5% two-part follow-ups (watch metric — mostly natural pairs).

Decisions (2026-10-27): no public dataset has graded answers with rubrics for SWE/AI
interviews and the open HF "interview" sets are private or scraped — we write rubric anchors
and ladders ourselves; stems only from MIT / CC BY sources, with a `source` field and
ATTRIBUTION.md. See docs/research/question-sources-and-datasets.md.

## Done — Most-asked questions (branch `feat/most-asked-questions`)

- [x] Research: which questions recur across the most prep guides and candidate reports
      → `docs/research/most-asked-questions.md` (counts are approximate)
- [x] 40 new questions (bank now 111: SDE 63, AI 48), tagged very_common / common / occasional
- [x] Planner includes at least 2 very_common questions per session
- [x] README rewritten in plain language with a real interview excerpt
- [ ] Gaps: strengths/weaknesses, Google Docs, message queue, backend security,
      tokenization/context windows, RLHF

## Now — Phase 1 (branch `feat/phase-1`)

Spec: docs/superpowers/specs/2026-10-28-phase-1-design.md · Plan: docs/superpowers/plans/2026-10-28-phase-1.md
Roadmap for all phases: docs/ROADMAP.md

- [x] Design agreed (Python in the browser, Blind 75, coding mode + 1 coding question in full
      mocks, real-interviewer coding flow, warn → warn → end, company styles, low temperatures)
- [x] Wave 1: moderation · temperatures + repeat agreement · coding schema/harness · company styles
      (review: moderation false positives 30/86 → 2/86, missed abuse 31/41 → 0/41, slow inputs fixed;
      real names never block; only the latest reply is moderated)
- [x] Wave 2: all 75 Blind 75 problems (19 easy / 49 medium / 7 hard; reference solution passes
      every test, starter fails, common wrong solutions fail) · Python runner (Pyodide 314.0.7,
      verified in Chromium) · backend integration (strikes, coding notes, company styles)
- [x] Wave 3: session flow + setup (strikes, queued submits, refresh-safe) · coding workspace UI
      (CodeMirror, Run/Submit, every runner state, 3 dividers, mobile notice) · Playwright e2e
      (8 tests, 3 clean runs + 32/32 stress, `npm run test:e2e`)
- [x] Live evals (5 suites × 3 runs): 74/74 decisions, 34/34 survival verdicts, survival verdict
      identical across runs; found an SDK bug that would have failed every real call (fixed, guarded)
- [x] Final whole-branch review: no critical issues; must-fixes in progress (strike bypass via a
      typed "Q:" line, phone talk-through stage, topic chips, lazy editor, planner ids, coach gate,
      evaluator transcript echo, seeded variety) + 6 spoken-line fixes from the evals
- [x] Review fixes landed (strike bypass, talk stage, topic chips, lazy editor 1,142 → 668 kB,
      planner ids, coach gate + candidate id, evaluator transcript, seeded variety)
- [x] One ask per follow-up enforced in code; "take your time" on a failing run; no invented
      question count in the warmup
- [x] Final live evals (v4): 76/76 decisions, 34/34 survival verdicts (docs/evals-phase-1.md)
- [x] Live end-to-end coding interview saved (docs/sample-coding-interview-2026-10-28.md)
- [x] README updated · PR #5 merged 2026-10-28
- [x] Redeploy backend + frontend so the live site has Phase 1 (live with PRs #10 and #11)
- [x] Video interview fixed and verified live (avatar in ~4 s, falls back to voice after 25 s,
      no leaked calls; Tavus plan allows very few concurrent conversations)
- [x] Long spoken answers keep their start; Marcus's lines have no dashes
- [x] Deepgram transcription built (30-second tokens, browser fallback), PR #7
- [ ] Karthik: Deepgram key with the **Member** role in .env.local (current key can stream
      but can't mint browser tokens: 403), then verify live and redeploy
- [x] Full history in docs/PROJECT-HISTORY.md; new-chat prompt in docs/NEW-CHAT-PROMPT.md
- [ ] Wording left: small-talk praise on off-topic answers, praise in advance/closing lines
      the regex misses (needs an LLM judge), Spanish two-part questions

Found while planning: every agent was running at the default temperature (1.0), scoring
included. Phase 1 sets 0 for scoring/planning/extraction and 0.3 for Marcus.

## Now — Phase 2a, conversation feel (branch `feat/phase-2a-voice-turns`)

Spec: docs/superpowers/specs/2026-10-28-phase-2a-voice-turns-design.md · Plan: docs/superpowers/plans/2026-10-28-phase-2a-voice-turns.md

- [x] Deepgram Flux end of turn: the answer sends when Flux hears you finish; Nova-3 and
      then the browser recognizer (with the old silence timer) are the fallbacks
- [x] "Mm-hm" / "Mm" / "Right" clip right after a spoken answer, questions stage only,
      voice-only mode (clips load from public/backchannel/)
- [x] Barge-in on Flux: mic stays open while Marcus talks; 2+ new non-filler words stop him
- [x] Mocked tests: vitest, pytest for the clip script, Playwright 8/8 (all $0)
- [x] Made the 3 clips (`cd backend && python -m cli.make_backchannel_clips`), 2026-10-29.
      About 20 characters on the Creator plan's monthly allowance, no extra charge
- [ ] Karthik OK: ~10 min live voice check (about $0.10 Deepgram, plus Marcus's Claude calls
      if run against the real backend). Confirms Flux accepts our browser token and keyterms
      on /v2, and that Marcus's own voice through speakers never stops him
- [ ] Watch: echo through speakers mishears as new words (false stop); his echoed words can
      show in the draft until the candidate speaks
- [ ] Status line still says "JUST PAUSE WHEN YOU'RE DONE" on Flux; fine, revisit in copy pass

## Next — rest of Phase 2

- [x] 2b: Marcus builds on earlier answers instead of re-asking (no hard skip, so every
      question is still scored); key points of each answer under the verdict (PR, $0 mocked)
- [ ] 2b live check of the new prompt wording (a few cents of Claude; Karthik: not for now)
- [ ] 2c: re-check each answer with Deepgram pre-recorded mode to fix misheard words
- [ ] 2d: Tavus persona uses ElevenLabs "Chris": no code, a Tavus dashboard setting (Karthik).
      PAL/persona in echo mode, TTS engine `elevenlabs`, external voice id
      `iP95p4xoKVk53GoZ742B`, model `eleven_flash_v2_5` (or `eleven_turbo_v2_5`), no api key;
      new persona id goes in CRUCIBLE_TAVUS_PERSONA_ID. Backchannel and barge-in in video
      mode dropped: Tavus plays its own audio.
- [x] 2d: JavaScript in the coding round (Python | JavaScript switch on the editor; $0 to run)

## Later

- [x] Bank eval cases + A/B (with vs without notes): first-probe targeting 11/24 vs 14/24 —
      no measurable gain at the first probe; kept the notes for deeper rungs
- [ ] Measure the deeper rungs: multi-turn bank cases (probe 2–4) and an LLM-judge for
      "is this follow-up on the biggest gap" instead of keyword matching
- [ ] Human review of the question bank by 2–3 working interviewers (not yet verified by people)
- [ ] Mark ideal-answer points core vs stretch so junior answers aren't scored against senior points
- [ ] One verdict still slips through in ~20 live lines; keep watching the leak metric

- [ ] Private interviewer `notes` passed to the Evaluator (Ilia's hidden-notes pattern)
- [ ] New rubric criteria + weakness tags (reflection, complexity/testing, API/failure handling)
- [ ] Planner gives each question its target signals + the weakness tag it aims at
- [ ] Level-driven session: Marcus leads at junior, candidate leads at senior

- [ ] LiveKit Agents real-time voice server (CLAUDE.md build-order step 4)
- [-] Fine-tuning a model — dropped: current Claude isn't fine-tunable on Bedrock, the
      prompt + eval loop already meets the bar (43/43, 0% judgment leaks), and no
      adequate licensed training data exists. Revisit only for cost-driven distillation.

## Waiting on Karthik

- [ ] Review + merge PR for `feat/question-bank` (after PR #1)

- [ ] Merge PR #1 (`feat/human-interviewer`)
- [ ] Redeploy frontend with Cognito vars (command in chat, 2026-10-26)
- [ ] Try the hands-free mic on the live site

## Done (recent)

- [x] 2026-10-25 Interviewer rewrite: real interview stages, spoken replies, clarify
      action, graduated hints, neutral tone — 43/43 live eval, 0% judgment leaks
- [x] 2026-10-25 ElevenLabs voice (Flash v2.5, "Chris"), Kokoro removed, deployed
- [x] 2026-10-26 Smarter hands-free pause detection + send progress bar
