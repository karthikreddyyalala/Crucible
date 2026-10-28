# Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every interview question comes from a curated bank where each question carries the signal it tests, what weak vs strong answers look like, and a planned follow-up ladder — so questions are consistently sharp, follow-ups go deeper the way a trained interviewer's do, and scoring is calibrated.

**Architecture:** Bank lives as JSON per role in `backend/data/question_bank/`, validated by the existing (currently unused) `QuestionExemplar` model. The Planner receives the bank entries that fit the mode and level, picks and personalizes them, and tags each planned question with `exemplarId`. The server validates those ids, then — on every turn and evaluation — looks the exemplar up itself (never trusting client-sent rubric text) and gives the Interviewer the follow-up ladder as private notes and the Evaluator the rubric anchors.

**Tech Stack:** Python 3.12, Pydantic v2, FastAPI, pytest; TypeScript contract mirror in `src/types/contracts.ts`.

**Research inputs:** `docs/research/interviewer-prompts-and-flow.md`, `docs/research/question-sources-and-datasets.md`.

---

## File structure

| File | Responsibility |
|---|---|
| `backend/models/question_data.py` (modify) | `QuestionExemplar` gains `signal`, `levels`, `weak_answer_signs`; new `QuestionBank` |
| `backend/models/loader.py` (modify) | `load_question_bank(role)`, `find_exemplar(id)`, `bank_for(role, mode, level)` |
| `backend/data/question_bank/sde.json`, `ai_engineer.json` (create) | The curated questions |
| `backend/models/contracts.py` (modify) | `PlannedQuestion.exemplar_id: str | None` |
| `src/types/contracts.ts` (modify) | mirror `exemplarId?: string \| null` |
| `backend/agents/planner.py` + `prompts/planner.md` (modify) | choose from bank, personalize, tag ids |
| `backend/graph/session_start.py` (modify) | drop invented/unknown `exemplarId`s |
| `backend/agents/interviewer.py` + `prompts/interviewer.md` (modify) | private notes: signal, strong points, ladder |
| `backend/agents/evaluator.py` + `prompts/evaluator.md` (modify) | rubric anchors for calibration |
| `backend/routes/session.py` (modify) | look exemplar up server-side for turn + evaluate |
| `backend/tests/test_question_bank.py` (create) | model, loader and content-integrity tests |

---

### Task 1: Extend the exemplar model

**Files:** Modify `backend/models/question_data.py`; Test `backend/tests/test_question_bank.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from pydantic import ValidationError
from models.question_data import QuestionBank, QuestionExemplar

_Q = {
    "id": "sde-beh-ownership-1", "role": "SDE", "competency": "Behavioral & Ownership",
    "type": "behavioral", "difficulty": 3, "levels": ["mid", "senior"],
    "signal": "Owns an outcome end to end under real constraints",
    "prompt": "Tell me about a project you owned where the deadline felt unrealistic.",
    "idealAnswerPoints": ["specific situation", "own decisions", "measured result"],
    "weakAnswerSigns": ["only 'we'", "no outcome"],
    "followUpHooks": ["What did you personally decide?", "How did you know it worked?",
                      "What would you do differently?"],
    "rubric": {"criteria": {"ownership": "names decisions they personally made"}},
}


def test_exemplar_accepts_signal_levels_and_weak_signs():
    q = QuestionExemplar.model_validate(_Q)
    assert q.signal and q.levels == ["mid", "senior"] and q.weak_answer_signs


def test_exemplar_requires_at_least_three_follow_ups():
    with pytest.raises(ValidationError):
        QuestionExemplar.model_validate({**_Q, "followUpHooks": ["only one"]})


def test_bank_rejects_duplicate_ids():
    with pytest.raises(ValidationError):
        QuestionBank.model_validate({"role": "SDE", "questions": [_Q, _Q]})
```

- [ ] **Step 2: Run** `cd backend && python3 -m pytest tests/test_question_bank.py -q` → FAIL (`QuestionBank` not defined)

- [ ] **Step 3: Implement** in `backend/models/question_data.py`:

```python
Level = Literal["junior", "mid", "senior"]


class QuestionExemplar(_Base):
    id: str
    role: str
    competency: str
    type: Literal["behavioral", "technical", "system_design"]
    difficulty: Literal[1, 2, 3, 4, 5]
    prompt: str
    ideal_answer_points: list[str]
    follow_up_hooks: list[str] = Field(min_length=3)  # the follow-up ladder, shallow → deep
    rubric: Rubric
    # What this question is really testing, in one line.
    signal: str = ""
    levels: list[Level] = ["junior", "mid", "senior"]
    weak_answer_signs: list[str] = []


class QuestionBank(_Base):
    role: str
    questions: list[QuestionExemplar]

    @model_validator(mode="after")
    def _unique_ids(self) -> "QuestionBank":
        ids = [q.id for q in self.questions]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate question ids in bank")
        return self
```

(imports: `from pydantic import BaseModel, ConfigDict, Field, model_validator`). Update the
existing `tests/test_question_data.py::test_exemplar_has_followups_and_rubric` to pass three
follow-up hooks.

- [ ] **Step 4: Run** the same command → PASS; then full suite `python3 -m pytest -q -p no:warnings`
- [ ] **Step 5: Commit** `feat: give question exemplars a signal, levels and weak-answer signs`

---

### Task 2: Loader + bank lookup

**Files:** Modify `backend/models/loader.py`; Create `backend/data/question_bank/sde.json`,
`backend/data/question_bank/ai_engineer.json` (start with 2 real questions each so tests have
data; Task 7 fills them); Test `backend/tests/test_question_bank.py`

- [ ] **Step 1: Failing tests**

```python
from models.loader import bank_for, find_exemplar, load_competency_map, load_question_bank


@pytest.mark.parametrize("role", ["sde", "ai_engineer"])
def test_bank_loads_and_matches_competency_map(role):
    bank = load_question_bank(role)
    areas = {c.area for c in load_competency_map(role).competencies}
    assert bank.questions
    for q in bank.questions:
        assert q.competency in areas, f"{q.id}: unknown competency {q.competency}"


def test_ids_are_globally_unique_and_findable():
    ids = [q.id for r in ("sde", "ai_engineer") for q in load_question_bank(r).questions]
    assert len(ids) == len(set(ids))
    assert find_exemplar(ids[0]).id == ids[0]
    assert find_exemplar("nope") is None


def test_bank_for_filters_by_mode_and_level():
    picked = bank_for("sde", mode="behavioral", level="junior")
    assert picked and all(q.type == "behavioral" and "junior" in q.levels for q in picked)
    assert {q.type for q in bank_for("sde", mode="full", level="mid")} >= {"behavioral"}
```

- [ ] **Step 2: Run** → FAIL (functions missing)
- [ ] **Step 3: Implement** in `backend/models/loader.py`:

```python
from functools import lru_cache
from models.question_data import CompetencyMap, QuestionBank, QuestionExemplar

_BANK_DIR = Path(__file__).resolve().parent.parent / "data" / "question_bank"
_ROLES = ("sde", "ai_engineer")


@lru_cache(maxsize=None)
def load_question_bank(role_key: str) -> QuestionBank:
    path = _BANK_DIR / f"{role_key}.json"
    if not path.exists():
        raise FileNotFoundError(f"No question bank for role '{role_key}' at {path}")
    return QuestionBank.model_validate(json.loads(path.read_text()))


def bank_for(role_key: str, *, mode: str, level: str) -> list[QuestionExemplar]:
    return [
        q for q in load_question_bank(role_key).questions
        if level in q.levels and (mode == "full" or q.type == mode)
    ]


def find_exemplar(exemplar_id: str | None) -> QuestionExemplar | None:
    if not exemplar_id:
        return None
    for role in _ROLES:
        for q in load_question_bank(role).questions:
            if q.id == exemplar_id:
                return q
    return None
```

- [ ] **Step 4: Run** → PASS · **Step 5: Commit** `feat: load the question bank and look questions up by id`

---

### Task 3: Contract — `exemplarId` on planned questions

**Files:** Modify `backend/models/contracts.py`, `src/types/contracts.ts`; Test `backend/tests/test_contracts.py`

- [ ] **Step 1: Failing test** (append to `test_contracts.py`)

```python
def test_planned_question_carries_optional_exemplar_id():
    base = {"id": "q0", "type": "behavioral", "prompt": "p", "targetDifficulty": 3,
            "weightedFromWeakness": False}
    assert PlannedQuestion.model_validate(base).exemplar_id is None
    q = PlannedQuestion.model_validate({**base, "exemplarId": "sde-beh-ownership-1"})
    assert q.model_dump(by_alias=True)["exemplarId"] == "sde-beh-ownership-1"
```

- [ ] **Step 2: Run** → FAIL · **Step 3:** add to `PlannedQuestion`:
  `exemplar_id: str | None = None  # bank question this was built from; None = custom`
  and in TS `PlannedQuestion`: `exemplarId?: string | null;`
- [ ] **Step 4: Run** backend tests + `npx tsc -b --noEmit` → PASS · **Step 5: Commit** `feat: tag planned questions with the bank question they came from`

---

### Task 4: Planner chooses from the bank

**Files:** Modify `backend/agents/planner.py`, `backend/prompts/planner.md`, `backend/graph/session_start.py`; Test `backend/tests/test_planner_agent.py`, `backend/tests/test_session_start_graph.py`

- [ ] **Step 1: Failing tests**

```python
# test_planner_agent.py
def test_planner_receives_bank_candidates_as_input():
    llm = _FakeLLM(_PLAN_PAYLOAD)   # existing fake in this file
    PlannerAgent(llm=llm, model="m").run(
        session_id="s", profile=_PROFILE, memory=_MEMORY, competency_map=_CMAP,
        mode="behavioral", level="junior",
        bank=bank_for("sde", mode="behavioral", level="junior"))
    assert "QuestionBank" in llm.last["user"]
    assert "sde-beh-" in llm.last["user"]
```

```python
# test_session_start_graph.py
def test_unknown_exemplar_ids_are_dropped_not_trusted():
    plan = _plan_with(exemplar_ids=["sde-beh-ownership-1", "made-up-id"])  # helper builds a QuestionPlan
    cleaned = keep_known_exemplars(plan)
    assert [q.exemplar_id for q in cleaned.questions] == ["sde-beh-ownership-1", None]
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement**
  - `PlannerAgent.run(..., bank: list[QuestionExemplar] | None = None)` appends
    `"\n\nQuestionBank (choose from these):\n" + json.dumps([{id, type, competency, difficulty, levels, signal, prompt}…])`
    — only those fields; ladders/rubrics stay out of the planner to keep it lean.
  - `graph/session_start.py`: planner node passes `bank=bank_for(role_key, mode=mode, level=level)`;
    after the planner, `plan = keep_known_exemplars(plan)` where

    ```python
    def keep_known_exemplars(plan: QuestionPlan) -> QuestionPlan:
        qs = [q.model_copy(update={"exemplar_id": q.exemplar_id if find_exemplar(q.exemplar_id) else None})
              for q in plan.questions]
        return plan.model_copy(update={"questions": qs})
    ```
  - `prompts/planner.md` new section "Using the QuestionBank": pick bank questions first;
    set `exemplarId` to the bank id; rephrase to fit the candidate's résumé (name their real
    project/stack) WITHOUT changing what is being tested; at most one custom question
    (`exemplarId: null`) and only for a résumé-specific deep-dive the bank can't cover;
    memory weighting rules unchanged.
- [ ] **Step 4: Run** → PASS · **Step 5: Commit** `feat: planner builds the session from the question bank`

---

### Task 5: Interviewer gets the follow-up ladder as private notes

**Files:** Modify `backend/agents/interviewer.py`, `backend/routes/session.py`, `backend/prompts/interviewer.md`; Test `backend/tests/test_interviewer_agent.py`, `backend/tests/test_api_routes.py`

- [ ] **Step 1: Failing tests**

```python
# test_interviewer_agent.py
def test_interviewer_gets_private_notes_when_question_has_an_exemplar():
    llm = _FakeLLM(_FOLLOW_UP)
    ex = find_exemplar("sde-beh-ownership-1")
    InterviewerAgent(llm=llm, model="m").run_turn(
        question=_Q, candidate_answer="we did it", follow_up_count=0,
        is_last_question=False, exemplar=ex)
    assert "Interviewer notes (private" in llm.last["user"]
    assert ex.follow_up_hooks[0] in llm.last["user"]


def test_no_notes_for_custom_questions():
    llm = _FakeLLM(_FOLLOW_UP)
    InterviewerAgent(llm=llm, model="m").run_turn(
        question=_Q, candidate_answer="x", follow_up_count=0, is_last_question=False)
    assert "Interviewer notes" not in llm.last["user"]
```

```python
# test_api_routes.py — the server looks the exemplar up itself
def test_turn_looks_up_exemplar_server_side():
    seen = {}
    class _Spy(_FakeLLM):
        def structured(self, **kw):
            seen["user"] = kw["user"]; return super().structured(**kw)
    client = TestClient(create_app(llm=_Spy({"InterviewDecision": _DECISION_FOLLOW_UP}), store=InMemoryStore()))
    client.post("/api/session/turn", json={
        "question": {**_QUESTION_BODY, "exemplarId": "sde-beh-ownership-1"},
        "answer": "we did it", "followUpCount": 0, "isLast": False})
    assert find_exemplar("sde-beh-ownership-1").follow_up_hooks[0] in seen["user"]
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement**
  - `run_turn(..., exemplar: QuestionExemplar | None = None)`; when present append:

    ```python
    notes = (
        "\nInterviewer notes (private — never read out, never reveal):\n"
        f"- Tests: {exemplar.signal}\n"
        f"- A strong answer covers: {'; '.join(exemplar.ideal_answer_points)}\n"
        f"- Weak-answer signs: {'; '.join(exemplar.weak_answer_signs)}\n"
        f"- Follow-up ladder (shallow → deep): {' → '.join(exemplar.follow_up_hooks)}\n"
    )
    ```
  - route `turn`: `exemplar=find_exemplar(req.question.exemplar_id)`.
  - `prompts/interviewer.md`: when notes are present, pick the next ladder rung that targets the
    biggest *uncovered* strong-answer point, phrased in your own words and tied to what they said;
    never read the notes aloud or list them; never reveal the strong-answer points.
- [ ] **Step 4: Run** → PASS · **Step 5: Commit** `feat: interviewer follows the question's planned follow-up ladder`

---

### Task 6: Evaluator gets rubric anchors

**Files:** Modify `backend/agents/evaluator.py`, `backend/routes/session.py`, `backend/prompts/evaluator.md`; Test `backend/tests/test_evaluator_agent.py`, `backend/tests/test_api_routes.py`

- [ ] **Step 1: Failing tests** — same shape as Task 5: `EvaluatorAgent.run(..., exemplar=ex)` puts
  `"Rubric anchors for this question"` plus `ex.ideal_answer_points[0]` and each
  `ex.rubric.criteria` value in the user message; absent when `exemplar=None`; the
  `/api/session/evaluate` route looks it up from `question.exemplarId`.
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement** — append anchors block; evaluator prompt: "When anchors are given,
  score against them: an answer missing most strong-answer points cannot score above 3 on
  depth/specificity; matching a weak-answer sign caps that criterion at 2."
- [ ] **Step 4: Run** → PASS · **Step 5: Commit** `feat: evaluator scores against the question's rubric anchors`

---

### Task 7: Bank content

**Files:** Fill `backend/data/question_bank/sde.json`, `ai_engineer.json`

Source and licensing rules come from `docs/research/question-sources-and-datasets.md`:
write questions in our own words; never paste copyrighted question text.

Findings that shape this task (research, 2026-10-27):
- No public dataset has graded answers with rubrics for SWE / AI-engineer interviews; the
  HF "interview" datasets are private, gated, or scraped low-quality text — none used.
- Stems may be adapted (with attribution) from MIT / CC BY sources only: Tech Interview
  Handbook (MIT), system-design-primer (CC BY 4.0), alirezadir/Machine-Learning-Interviews
  (MIT). Never from CC BY-NC-ND (ByteByteGo, karanpratapsingh), books, unlicensed repos,
  Glassdoor / LeetCode / interviewing.io. Generic problem names ("design a URL shortener") are fine.
- Rubric method: one shared scale, anchors written per question, pre-planned probes (US OPM
  structured-interview guidance, public domain); poor / borderline / solid / outstanding
  levels (Google re:Work, paraphrased).
- Add `source: str = ""` to `QuestionExemplar` ("original" or "adapted from <name> (<license>)")
  and a `backend/data/question_bank/ATTRIBUTION.md` listing every adapted source + license.

Coverage target per role (≈30 questions): every competency in the role's competency map,
each type, and each level; system design uses the canonical problem list from the research
doc; every question has ≥3 ladder rungs taken from the ladders in
`docs/research/interviewer-prompts-and-flow.md`.

- [ ] **Step 1:** Integrity tests already guard structure (Task 2). Add:

```python
@pytest.mark.parametrize("role", ["sde", "ai_engineer"])
def test_bank_covers_every_type_and_level(role):
    qs = load_question_bank(role).questions
    for t in ("behavioral", "technical", "system_design"):
        for lvl in ("junior", "mid", "senior"):
            assert sum(q.type == t and lvl in q.levels for q in qs) >= 2, (t, lvl)


@pytest.mark.parametrize("role", ["sde", "ai_engineer"])
def test_bank_prompts_are_single_ask(role):
    for q in load_question_bank(role).questions:
        assert q.prompt.count("?") <= 1, q.id   # planner sizing rule: one ask
```

- [ ] **Step 2:** Run → FAIL (bank still has 2 questions) · **Step 3:** write content ·
  **Step 4:** Run → PASS · **Step 5:** Commit `feat: curated SDE and AI engineer question banks`

---

### Task 8: Interview structure + prompt changes from the research gap analysis

Source: "Gap analysis" in `docs/research/interviewer-prompts-and-flow.md`. Decisions
(2026-10-27) — adopted now:

1. **Round shape (planner.md):** `full` mode = 4 questions: 1 behavioral, 2 technical,
   1 system design (was 5 mixed). Single-type modes stay at their current counts except
   `system_design` = 2 problems (one problem needs room for a deep dive).
2. **Don't give away the requirements signal (planner.md + bank):** system-design prompts
   state the problem only — no "what would you clarify first?", no scale numbers. Marcus
   supplies constraints only when the candidate asks (clarify action already exists).
3. **Follow-up budget per type (interviewer.py + interviewer.md + frontend label):**
   behavioral 3, technical 3, system design 6, passed to the model as `followUpBudget`;
   rule becomes `followUpCount >= followUpBudget → advance/complete`. Also advance early
   when the last two replies added nothing new. Frontend shows "FOLLOW-UP n" (no "/2").
   Test: the user message contains `followUpBudget: 6` for a system_design question.
4. **At least one probe per question (interviewer.md):** before moving on, ask at least one
   follow-up — CLAUDE.md's hard rule, and what real interviewers do. Exceptions: the
   "still stuck after a hint" path. Golden cases expecting advance at followUpCount 0 are
   relabeled with a `note` (expected: decision accuracy stays ≥ 95%).
5. **Five-rung hint ladder (interviewer.md):** narrow scope → point a direction → "there's a
   case this misses" → a specific input → name the problem; never the answer.
6. **Wrong-answer branch (interviewer.md):** never correct; ask about the input/case that
   breaks their claim.
7. **Behavioral probes that crack rehearsed stories (interviewer.md):** "you said 'we' —
   what did you do?", "what else did you consider?", hard-to-fake details (how a number was
   measured, who disagreed).
8. **Survival means survival (evaluator.md):** `wouldSurviveRealInterview` is false if the
   answer contradicted itself, collapsed under a probe, or only came after the most explicit
   hint — even when rubric scores are ≥ 3.

Deferred (recorded in docs/TODO.md, not in this branch): private `notes` field on
InterviewDecision passed to the Evaluator; new rubric criteria + weakness tags (ripples into
Memory and frontend); per-question target signals from memory; level-driven
who-leads-the-session.

Each change is checked by the live eval (Task 9) — no change ships if it lowers decision
accuracy or raises the judgment-leak rate.

- [ ] Commit `refactor: tighten interviewer prompts from interview-practice research`

---

### Task 9: Measure

- [ ] Add ≥6 golden cases using bank questions (`backend/evals/golden/interview_turn_cases.json`):
  a weak answer that misses the top strong-answer point must get a follow-up targeting it.
- [ ] Live run: `AWS_PROFILE=crucible python3 -c "from evals.run_accuracy_eval import main; main('question_bank')"`
  Expect: decisions ≥ 95%, survival verdicts ≥ 95%, judgment leaks 0%.
- [ ] Live end-to-end interview via the Playwright driver; review transcript for: questions
  sound like a real interviewer, follow-ups follow the ladder, no repeated topics.
- [ ] Record numbers in `README.md` and `docs/OVERVIEW.md`; tick items in `docs/TODO.md`.
- [ ] Commit `test: measure bank-backed questions against live models`
