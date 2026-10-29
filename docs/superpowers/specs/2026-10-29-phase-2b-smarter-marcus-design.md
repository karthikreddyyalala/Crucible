# Phase 2b: smarter Marcus

Date: 2026-10-29. Branch `feat/phase-2b-smarter-marcus`. Approved by Karthik in chat
("build on it" instead of a hard skip).

## Problem

1. Marcus re-asks things the candidate already covered. Each `/turn` only carries the
   thread for the current question, so when he moves on he has never seen what was said
   in "tell me about yourself" or in earlier answers.
2. The report shows a verdict and scores but not what the candidate actually said, so
   it's hard to connect the verdict to the answer.

## What changes

### 1. Build on what was already said (no hard skip)

- Client (`sessionStore.turnOnce`): a new `earlier` field on `TurnInput`. It holds the
  candidate's own replies (`A:` lines) from every thread except the current one, the
  warmup small talk ("intro") and closing, in order, joined by newlines, keeping the
  **last** 3,000 characters. Sent only when `nextQuestion` is set (the only time Marcus
  can ask something new); otherwise `""`.
- Backend: `TurnRequest.earlier: str = Field("", max_length=4000)`, passed to
  `InterviewerAgent.run_turn(earlier=...)`. When `earlier` and `next_question` are both
  present, the user message gets a fenced block (`wrap_untrusted("earlier_answers", ...)`)
  titled "Earlier in this interview (the candidate's own words)".
- Prompt (`interviewer.md`, "Asking a new question"): if the earlier answers already
  cover the core of the next question, don't ask it from scratch. Name what they said
  ("You mentioned the payments migration earlier.") and ask the part they haven't covered,
  still ONE question with ONE ask, on the same topic, adding no hints. Coding and system
  design questions are always asked as written. Never mention that a question was skipped
  or changed.
- The question stays in the plan, is answered and scored as usual (the evaluator still
  gets the planned question). No plan, scoring or Memory change.

### 2. Key points in the report

- `AnswerEvaluation.key_points: list[str] = []` (TS `keyPoints?: string[]`). Default keeps
  stored sessions and older payloads valid.
- Evaluator prompt: 2 to 4 short points (under 15 words each) of what the candidate
  actually said, in their terms, no judgement words; `[]` when there was no real answer.
  Grading rules unchanged: scores still come from the candidate's real words.
- `VerdictCard` shows "What you said" as a short list right under the verdict reasoning,
  above the scores. Nothing shown when empty.
- Demo mode (`mockEngine`) returns key points so the demo report shows them.

## Out of scope

- Hard-skipping planned questions; asking the model whether a question was covered in a
  separate call (extra cost).
- Any change to scoring, Planner or Memory.

## Cost

- Building and testing: $0 (pytest, vitest, Playwright demo mode). No Bedrock.
- After deploy: no new Claude calls. About 750 more input tokens on advance turns and
  about 60 more output tokens per evaluation: roughly a cent per interview.
- A live check of the new prompt wording is not run (Karthik: no spend for now).

## Testing

- pytest: `TurnRequest` accepts and caps `earlier`; the interviewer user message contains
  the fenced earlier block only when both `earlier` and `next_question` are set; prompt
  contains the build-on rule; `AnswerEvaluation` defaults `key_points` to `[]` and accepts
  camelCase `keyPoints`; evaluator prompt asks for key points.
- vitest: `turnOnce` sends `earlier` with the right threads, order and 3,000-char tail, and
  `""` when there's no next question; `VerdictCard` shows key points and hides the
  section when empty.
- All existing tests and the 8 Playwright tests still pass.
