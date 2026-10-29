# Crucible roadmap

What gets built, in order, and why. Each phase gets its own spec, plan, tests and pull
request. Detailed day-to-day status lives in [TODO.md](TODO.md).

## Phase 1 — complete interview prep (done, merged in PR #5 on 2026-10-28)

Spec: [superpowers/specs/2026-10-28-phase-1-design.md](superpowers/specs/2026-10-28-phase-1-design.md)

1. Coding round: Blind 75 problems in our own words, Python running in the browser against
   real test cases, Marcus running approach → coding → review like a real interviewer.
2. Company-style interviews: General, Amazon-, Google-, Meta-, Microsoft-style, Startup.
3. Safety: abuse and slurs handled professionally (warn, warn, end), casual swearing allowed,
   input limits, more injection tests.
4. Consistency: low temperatures and a repeat-run agreement metric.

Why first: live coding is most of a real software interview loop and Crucible couldn't
practice it; company style is how people actually prepare.

## Phase 2 — feels even more like a person (in progress)

Split into four pieces, each with its own spec, plan and PR:

- **2a, conversation feel** (built on `feat/phase-2a-voice-turns`):
  Deepgram Flux end-of-turn detection, an instant "Mm-hm" while Marcus thinks, and
  interrupting him mid-sentence. Spec: [superpowers/specs/2026-10-28-phase-2a-voice-turns-design.md](superpowers/specs/2026-10-28-phase-2a-voice-turns-design.md)
- **2b, smarter Marcus:** skip questions already answered; key points of each answer in
  the report, next to his verdict (grading still uses the candidate's real words).
- **2c, accuracy:** after each answer, re-check the recording with Deepgram's pre-recorded
  mode to fix misheard words ("p99" heard as "page 99"), never tidying the wording.
- **2d:** Tavus avatar speaks with the same ElevenLabs voice; JavaScript in the coding round.

## Phase 3 — shows you're improving

- Progress dashboard built from the Memory data (weak spots shrinking over sessions).
- Answer replay: your answer next to a strong one, with what was missing highlighted.
- Coding history: problems solved, time taken, hints needed.

## Phase 4 — more people

- Roles: frontend, data engineer, DevOps/SRE, product manager.
- Human verification: 2–3 working interviewers review the question bank and blind-score
  sample answers to check the Evaluator against people.
- More coding languages if users ask (would need server-side execution).

## Not planned

Fine-tuning models (current Claude can't be fine-tuned on Bedrock, and prompt + evals meet
the bar), scraping question sites, more questions for their own sake.
