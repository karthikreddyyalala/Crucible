# Phase 2d: JavaScript in the coding round

Date: 2026-10-29. Branch `feat/phase-2d-javascript`. Approved by Karthik in chat
(language switch on the editor). The Tavus voice match from 2d is a dashboard setting,
not code (see TODO).

## Problem

The coding round only takes Python. Many candidates interview in JavaScript.

## What changes

### 1. JavaScript judge (browser, no server)

- `src/lib/coding/jsHarness.ts`: a pure TypeScript port of `backend/data/coding/harness.py`
  with the same contract: `run(code, problem, onlyVisible) => TestResult[]`, never throws,
  a load failure (syntax error, throw at load, missing function/class) is one row with
  index -1.
- Same behaviour as the Python harness: kinds `function` / `design` / `roundtrip`;
  `checkArg`; adapters `linked_list`, `linked_list_list`, `linked_list_cycle`, `tree`,
  `graph`, `graph_copy`, `node_value`, `tree_node`; compare `exact`, `unordered`,
  `unordered_nested`, `float` (1e-5), `custom` (`two_sum_pair`, `alien_order`); args deep
  copied, validators get untouched args; `ListNode(val, next)`, `TreeNode(val, left, right)`,
  `Node(val, neighbors)` classes available to the candidate code; function found by
  `functionName`, then its camelCase form, at top level or on a `class Solution`;
  parameter names come from the Python `signature` (same data, no JS-only fields);
  `console.log` captured as `stdout` (2,000 char cap); error text `"<Name>: <message>"`
  plus `(line N)` when the stack points into the candidate code; message cap 300.
- Results JSON-safe like `_plain`: `undefined` becomes `null`, tuples n/a, unknown objects
  become a short string.
- `src/lib/coding/js.worker.ts` speaks the existing `RunnerRequest` / `RunnerResponse`
  protocol: `load` answers `ready` at once; `run` answers `result`. The existing runner
  hook (`usePythonRunner`, already takes `createWorker`) runs it, so the 5 s timeout kills
  infinite loops the same way.

### 2. JavaScript starter code for all 75 problems

- New problem field `starterCodeJs` (Pydantic `starter_code_js: str = ""`, exported by
  `public()`, present in `src/lib/coding/problems.public.json` via
  `scripts/export_public_problems.py`).
- Made once by `backend/cli/make_js_starters.py` from each Python signature, then written
  into `backend/data/coding/problems/*.json`: camelCase function name, JSDoc types
  (`list[int]` → `number[]`, `str` → `string`, `bool` → `boolean`, `Optional[TreeNode]` →
  `TreeNode|null`, ...), empty body; design/roundtrip problems become a JS `class` with the
  same method names. When the problem uses ListNode/TreeNode/Node, a comment shows the
  class shape, LeetCode style. Every generated starter must parse (`node --check` style
  test) and expose the name the JS harness looks for.

### 3. Language switch and wiring

- Store: `codingLanguage: "python" | "javascript"` (persisted, default python). Code is
  kept per question per language: Python keeps the existing `codeByQuestion[id]` key (old
  saved sessions still load); JavaScript uses `codeByQuestion[`${id}:javascript`]`.
- `CodeEditor`: a small **Python | JavaScript** segmented switch in the editor header;
  CodeMirror uses `@codemirror/lang-javascript` for JS (`npm install @codemirror/lang-javascript`).
  Switching keeps both drafts. A fresh JS draft starts from `starterCodeJs`.
- `Interview`: a second runner (`usePythonRunner({ createWorker: jsWorker })`) for
  JavaScript; Run/Submit use the runner for the current language. Loading text for Python
  is unchanged; JS is ready instantly.
- Backend: `language: Literal["python", "javascript"] = "python"` on `TurnRequest`,
  `EvaluateRequest` and `CoachRequest`. Interviewer and evaluator label the code block with
  the language; the coach writes `code` in the candidate's language (prompt: "in the
  candidate's language"). Setup copy says "Python or JavaScript".
- Demo mode (`mockEngine`) unchanged except accepting the field.

## Out of scope

- TypeScript, other languages; Tavus voice (dashboard setting).

## Cost

$0 to build (mocked tests, Playwright demo mode) and $0 to run (code runs in the browser).

## Testing

- vitest for `jsHarness`: each kind, each adapter, each compare mode, checkArg, load
  errors with line numbers, stdout capture, missing function, camelCase and `class Solution`
  lookup, input mutation can't fool validators; a few real problems solved in JS.
- pytest/vitest for starters: all 75 have `starterCodeJs`, each parses, exposes the
  expected name; the export test still passes.
- vitest: switch keeps both drafts, JS run goes to the JS worker, turn/evaluate/coach send
  `language`; pytest: `language` accepted, defaults to python, shows up in the prompts.
- All existing tests and the 8 Playwright tests still pass.
