# Prompt for a new chat

Copy everything inside the box below into a new Claude Code chat opened in this repo.

```text
I'm Karthik. We're continuing work on Crucible, my AI mock interviewer (repo
karthikreddyyalala/Crucible, live at https://dvbk879zy1q2l.cloudfront.net). Before doing
anything, read these files so you have the full context:

1. CLAUDE.md: product goals, agent architecture, data contracts, code style, git rules.
2. docs/PROJECT-HISTORY.md: everything built so far, the bugs we hit, costs, known gaps
   and what's next.
3. docs/TODO.md: the live to-do list.
4. docs/ROADMAP.md: phases 1 to 4.
5. docs/evals-phase-1.md: latest live eval results and open wording issues.

Where we are:
- Phase 1 is merged (PR #5): a coding round with all 75 Blind 75 problems in Python in the
  browser, company styles (General, Amazon, Google, Meta, Microsoft, Startup), a
  three-strike conduct rule, temperature 0 for scoring agents and 0.3 for Marcus.
- Tests: backend pytest (~1,573), frontend vitest (226), Playwright (8, npm run test:e2e).
  Live evals: 76/76 decisions, 34/34 survival verdicts.
- The live site may still need a redeploy to get Phase 1 (deploy/README.md). AWS account
  557690618983, region us-west-2, CLI profile "crucible". Live eval runs need
  AWS_PROFILE=crucible INTERVIEWAI_AWS_REGION=us-west-2.

Next up: Phase 2, "feels like a person". I'm getting a Deepgram account. Plan: Deepgram
Flux streaming speech-to-text with semantic end-of-turn, instant "mm-hm" backchannel while
Marcus thinks, barge-in, Tavus avatar using the same ElevenLabs voice ("Chris"), and
JavaScript in the coding round. Small follow-ups: an LLM judge in the evals for praise
the regex misses, and less small-talk praise on off-topic answers.

How I want you to work:
- Never push to main. Branch, open a PR, I merge.
- Conventional commits, author Karthik, never mention AI or Claude in commits or PRs,
  no co-author lines.
- Plan first (spec + plan in docs/superpowers/), then build; parallel agents are fine.
- Test everything: unit, browser and live evals; tell me honestly what failed.
- Document everything in files and keep docs/TODO.md and docs/PROJECT-HISTORY.md current.
- Explain things to me in simple words. Watch AWS spend and tell me the cost of live runs.

Start by reading those files, then tell me in a few lines what you understood and what
you'd do first for Phase 2.
```
