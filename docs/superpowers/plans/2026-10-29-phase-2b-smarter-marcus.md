# Phase 2b: smarter Marcus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marcus builds on what the candidate already said instead of re-asking it, and the report shows the key points of each answer.

**Architecture:** Two independent slices, no new LLM calls. (1) The client sends the candidate's earlier replies with each turn; the interviewer prompt uses them when asking the next question. (2) The evaluator's existing structured output gains `keyPoints`, shown on the verdict card.

**Tech Stack:** FastAPI + Pydantic (backend/), React + TypeScript + zustand + vitest (src/). Spec: `docs/superpowers/specs/2026-10-29-phase-2b-smarter-marcus-design.md`.

Rules for both tasks: mocked tests only, never call Bedrock/ElevenLabs/Deepgram/Tavus. Conventional commits, author Karthik (`git -c user.name=Karthik commit`), no mention of AI or Claude, no co-author lines. No em dashes in anything Marcus says.

---

### Task 1: Earlier answers reach the interviewer

**Files:**
- Modify: `src/lib/api.ts` (`TurnInput`: add `earlier?: string`; send it in the request body like the other fields)
- Modify: `src/stores/sessionStore.ts` (`turnOnce`, around the `nextQuestion` / `priorThread` code)
- Modify: `backend/routes/session.py` (`TurnRequest.earlier`, pass to `run_turn`)
- Modify: `backend/agents/interviewer.py` (`run_turn(earlier: str = "")`, fenced block)
- Modify: `backend/prompts/interviewer.md` (section "Asking a new question")
- Test: `src/stores/sessionStore.test.ts`, backend tests next to the existing interviewer/route tests

- [ ] **Step 1: Failing tests.**
  - vitest: after a background reply and a first-question answer, the turn on question 1 (which has a next question) calls `api.submitAnswer` with `earlier` containing the background reply then question-0 replies (candidate lines only, no `Q:` lines, not the current thread, not "intro" or "closing"), joined by `\n`; the value is the last 3,000 chars; on the last question (no next) `earlier` is `""`.
  - pytest: `TurnRequest` accepts `earlier` and rejects over 4,000 chars; with a fake llm capturing `user`, `run_turn(earlier="I led the payments migration", next_question=q)` puts it inside `wrap_untrusted("earlier_answers", ...)` under the heading "Earlier in this interview (the candidate's own words)"; with no `next_question` or empty `earlier` the heading is absent; the route passes `earlier` through; `interviewer.md` contains the build-on rule (assert on a stable phrase such as "already covered").
- [ ] **Step 2:** Run them, see them fail.
- [ ] **Step 3: Implement.**
  - Store: `const earlier = nextQuestion ? state.messages.filter((m) => m.speaker === "candidate" && m.questionId !== threadId && m.questionId !== "intro" && m.questionId !== "closing").map((m) => m.text).join("\n").slice(-LIMIT.earlier) : "";` with `earlier: 3000` added to `LIMIT`; pass `earlier` to `api.submitAnswer`.
  - Backend: `earlier: str = Field("", max_length=4000)` on `TurnRequest` with a one-line comment; `run_turn(..., earlier=req.earlier)`; in `run_turn`, append after the next-question line, only when both are set:
    `f"Earlier in this interview (the candidate's own words):\n{wrap_untrusted('earlier_answers', earlier)}\n"`.
  - Prompt, appended to the "Asking a new question" paragraph: if the earlier answers already covered the core of the next question, don't ask it from scratch; name what they said in a few words ("You mentioned the payments migration earlier.") and ask the part they haven't covered, still one question with one ask, same topic, no hints; coding and system design questions are always asked as written; never say a question was skipped or changed.
- [ ] **Step 4:** Tests pass; `npm run lint`, `npx vitest run`, `cd backend && python3 -m pytest -q` all green.
- [ ] **Step 5:** Commit `feat: let the interviewer build on earlier answers instead of re-asking`.

### Task 2: Key points in the report

**Files:**
- Modify: `backend/models/contracts.py` (`AnswerEvaluation.key_points: list[str] = []`)
- Modify: `backend/prompts/evaluator.md` (output field description)
- Modify: `src/types/contracts.ts` (`keyPoints?: string[]`)
- Modify: `src/components/VerdictCard.tsx` (list under the verdict reasoning)
- Modify: `src/lib/mockEngine.ts` (demo evaluations include 2-3 key points)
- Test: backend contract/evaluator tests, `src/components/VerdictCard*.test.tsx`

- [ ] **Step 1: Failing tests.**
  - pytest: `AnswerEvaluation` without `keyPoints` gives `key_points == []`; `model_validate({... "keyPoints": ["a"]})` keeps it and dumps by alias as `keyPoints`; `evaluator.md` mentions `keyPoints`. If a TS/Pydantic parity test exists, it must still pass.
  - vitest: `VerdictCard` with `keyPoints: ["Moved billing to Kafka", "Cut p99 from 900ms to 120ms"]` shows a "What you said" heading and both items; with `[]` or missing, no heading.
- [ ] **Step 2:** Run them, see them fail.
- [ ] **Step 3: Implement.**
  - Evaluator prompt: `keyPoints`: 2 to 4 short points, each under 15 words, of what the candidate actually said, in their terms (their numbers, names, technologies), no judgement words; `[]` when there was no real answer. Scoring rules unchanged.
  - `VerdictCard`: right below the survival reasoning, a small "What you said" label in the card's existing label style and a plain `<ul>` of the points, matching the card's existing Tailwind classes and fonts (Syne headings, JetBrains Mono for data). No new dependencies, no emojis.
  - `mockEngine`: add realistic `keyPoints` to each demo evaluation.
- [ ] **Step 4:** Tests pass; lint, vitest, pytest, `npm run test:e2e` green.
- [ ] **Step 5:** Commit `feat: show the key points of each answer next to the verdict`.

### Task 3: Docs (controller)

- [ ] Update `docs/TODO.md` (2b ticked), `docs/PROJECT-HISTORY.md` (2b entry), `docs/ROADMAP.md` if wording changed. Commit `docs: phase 2b smarter interviewer`.
