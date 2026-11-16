# Human-feel fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix what the human-feel pilot found: Marcus recaps the candidate's answer on nearly every turn, never names a wrong claim even after the candidate digs in, does not ask for a number when impact is vague, and the written verdict gives no single fix.

**Architecture:** Prompt text changes in `backend/prompts/interviewer.md` and `backend/prompts/evaluator.md`, locked by mocked pytest checks on the prompt text. One harness tweak. No contract changes.

**Spec:** `docs/superpowers/specs/2026-11-16-human-feel-eval-design.md` ("After the runs"). Pilot evidence: `backend/evals/results/human_feel/20261116-132556/` (gitignored? if not present, the findings are restated in each task).

## Global Constraints

- No changes to Pydantic or TypeScript contracts. No new dependencies.
- Spoken lines Marcus is told to say must contain no em or en dashes in NEW text you write (existing text is untouched unless the task says so).
- Never weaken the hard rules in CLAUDE.md: Marcus pushes back on vague answers, never says "great answer" unless earned, never validates a wrong answer.
- Mocked tests only ($0). Run from `backend/`: `python3 -m pytest -p no:warnings 2>&1 | tail -1`. Whole suite must stay green (currently 1621 passed, 39 skipped).
- Commits: conventional (`fix:`, `test:`), `git -c user.name=Karthik commit`, no mention of AI/Claude, no Co-Authored-By line.

---

### Task 1: Interviewer and evaluator prompt fixes

**Files:**
- Modify: `backend/prompts/interviewer.md`
- Modify: `backend/prompts/evaluator.md`
- Test: `backend/tests/test_prompt_human_feel.py` (create)

Pilot findings this task fixes (quotes from the transcripts):
1. Recap acknowledgments on nearly every turn: "Okay, so the TA stepped in, you landed on the ORM, and you had to redo the table." / "Okay, hit a lot, slow query, caching it. Got it." 9 of one candidate's Marcus lines opened with "Okay, so". The prompt itself teaches this in two places: rule 5 ("Open with a neutral acknowledgment or a mirrored detail ("Okay — CDN in front, counter-based IDs.")") and the NEUTRAL bullet ("or briefly mirror a detail they said ("Two flows, day nineteen — okay.") to show you listened.").
2. Candidate said "a LEFT JOIN is going to drop rows that don't have a match"; Marcus let it pass and even said "That's the right instinct". Rule 4 (WRONG) says "Never correct them and never say it's wrong", so a claim that survives the counter-case is never named.
3. Candidate said he "made the dashboard faster"; Marcus never asked how much faster or how it was measured.
4. The evaluator's `survivalReasoning` names the weakness but no concrete next step.

- [ ] **Step 1: Write the failing tests** in `backend/tests/test_prompt_human_feel.py`. Load both prompts with `Path(__file__).parent.parent / "prompts" / "<name>.md"`, normalise whitespace (`" ".join(text.split())`), and assert:
  - `test_no_recap_examples_left`: the interviewer prompt no longer contains `"CDN in front, counter-based IDs"` nor `"Two flows, day nineteen"`.
  - `test_recap_is_banned`: the interviewer prompt contains the exact phrase `Never recap their answer back`.
  - `test_wrong_claim_is_named_after_counter_case`: contains `If they still hold the wrong claim after your counter-case`.
  - `test_affirming_words_banned`: the BANNED list contains `"right instinct"` and `"makes sense"`.
  - `test_vague_result_gets_a_number`: contains `Faster by how much?`.
  - `test_survival_reasoning_names_one_fix`: the evaluator prompt contains `To hold up:`.
- [ ] **Step 2: Run** `cd backend && python3 -m pytest -p no:warnings -q tests/test_prompt_human_feel.py` and confirm all 6 FAIL on missing text.
- [ ] **Step 3: Edit `interviewer.md`:**
  - Rule 5: replace `Open with a neutral acknowledgment or a mirrored detail ("Okay — CDN in front, counter-based IDs."), never "solid", "good start", "nice framing".` with `Open with a short neutral acknowledgment ("Okay." / "Got it."), never "solid", "good start", "nice framing".`
  - NEUTRAL bullet: replace `"Okay." / "Got it." / "Mm, okay." / "Right." / "Sure." — or briefly mirror a detail they said ("Two flows, day nineteen — okay.") to show you listened.` with `"Okay." / "Got it." / "Mm, okay." / "Right." / "Sure." Vary them. Never recap their answer back: no "Okay, so you did X and Y", no list of the points they made. Show you listened by asking about one specific thing they said, in the question itself.`
  - Rule 4 (WRONG): after the existing examples and before `action="follow_up".`, keep the existing text and append a new paragraph to the rule: `If they still hold the wrong claim after your counter-case (you already asked about the breaking case and they repeated or defended it), name it once, plainly and kindly, in one short sentence of fact, then ask one question that lets them use it: "Actually, a LEFT JOIN keeps every row from the left table. What does that change in your query?" No lecture, no "that's wrong", no "common misconception". Never affirm a wrong claim, not even partly.`
  - BANNED list: add `"right instinct"`, `"makes sense"`, `"fair enough"` to the quoted list.
  - "Behavioral — cracking a rehearsed story" list: add a bullet `- A result with no number ("made it faster", "improved it", "it went well") → "Faster by how much?" / "How did you know it worked?" Ask for the number first, before anything else.`
- [ ] **Step 4: Edit `evaluator.md`** `survivalReasoning` field description: append to it `When it would not survive, end with the single most important fix as one concrete action, starting "To hold up:" (e.g. "To hold up: lead with the result, 9 seconds down to 3."). When it would survive, name the specific strength that carried it.`
- [ ] **Step 5: Run** the new tests (PASS) and the whole suite (green). If an existing test asserted on replaced text, update that assertion to the new text and say so in the report.
- [ ] **Step 6: Commit** `fix: Marcus stops recapping answers, names a wrong claim after the counter-case, asks for numbers` with all three files.

### Task 2: Harness, closing answers are not monologues

**Files:**
- Modify: `backend/evals/human_feel_interview.py`
- Test: `backend/tests/test_human_feel_harness.py`

The pilot flagged Marcus's answers to the candidate's own question in the closing ("What does a typical week look like?") as "monologue (70+ words)". Answering a candidate's question at length is normal, so the 70-word check must skip the `closing` stage. Every other check still runs there.

- [ ] **Step 1: Failing test** in `test_human_feel_harness.py`: `test_closing_answers_may_run_long`. Call `hf.slop_hits(long_line, stage="closing")` where `long_line = "word " * 80 + "."` and assert `"monologue (70+ words)" not in` the result; and `hf.slop_hits(long_line)` (default stage) still contains it.
- [ ] **Step 2: Run** it, confirm it fails (unexpected keyword `stage`).
- [ ] **Step 3: Implement**: `def slop_hits(line: str, stage: str = "") -> list[str]`, monologue check only when `stage != "closing"`; in `run_interview`'s `marcus()` helper pass `stage`.
- [ ] **Step 4: Run** the harness tests and the whole suite.
- [ ] **Step 5: Commit** `test: closing answers are not counted as monologues`.
