# Phase 3: coding history

Date: 2026-10-29. Branch `feat/phase-3-coding-history`. Approved by Karthik in chat
(without hints for now).

## Problem

A coding question's grade is saved, but not what happened in it: which problem, which
language, how many tests passed, how long it took. So the dashboard can't show coding
progress.

## Contract

```ts
// src/types/contracts.ts (mirrored by Pydantic CodingAttempt in backend/models/contracts.py)
export interface CodingAttempt {
  questionId: string;
  problemId: string;         // the plan question's exemplarId, e.g. "code-two-sum"
  language: "python" | "javascript";
  testsPassed: number;       // from the last run of that language's code
  testsTotal: number;
  submitted: boolean;        // true when the last run was a Submit (hidden tests included)
  seconds: number | null;    // first shown -> last Submit (or end of the question); null if unknown
}
```

- Backend: `CodingAttempt` Pydantic model (`problem_id` max 80 chars, counts 0..1000,
  `seconds` 0..86400 or None, `language` Literal). `FinalizeRequest.coding:
  list[CodingAttempt] = Field(default_factory=list, max_length=10)`; stored on
  `SessionRecord.coding` (default `[]`, so old records load) and copied into
  `SessionSummary.coding` by `summary()`.
- Client store: a persisted `codingClock: Record<questionId, { start: number; end?: number }>`.
  `start` is set the first time a coding question becomes the current question (or the
  first time its editor is used, whichever the code makes simpler and reliable across a
  reload); `end` is set on each Submit and, if never submitted, when the question is left.
  At finalize, one `CodingAttempt` per coding question in the plan that the candidate
  reached, built from `languageByQuestion`, `lastRun[codeKey(id, lang)]`
  (`testsPassed = visiblePassed + hiddenPassed`, `testsTotal = visibleTotal + hiddenTotal`)
  and the clock. A coding question with no run gives `testsPassed 0, testsTotal 0`.
  Demo mode (`api.ts` mock finalize/listSessions) stores and returns `coding` too.

## Dashboard

- A "Coding" section, only when any session has coding attempts, placed after "Next to
  work on"/"What's holding up" and before past sessions, in the same hairline style.
- Opens with one sentence from a pure, unit-tested `codingHistory(sessions)` in
  `src/lib/memoryStats.ts`: e.g. "You've solved 3 of 4 problems. Fastest: Two Sum in 11 min."
  ("solved" = submitted with every test passing).
- Then up to 6 most recent attempts, newest first: problem title (looked up from
  `src/lib/coding/problems.public.json` by `problemId`, falling back to the id humanized),
  language, "12 of 14 tests" (or "Not submitted"), time ("11 min", "under a minute", or
  nothing when null). When the same problem was tried before: "Faster than last time" /
  "More tests passing than last time" (only positive comparisons are called out; no
  negative labels).
- Same rules as the UX pass: plain words, numbers support the sentence, no bordered cards,
  accessible, works at 375px.

## Out of scope

Hints needed (Marcus doesn't mark hints; needs a prompt change and a paid live check).

## Cost

$0 to build and run (no new calls, no new tables).

## Testing

pytest: model validation and limits, finalize stores `coding`, old records default `[]`,
summary copies it. vitest: store builds attempts at finalize (submitted, run-only, no run,
language switch, reload keeps the clock); `codingHistory` (takeaway, ordering, repeat
comparisons, titles); Dashboard shows/hides the section. Playwright 9/9.
