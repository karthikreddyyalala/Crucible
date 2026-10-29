# Phase 2d: JavaScript coding round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Candidates can solve coding problems in JavaScript as well as Python.

**Architecture:** A TypeScript port of the Python judge runs in its own Web Worker with the existing runner protocol; a one-time script adds JS starter code to every problem; the editor gets a language switch and the backend is told the language.

**Tech Stack:** React + TS + zustand + vitest + CodeMirror 6, FastAPI + Pydantic. Spec: `docs/superpowers/specs/2026-10-29-phase-2d-javascript-design.md`.

Tasks 1, 2 and 3 run in parallel; their only shared contracts are fixed here:
- Worker file: `src/lib/coding/js.worker.ts`, default protocol `RunnerRequest`/`RunnerResponse` from `src/lib/coding/types.ts` (unchanged).
- Problem field: `starterCodeJs: string` on `PublicProblem` (Task 2 adds it to types.ts; Task 3 may add the same line, identical, and the merge keeps one).
- Language type: `export type CodingLanguage = "python" | "javascript";` in `src/lib/coding/types.ts` (Task 3 adds it).

Rules for every task: TDD; mocked tests only, never call Bedrock/ElevenLabs/Deepgram/Tavus; conventional commits with `git -c user.name=Karthik commit`, never mention AI or Claude, no co-author lines; match surrounding style; no barrel files; no `any`.

---

### Task 1: JavaScript judge and worker

**Files:** Create `src/lib/coding/jsHarness.ts`, `src/lib/coding/jsHarness.test.ts`, `src/lib/coding/js.worker.ts`. Read `backend/data/coding/harness.py` (the reference) and `src/lib/coding/pyodide.worker.ts` (worker style).

- [ ] Write failing vitest cases covering every behaviour listed in spec section 1 (each kind, adapter, compare mode, `checkArg`, `tree_node`, `graph_copy` reuse error, load error row with `(line N)`, runtime error with line, stdout capture and cap, missing function message `Couldn't find a function named two_sum (or twoSum)`, `class Solution` lookup, validator gets untouched args). Use real problems from `src/lib/coding/problems.public.json` with hand-written JS solutions for at least: two sum (custom), reverse linked list, max depth of tree, clone graph, LRU-style design problem present in the set, serialize/deserialize tree (roundtrip), a float problem, an unordered_nested problem (3sum or group anagrams), and an in-place `checkArg` problem.
- [ ] Implement `run(code: string, problem: PublicProblem, onlyVisible: boolean): TestResult[]`. Load candidate code with `new Function("ListNode", "TreeNode", "Node", "console", code + "\n;return { ...names }")` or equivalent so top-level `function`/`class` declarations are found by name; map stack lines back to the candidate's line numbers (subtract the wrapper offset; test this). Timing via `performance.now()`.
- [ ] `js.worker.ts`: on `load` post `{type:"ready"}`; on `run` post `{type:"result", id, results}`, wrapping unexpected throws in an index -1 row like the Python worker.
- [ ] `npm run lint`, `npx vitest run` green. Commit `feat: judge JavaScript solutions in the browser`.

### Task 2: JavaScript starter code for every problem

**Files:** Create `backend/cli/make_js_starters.py`, `backend/tests/test_js_starters.py`. Modify `backend/models/coding.py` (`starter_code_js: str = ""`, included in `public()`), `backend/data/coding/problems/*.json` (generated), `src/lib/coding/problems.public.json` (re-export with `python3 scripts/export_public_problems.py` or however that script is run; read it), `src/lib/coding/types.ts` (`starterCodeJs: string`).

- [ ] Failing pytest: converter unit tests (`def three_sum(nums: list[int]) -> list[list[int]]:` → contains `function threeSum(nums)` and `@param {number[]} nums` and `@return {number[][]}`; a design class → `class WordDictionary` with `constructor()`, `addWord(word)`, `search(word)`; a tree problem gets the TreeNode shape comment); every problem file has non-empty `starterCodeJs`; `public()` exports it; if `node` is on PATH, every starter passes `node --check` (skip otherwise).
- [ ] Implement the script (dev-only, lives in the existing `cli` package; it is free, no network). Run it, commit the regenerated JSON. Type map: int/float → number, str → string, bool → boolean, list[X]/List[X] → X[], Optional[X] → X|null, dict → Object, ListNode/TreeNode/Node kept, None return → void, unknown → `*`.
- [ ] Run `cd backend && python3 -m pytest -q` (incl. `test_public_problems_export.py` and packaging tests) and `npx vitest run`. Commit `feat: add JavaScript starter code to every coding problem`.

### Task 3: Language switch, runner choice, backend language

**Files:** `package.json` (`npm install @codemirror/lang-javascript`, same major as the other `@codemirror` packages), `src/lib/coding/types.ts` (`CodingLanguage`), `src/stores/sessionStore.ts`, `src/components/coding/CodeEditor.tsx` (+ its tests), `src/pages/Interview.tsx`, `src/lib/api.ts` (turn/evaluate/coach inputs), `src/hooks/useCoach.ts` if it builds the coach request, `src/pages/Setup.tsx` copy, `src/lib/mockEngine.ts` only if types require it, `backend/routes/session.py` (`language` on TurnRequest, EvaluateRequest, CoachRequest), `backend/agents/interviewer.py`, `backend/agents/evaluator.py`, `backend/agents/coach.py`, `backend/prompts/coach.md`.

- [ ] Failing tests:
  - store: `codingLanguage` defaults to python and persists; setting JS code writes `codeByQuestion["<id>:javascript"]` and leaves the Python draft; turn/evaluate/coach calls send `language`.
  - CodeEditor: shows a Python | JavaScript switch, calls back on change, uses the JS starter (`problem.starterCodeJs`) for an empty JS draft.
  - Interview: Run with JavaScript selected goes to the JS runner (mock both runners).
  - pytest: `language` defaults to "python", rejects other values; interviewer/evaluator user messages say `Candidate code (current editor, JavaScript)` / `Final code (JavaScript)` when JS; coach prompt asks for code in the candidate's language and the coach user message names it.
- [ ] Implement. JS runner: `usePythonRunner({ createWorker: () => new Worker(new URL("../lib/coding/js.worker.ts", import.meta.url), { type: "module" }) })` (the worker file comes from Task 1; until merge, tests mock it). Python behaviour unchanged when language is python. Setup copy: "Live coding in Python or JavaScript with problems from the Blind 75."
- [ ] `npm run lint`, `npx vitest run`, `cd backend && python3 -m pytest -q`, `npm run test:e2e` green (if the build needs `js.worker.ts` before merge, add a temporary minimal file and say so in the report). Commit `feat: let candidates code in JavaScript`.

### Task 4: Merge, review, docs (controller)

- [ ] Cherry-pick the three commits, drop any temporary worker stub, full test suite + Playwright.
- [ ] Final review subagent over the whole diff; fix findings.
- [ ] Docs: TODO (2d JS ticked, Tavus voice = dashboard steps), PROJECT-HISTORY, README coding line. PR.
