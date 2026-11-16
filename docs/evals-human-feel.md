# Human-feel eval: does Marcus sound like a real interviewer?

Date: 2026-11-16. Branch `test/human-feel-eval`. Spec:
[specs/2026-11-16-human-feel-eval-design.md](superpowers/specs/2026-11-16-human-feel-eval-design.md).
Research behind the personas and rubric:
[research/2026-11-16-realistic-interviews.md](superpowers/research/2026-11-16-realistic-interviews.md).

## How it works

A simulated student (8 personas: nervous rambler, vague, strong, confidently wrong, freezes,
off-topic, memorized STAR, short-answer non-native speaker) goes through a full interview on
the real app routes. A separate judge model scores Marcus 1 to 5 on 8 points (probing, earned
praise, human voice, question craft, hard moments, fit to the student, feedback, confidence)
and quotes his lines. Free regex checks flag AI-sounding lines on every turn.

Run it (costs money, Claude API credits, never Bedrock):

```
cd backend && INTERVIEWAI_LLM_PROVIDER=anthropic \
  SSL_CERT_FILE=$(python3 -c "import certifi;print(certifi.where())") \
  python3 -m evals.human_feel_interview --personas nervous-rambler,vague-generalist,confidently-wrong --budget 3
```

About $0.65 per interview. One run is noisy (the same student scored up to 0.6 apart between
runs), so compare changes on two runs each.

## Results (3 students: rambler, vague, confidently wrong)

| Round | Runs | Avg | Human voice | Recap lines | Wrong claims |
|---|---|---|---|---|---|
| Pilot | 1 | 2.75 | 2.0 | (on nearly every turn) | let through, "That's the right instinct" |
| Fix 1: prompt rules | 1 | 2.92 | 2.7 | 23 of 48 | still let through |
| Fix 2: recap cut (had 2 bugs) | 2 | 2.92 | 2.5 | 50 of 100 | still let through |
| Fix 3: recap cut fixed + fact check | 2 | 2.96 | 3.0 | 9 of 106 | named in the call, failed in the feedback |

"Recap lines" = Marcus question lines that open by reading the answer back ("Right. So you cut
the export and trimmed the reminders, who did you tell?").

What changed:
1. **Recaps** were taught by the prompt's own examples. Removed them, and `no_recap()` in
   `backend/agents/interviewer.py` cuts a summary clause between the acknowledgment and the
   probe (kept: quoting their word, "You said 'we'", and short pointers).
2. **Wrong claims** were never caught by prompt rules alone. A small fact check
   (`backend/agents/fact_check.py`, Haiku, technical/system design/coding only) lists plainly
   false claims for Marcus and the Evaluator. Now every false claim in the runs (GIL makes
   `+=` atomic, hash map lookup O(log n), DNS is one central server) is tagged
   `incorrect-core` and the answer fails, with the claim named in the reasoning.

## Still open

- **Feedback discourages more than it teaches** (confidence 2.2 of 5): almost every answer is
  "would not survive" with no strength named. The judge sees only the verdicts, not the
  model answers on the Results page, so this is partly harsher than the real screen. Done
  on `feat/encouraging-feedback`: each answer now has one earned strength ("What worked")
  next to the "To hold up:" fix, and the judge sees it. Not yet re-measured.
- **Marcus corrects too directly**: he now names the wrong claim, but often as a flat
  correction instead of a counter-case first ("two threads, a million increments each, what
  total do you expect?").
- **The other 5 personas** (strong, freezes, off-topic, memorized STAR, short answers) have
  not been run yet (about $3.30 for one run).
- The fact check adds one small call (about 1 second) to technical turns.

## Cost

Six paid rounds, estimated $11.26 total on Claude API credits.
