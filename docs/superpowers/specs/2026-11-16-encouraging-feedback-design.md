# Encouraging but honest feedback: one strength per answer

Date: 2026-11-16. Branch `feat/encouraging-feedback`.

## Problem

In the human-feel eval, confidence scored 2.2 of 5. Almost every answer read "would not survive"
and named only what went wrong. A student who fails four answers in a row leaves with no idea
what they already do well, so they don't know what to keep.

## Change

Each `AnswerEvaluation` gets one new field, `strength`: one specific thing the candidate did
well in this answer, in under 25 words, taken from their own lines. It is `""` when there was
nothing real to name. It is never generic praise ("good effort", "great answer").

The fix already exists: when an answer fails, `survivalReasoning` ends with "To hold up: <one
concrete action>". So each card shows one fix and one strength, with no second fix field.

- **Contract**: `strength: str = ""` (Python) and `strength?: string` (TS). The default keeps
  old stored sessions loading.
- **Evaluator prompt**: asks for `strength` with these rules: specific, quotes or names what
  they said, earned on a failing answer too when something real is there, `""` otherwise. When
  the answer survives, `survivalReasoning` already names what carried it, so `strength` names a
  different thing or is `""`. It never changes a score or the verdict.
- **Results card**: a "What worked" line under the reasoning, shown only when `strength` is
  non-empty. The verdict heading and reasoning still lead. No badge, no icon, no colour reward.
- **Demo mode**: `mockEngine.evaluate` fills a plain strength so the demo and e2e show it.
- **Eval harness**: the judge sees the strength next to each verdict, as the student does.

## Not changing

Scores, survival rules, tags, the takeaway line and the coach panel.

## Tests (mocked, $0)

- pytest: default and alias; the prompt asks for `strength` with the rules above; the judge's
  feedback lines include it.
- vitest: the card shows "What worked" only when `strength` is set, after the verdict; the demo
  evaluator returns one.

## Measure (paid, needs a yes)

Re-run the 3 personas twice (about $3.90) and compare confidence and feedback quality to 2.17
and 2.5.
