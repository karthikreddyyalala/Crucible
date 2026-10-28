# Crucible — Working To-Do

Living list. Updated as work happens; newest decisions at the bottom of each section.
Status: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` dropped (with reason)

## Now — Question quality (branch `feat/question-bank`)

Goal: every question Marcus asks is one a strong real interviewer would ask, with
planned follow-up depth and fair, calibrated scoring.

- [~] Research: how open-source AI interviewers and real interviewers run each round
      → `docs/research/interviewer-prompts-and-flow.md`
- [x] Research: question sources, datasets, licenses, canonical system-design problems
      → `docs/research/question-sources-and-datasets.md`
- [x] Implementation plan → `docs/superpowers/plans/2026-10-27-question-bank.md`
- [x] Question bank data model (extend the unused `QuestionExemplar`) + loader — TDD
      (Tasks 1–3, reviewed twice; review caught 2-part prompts + missing content tests)
- [ ] Question bank content: SDE (behavioral / technical / system design, all levels)
- [ ] Question bank content: AI Engineer
- [~] Planner picks from the bank and personalizes (keeps memory weighting) — TDD
- [ ] Interviewer gets the question's follow-up ladder as private notes — TDD
- [ ] Evaluator gets the question's rubric anchors for calibration — TDD
- [ ] Prompt changes from the research gap analysis
- [ ] Golden eval cases for bank-backed questions; live eval run, results recorded
- [ ] Live end-to-end interview run; transcript reviewed for naturalness
- [ ] Docs: README / OVERVIEW updated with what changed and measured results

Decisions (2026-10-27): no public dataset has graded answers with rubrics for SWE/AI
interviews and the open HF "interview" sets are private or scraped — we write rubric anchors
and ladders ourselves; stems only from MIT / CC BY sources, with a `source` field and
ATTRIBUTION.md. See docs/research/question-sources-and-datasets.md.

## Next — Voice feel (needs a Deepgram account + key)

- [ ] Deepgram Flux streaming STT with semantic end-of-turn (replaces browser STT)
- [ ] Instant backchannel ("Mm-hm") while the reply is generated
- [ ] Barge-in: candidate can interrupt the interviewer
- [ ] Tavus persona uses ElevenLabs "Chris" so video and voice-only sound the same

## Later

- [ ] LiveKit Agents real-time voice server (CLAUDE.md build-order step 4)
- [-] Fine-tuning a model — dropped: current Claude isn't fine-tunable on Bedrock, the
      prompt + eval loop already meets the bar (43/43, 0% judgment leaks), and no
      adequate licensed training data exists. Revisit only for cost-driven distillation.

## Waiting on Karthik

- [ ] Merge PR #1 (`feat/human-interviewer`)
- [ ] Redeploy frontend with Cognito vars (command in chat, 2026-10-26)
- [ ] Try the hands-free mic on the live site

## Done (recent)

- [x] 2026-10-25 Interviewer rewrite: real interview stages, spoken replies, clarify
      action, graduated hints, neutral tone — 43/43 live eval, 0% judgment leaks
- [x] 2026-10-25 ElevenLabs voice (Flash v2.5, "Chris"), Kokoro removed, deployed
- [x] 2026-10-26 Smarter hands-free pause detection + send progress bar
