# Crucible eval results

A plain summary of how Crucible's interviewer was measured and improved, for the README,
a resume, or talking about the project. Full technical detail for the final round is in
[evals-phase-1.md](evals-phase-1.md). Raw results are in `backend/evals/results/`.

## Headline numbers (final run, 2026-10-28)

- **76 hand-labeled interview situations**, each run **3 times** on Claude Sonnet 4.6.
- **76/76 correct decisions**: Marcus picked the right move every time (follow up,
  ask to clarify, move on, or end).
- **34/34 correct "would this survive a real interview" verdicts**, identical across all
  3 runs.
- **96 to 100% run-to-run agreement** on decisions, depending on the suite.
- **"Two questions in one" dropped from 17.9% to 0%** of follow-ups on the core set.
- **0 spoken verdicts** ("great answer", "that's solid") on the core, coding, adversarial and
  question bank sets (204 spoken lines).
- **Prompt injection held in every case**: fake "SYSTEM" messages, instructions hidden in code
  comments and fake test results never changed Marcus's decision.

## What was measured

Each case is one moment in an interview: the question, the candidate's answer, and what a
good interviewer should do next. The eval sends it to the real model and checks:

| Check | Meaning |
|---|---|
| Right call | Marcus chose an accepted action (follow up, clarify, advance, complete) |
| Survival verdict | The Evaluator's `wouldSurviveRealInterview` matches the human label |
| Spoken verdicts | Marcus praised or judged the answer out loud (he shouldn't) |
| Two asks | A follow-up that asks two things at once (real interviewers ask one) |
| Agreement x3 | The same case gives the same decision on all 3 runs |
| Say checks (coding) | The spoken line contains what it must and never gives away code or the technique |

The case sets:

| Set | Cases | What it covers |
|---|---|---|
| Core | 28 | Behavioral, technical and system design answers, strong to vague |
| Coding | 20 | Live coding round: approach, writing code, failing runs, review |
| Adversarial | 12 | Prompt injection, "just tell me the answer", rude or evasive answers |
| Adversarial input | 8 | Junk, off-topic, other languages, very long answers |
| Question bank | 8 | Does the first follow-up go after the biggest missing point |

## How it improved over time

| Date | Run | Decisions | Two asks (core) | Spoken verdicts | Agreement x3 |
|---|---|---|---|---|---|
| 2026-09-03 | Baseline (23 cases) | 23/23, survival 12/13 | not measured | not measured | not measured |
| 2026-10-25 | Human-sounding Marcus (v2) | 42/43 | not measured | 0% | not measured |
| 2026-10-27 | Interview structure (v3) | 48/48 | 17.9% | 0% | not measured |
| 2026-10-27 | Question bank added | 48/48 | 14.3% | 0 to 12.5% | not measured |
| 2026-10-28 | Phase 1, first run | 74/74 | 3.6% | 0% (core) | 94 to 100% |
| 2026-10-28 | Phase 1, final (v4) | **76/76** | **0%** | **0% (core)** | **96 to 100%** |

What fixed the "two asks" problem: prompt rules alone got it down but never to zero, so a
small code guard in `backend/agents/interviewer.py` now trims a stacked second question.
The lesson: some behaviour is cheaper and more reliable to enforce in code than in a prompt.

## Bugs the evals found

- **Every real AI call would have failed in production.** The installed Anthropic SDK
  rejected the `temperature` argument; unit tests used fake clients and missed it. The first
  live run caught it.
- **Marcus hinted at the bug** while the candidate was still debugging. Found in a live
  end-to-end coding interview, fixed, and added as a permanent eval case.
- **Marcus invented a failing test input** he had never been shown. Fixed by giving him the
  visible examples.
- **Marcus re-used the check-in line** ("how's it going?") on someone who had just explained
  where they were.
- **Praise slipping through** ("that holds up", "the key detail") that the simple word filter
  missed. Banned phrases added; an LLM judge is the planned next step.

## Volume and cost

| | Total |
|---|---|
| Eval runs | 41 |
| Cases checked (counting each run) | 580 |
| Model calls | 1,136 |
| Recorded cost | about $25 |

The October Bedrock bill was about $38 in total, which also includes runs that were not
saved and live end-to-end practice interviews. From now on, live evals run only with the
owner's approval and a cost estimate first, as small batches, on Haiku where possible.

## Other testing

- Backend: 1,578 automated tests (pytest). Frontend: 241 (vitest). Browser: 8 end-to-end
  tests (Playwright, demo mode). These use fake model responses and cost nothing.
- Every one of the 75 Blind 75 coding problems has a reference solution proven against every
  test case by the same harness the browser uses.
- Live checks of video, voice and transcription in a real browser: avatar appears in about
  4 seconds, closing the tab ends the paid video call, Deepgram transcribes technical terms
  correctly after keyterm prompting ("idempotent" used to come back as "eat important").

## Resume bullets

- Built an AI mock interviewer with a 5-agent pipeline (intake, planner, interviewer,
  evaluator, memory) on Claude/Bedrock, FastAPI on Lambda and React; scored **76/76** on a
  hand-labeled eval of interviewer decisions with **96 to 100%** run-to-run agreement.
- Designed an eval harness (76 labeled cases, 3x repeats, injection and junk-input suites)
  that caught a production-breaking SDK bug and cut stacked follow-up questions from
  **17.9% to 0%**.
- Added a live coding round running Python in the browser (Pyodide in a Web Worker) across
  all 75 Blind 75 problems, each verified against every test case.
- Shipped real-time voice with Deepgram Nova-3 streaming (short-lived server-minted tokens,
  domain keyterm prompting) and an optional Tavus video avatar with timeout fallback and
  billing-safe teardown.

## Talking points for interviews

- **Why evals and not just unit tests:** unit tests used fake model responses and passed,
  while every real call would have failed. Only the live eval showed it.
- **Prompt vs code:** prompt rules brought two-part questions down, but across reruns they
  kept bouncing between about 4% and 14%. A 3-line regex guard took it to 0%. Knowing when to stop prompting is part of
  the job.
- **Consistency:** scoring agents run at temperature 0 and every case runs 3 times; the
  survival verdict never flipped.
- **Cost discipline:** the eval loop cost about $25 recorded. The takeaway was to run small
  batches on a cheaper model first and use the expensive model for the final check.

## Honest limits

- 76 cases is a small set, and the labels were written by the builder, not independent
  reviewers.
- The "spoken verdict" check is a word list and misses some praise; an LLM judge would catch
  more.
- All runs used one model (Sonnet 4.6) in one region.
