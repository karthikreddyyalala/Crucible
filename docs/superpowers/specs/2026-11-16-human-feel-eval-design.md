# Human-feel interview eval

Date: 2026-11-16. Branch `test/human-feel-eval`. Asked by Karthik: test real, natural interview
flow (not AI slop), with real questions that leave students confident; run it on his Claude API
platform credits (about $60), not Bedrock.

## Provider switch

`INTERVIEWAI_LLM_PROVIDER=anthropic` makes `LLMClient` use the Claude API (`Anthropic()`, signed in
with `ant auth login` or `ANTHROPIC_API_KEY`) and maps Bedrock ids to the same models
(`us.anthropic.claude-sonnet-4-6` to `claude-sonnet-4-6`). Default stays Bedrock, so Lambda is
unchanged. Local evals only.

## Eval

`backend/evals/human_feel_interview.py`:

- 8 personas (`evals/golden/human_feel_personas.json`) from the research in
  `docs/superpowers/research/2026-11-16-realistic-interviews.md`: nervous rambler, vague
  generalist, strong and concise, confidently wrong, freezes, off-topic storyteller, memorized
  STAR, short-answer non-native speaker. Each has a resume, style, sample lines, and what a good
  interviewer does with them.
- The candidate is played by Claude Haiku 5.5. The app runs unchanged through its routes (start,
  turn, evaluate, finalize) with the same stage logic as `src/stores/sessionStore.ts`.
- Free regex checks on every Marcus line (praise openers, echo summaries, chatbot filler, dashes,
  markdown, two questions in one turn, 70+ word speeches, the same opener on 3+ lines).
- Claude Sonnet 5.5 judges each transcript plus the feedback shown to the student on 8 criteria
  (`evals/golden/human_feel_rubric.json`, 1 to 5 with anchors) and quotes evidence. Hard fails
  (praising a wrong answer, giving a frozen candidate the answer, 3+ stacked questions) cap the
  overall at 2.
- Output per run: transcript markdown, full JSON, `summary.json` in `evals/results/human_feel/`.
- `--budget` (USD) stops before the next interview once spent. Refuses to run without the
  provider switch, and never loads `backend/.env` (live Tavus key).

## Cost

Building and the mocked tests: $0. About $0.50 per interview. Plan: pilot of 3 (about $1.50,
cap $3), then 8 (about $4), fix Marcus, rerun 8 to compare. Every paid step needs Karthik's yes
first, and the actual spend is reported after.

## Testing

pytest, mocked: provider id mapping and default; full interview loop through the real routes with
fake models; slop checks flag AI lines and pass human ones; opener repeats; hard-fail cap; data
files line up (8 personas, 8 criteria with 1/3/5 anchors).

## After the runs

Findings become prompt fixes in `backend/prompts/interviewer.md` and new mocked cases in
`backend/evals/golden/`, so the lesson stays tested for free.
