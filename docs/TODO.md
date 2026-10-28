# Crucible — Working To-Do

Living list. Updated as work happens; newest decisions at the bottom of each section.
Status: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` dropped (with reason)

## Now — Question quality (branch `feat/question-bank`)

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

## Next — Voice feel (needs a Deepgram account + key)

- [ ] Deepgram Flux streaming STT with semantic end-of-turn (replaces browser STT)
- [ ] Instant backchannel ("Mm-hm") while the reply is generated
- [ ] Barge-in: candidate can interrupt the interviewer
- [ ] Tavus persona uses ElevenLabs "Chris" so video and voice-only sound the same

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
