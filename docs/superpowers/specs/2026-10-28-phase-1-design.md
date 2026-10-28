# Phase 1 — Coding round, company-style interviews, safety and consistency

Status: approved in chat 2026-10-28 · Branch: `feat/phase-1` · Delivery: pull request only (Karthik merges)

## Goal

Make Crucible a complete interview-prep product: the round software candidates fear most
(live coding) runs in the browser against real test cases, sessions can be shaped like a
specific company's loop, abusive or manipulative input is handled the way a professional
interviewer would, and the AI behaves consistently from run to run. Everything must feel
smooth and calm to use.

## Decisions (from the brainstorming conversation)

| Topic | Decision |
|---|---|
| Code execution | In the browser, Python only (Pyodide in a Web Worker). No server-side execution. |
| Problems | The Blind 75 set, statements written in our own words, own test cases. |
| Where coding appears | "Coding" mode = coding problems only. "Full mock" always includes one coding problem sized to the level. |
| Marcus during coding | Real-interviewer flow: approach → coding (quiet; one check-in after ~3 min with no progress) → review. |
| Abuse | Professional first, warning second, polite end third. Slurs and sexual content blocked before the AI. Casual swearing passes. |
| Companies | General, Amazon-style, Google-style, Meta-style, Microsoft-style, Startup. Labelled "-style", not affiliated. |
| Consistency | Temperature 0 for Intake, Planner, Evaluator, Memory, Coach; 0.3 for the Interviewer. |
| Delivery | PRs only, never push to `main`. |

## 1. Coding round

### 1.1 Problems (`backend/data/coding/problems/<id>.json`, one file per problem)

All 75 Blind 75 problems. LeetCode problem text is copyrighted; problem ideas are not. Every
statement, example and test is written for Crucible. Each problem:

```
id               "code-two-sum"
title            "Two Sum"
difficulty       "easy" | "medium" | "hard"
topics           ["array", "hash map"]
asked            "very_common" | "common"
statement        plain-language description, our wording
functionName     "two_sum"
signature        "def two_sum(nums: list[int], target: int) -> list[int]:"
starterCode      signature + docstring + "pass"
examples         2–3 {input, output, explanation} shown to the candidate
tests            10–15 {args, expected} — first 2–3 mirror the examples (visible),
                 the rest are hidden (candidate sees pass counts only)
compare          "exact" | "unordered" | "unordered_nested" | "float" | "custom" (validator in harness.VALIDATORS)
kind             "function" (default) | "design" (class; tests replay ops, e.g. Implement Trie) |
                 "roundtrip" (Codec; deserialize(serialize(x)) == x, e.g. Encode/Decode Strings)
checkArg         index of an argument to compare after the call instead of the return value
                 (in-place problems: Rotate Image, Set Matrix Zeroes, Reorder List)
referenceSolution  correct Python solution (server-side only, never sent to the browser)
targetComplexity {time: "O(n)", space: "O(n)"}
hints            3–5 graduated hints (narrow scope → direction → gap → specific input → name it)
followUps        3–5 review-stage probes (complexity, edge cases, "can you do better?", variants)
idealAnswerPoints / weakAnswerSigns / rubric (criteria: correctness, efficiency, code_quality, communication)
```

Problems that use linked lists, trees or graphs take/return plain Python structures
(lists, adjacency lists, level-order arrays) and the harness converts them to `ListNode` /
`TreeNode` where the signature needs them, so tests stay JSON.

**Correctness guarantee:** a backend test runs every `referenceSolution` against every test
in CPython with the same harness the browser uses. A problem with a wrong test cannot ship.
A second test checks that the starter code fails at least one test (no accidental freebies).

The browser receives problems from `GET /api/coding/problems/{id}` **without**
`referenceSolution`, hints, follow-ups or rubric (those stay server-side for Marcus and the
Evaluator). Hidden tests are sent (the browser must run them) but their inputs are not shown
in the UI.

Implementation notes (2026-10-28): the loader globs one JSON file per problem and the id must
equal the filename stem; candidate code may use a top-level function or a LeetCode-style
`class Solution`; adapters are keyed by parameter name read from `signature`.

Demo mode (no backend) needs problems too. A script writes
`src/lib/coding/problems.public.json` (the same public fields the endpoint returns, no
solutions/hints/rubric) and a test fails if it drifts from `problems.json`, so the shipped
bundle never contains reference solutions.

### 1.2 Runner (frontend)

- `src/lib/coding/pyodide.worker.ts`: loads Pyodide once (pinned version, from jsDelivr),
  runs a harness script with the candidate's code and the tests, posts back per-test
  `{passed, got, expected, error, stdout, ms}`.
- `src/hooks/usePythonRunner.ts`: owns the worker. **Hard timeout 5 s per run** → terminate
  and recreate the worker, report "Time limit exceeded (possible infinite loop)". Output
  capped at 10 KB. Never blocks the page.
- The harness lives once, in `backend/data/coding/harness.py`. The worker imports it as text
  (Vite `?raw`) and the backend reference-solution test runs it in CPython, so browser and CI
  judge code identically.
- States the UI must show: loading Python (first time, with progress), ready, running,
  results, error (syntax / runtime with line number), timed out, failed to load (with retry).
  No state may leave the user stuck without a next action.

### 1.3 Coding workspace UI

Desktop (≥1024 px): two panes with a draggable divider.
- Left: problem (title, difficulty, statement, examples, constraints), and the conversation
  with Marcus underneath (same composer, voice works).
- Right: CodeMirror 6 editor (Python mode, our dark theme, JetBrains Mono, auto-indent,
  bracket matching, Cmd/Ctrl+Enter = Run), toolbar (Run, Submit, Reset to starter, elapsed
  time), results panel (per-test ✓/✗, first failing visible test expanded with got vs
  expected, hidden tests as "8/10 hidden passed").
- Stage indicator: Approach → Code → Review.

Below 1024 px: problem and conversation only, with a calm notice that the editor needs a
larger screen; the session can still continue by talking through the solution.

Code is autosaved into the session store (survives refresh, like the rest of the session).

### 1.4 Marcus in the coding round

- New question type `coding` (TS + Python contracts, evaluator criteria, mock engine).
- `/api/session/turn` accepts `code` (current editor text) and `testResults`
  (summary from the browser). Both go to the model **inside untrusted fences** — they come
  from the client.
- Stage is tracked client-side and sent as `codingStage: "approach" | "coding" | "review"`.
  Stage moves to `coding` when the candidate first edits the starter code or says they're
  ready; to `review` after the first Submit.
- Check-in: if the stage is `coding` and there are no edits and no messages for 180 s,
  the client sends one turn with `event: "checkin"`; Marcus says one short line. At most one
  check-in per problem.
- Interviewer prompt: new `=== Coding round ===` section — approach stage probes the plan
  and its complexity before coding; coding stage stays quiet (answers questions briefly,
  never dictates code); review stage probes failing tests, complexity vs target, edge cases,
  "can you do better?", one variant. Hints use the problem's hint ladder; never the
  solution or code.
- Evaluator (coding): scores the thread + final code + reported results against the
  problem rubric; survival is false if the final code fails visible tests or the complexity
  is worse than target without the candidate recognising it.
- Follow-up budget for coding: 6.

### 1.5 Session shapes

| Mode | Level | Questions |
|---|---|---|
| coding | junior | 2 easy |
| coding | mid | 1 easy + 1 medium |
| coding | senior | 1 medium + 1 hard (or 2 medium if no hard fits) |
| full | any | 1 behavioral, 1 coding (easy/medium/medium-hard by level), 1 technical, 1 system design |

The Planner picks coding problems from a filtered list (by difficulty/level, preferring
`very_common`); only real problem ids survive (same `keep_known_exemplars` rule).

## 2. Company-style interviews

`backend/data/company_styles.json`: `general`, `amazon`, `google`, `meta`, `microsoft`,
`startup`. Each style: display name, one-line description, question-mix weights, behavioral
themes to favour (Amazon-style: ownership, customer obsession, bias for action, dive deep —
the public Leadership Principles; Google-style: problem solving, collaboration, ambiguity;
Meta-style: speed, impact, coding fluency; Microsoft-style: growth mindset, collaboration;
Startup: breadth, ownership, shipping with little), and an `interviewerNote` (what Marcus
digs for). Setup screen: a "Company style" selector with the description and the line
"Crucible isn't affiliated with these companies." The style goes to the Planner (choice and
weighting) and the Interviewer (what to dig for). Stored on the session record.

## 3. Safety

`backend/safety/moderation.py`, a pure function `moderate(text) -> Verdict`:
- `block` — slurs or sexual content (curated list, word-boundary matching, normalises
  leetspeak / repeated letters / spacing tricks). Never sent to the model.
- `abuse` — insults or threats aimed at the interviewer ("f*** you", "you're an idiot",
  "shut up, bot"). Never sent to the model.
- `ok` — everything else, including casual swearing not aimed at anyone ("damn, I forgot
  the base case") and words that merely contain a bad substring ("assessment", "classic",
  "Scunthorpe", "cocktail", "analysis").

`/api/session/turn` runs `moderate` on the answer before anything else. For `block`/`abuse`
it returns a fixed in-character decision without calling the model:
- strike 1: "Let's keep this professional. <restates the current question>"
- strike 2: "I'll be straightforward: if that happens again I'll have to end the interview.
  <restates the question>"
- strike 3: action `end`: "I'm going to end the interview here. Take care." The session
  ends; the record notes "ended for conduct".

Strike count travels with the session (client sends `strikes`, server returns the new
count). Moderation also runs on the candidate name at session start (a slur as a name would
be spoken aloud by Marcus) and on Coach input. Answers are capped at 6,000 characters
(422 above that). Prompt-injection handling stays in the prompts; new eval cases cover
injection inside code comments and inside test-result text.

## 4. Consistency

- `LLMClient.structured(..., temperature)`; per-agent settings: intake/planner/evaluator/
  memory/coach 0.0, interviewer 0.3 (env-overridable).
- Eval runner `--repeat 3`: reports decision agreement across repeats (target ≥ 95%) and
  survival-verdict agreement (target ≥ 95%).

## 5. UX and visual quality

Use the ui-ux-pro-max and frontend-design skills. Keep the existing identity (dark theme,
Syne headings, JetBrains Mono for code/data, Geist for conversation, accent #4A7CFF,
success #00D4AA, warning #FF6B3D). Motion: purposeful and calm — panel reveals, test results
counting in, stage transitions; transform/opacity only; respects `prefers-reduced-motion`.
No glows, no gradients, no glitter. Every async action shows progress; every error says what
happened and offers the next step; keyboard shortcuts shown in tooltips; focus states
visible; WCAG AA contrast.

## 6. Testing

- Backend unit tests for every new module; reference-solution test for all 75 problems;
  moderation tests with a false-positive list; API tests for every new field and limit.
- Frontend unit tests (vitest) for runner state machine, stage logic, check-in timer,
  moderation responses in the store.
- Playwright end-to-end tests in the repo (`e2e/`), run against demo mode: full coding
  round (load Python, write a solution, run, see pass/fail, submit), infinite-loop timeout,
  syntax error, abuse → strike → end, company style selection, mobile notice.
- Live-model evals: coding-interviewer golden cases, abuse/injection cases, `--repeat 3`
  consistency report.
- Final whole-branch code review by a separate reviewer before the PR.

## 7. Out of scope (later phases, see docs/ROADMAP.md)

JavaScript/Java/C++ execution, server-side execution, Deepgram voice, progress dashboard,
answer replay, new roles, human verification of questions.
