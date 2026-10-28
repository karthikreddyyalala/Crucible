# Interviewer prompts and interview flow: research notes

Researched 2026-10-27 for the Interviewer ("Marcus"), Planner and Evaluator agents.
Compared against `backend/prompts/interviewer.md`, `backend/prompts/planner.md`,
`backend/prompts/evaluator.md` and `backend/agents/interviewer.py` as of commit `0c21d6a`.

**Source quality key** used throughout:
- **[P]** primary: the actual prompt source code, or a company's own interviewer guidance
- **[B]** practitioner book or guide written by interviewers (Holloway, Tech Interview Handbook)
- **[V]** vendor or prep-company blog. Useful, but it is selling interview prep
- **[S]** my synthesis from several sources plus common practice. No single citation

---

## 1. Summary of key findings

1. **The round shape is the biggest gap, more than the prompt wording.** A real system
   design round is *one* problem for 35 to 45 minutes, run through phases (requirements,
   API, high-level design, deep dives). A real coding round is one or two problems with
   many turns. Our Planner gives 5 separate questions in every mode, and the Interviewer
   caps follow-ups at 2. That works for behavioral and makes system design shallow by
   construction. [P: Hello Interview, interviewing.io; B: Tech Interview Handbook]
2. **Good interviewers hold information back.** IliaLarchenko/Interviewer's problem
   generator says: don't give requirements, *"let candidate ask about them."* Our Planner's
   own good example ("Design a service ... — what would you clarify first?") gives away
   the requirements-gathering signal the Evaluator then scores. [P]
3. **Hints are graduated in about five rungs, not two.** Holloway: hints go from general
   to specific, with the explicit problem statement as the last resort. Our prompt has
   two rungs and moves on after one failed hint. [B]
4. **Bugs are surfaced by asking about one specific input, not by naming the bug.**
   Ilia: *"don't point on them directly, and let the candidate find and debug them."*
   Holloway: *"What happens if you pass the argument 8 to this function?"* Our prompt
   has nothing on what to do when the candidate says something *wrong*, as opposed to
   vague. [P][B]
5. **Behavioral probing is about isolating the candidate's own actions and pulling out
   details that are hard to make up.** zixi-liu's prompt: probes should *"elicit
   AUTHENTIC details that can't be fabricated"* and *"clarify personal contribution vs
   team effort."* Grove: *"ask fewer questions overall, but ... go deeper."* Our ladder
   (thinking, outcome, differently, scale) skips ownership isolation and alternatives
   considered, which are the two probes that most often expose a rehearsed story.
   [P][V]
6. **Private interviewer notes are a proven pattern.** Ilia's interviewer writes hidden
   `#NOTES#` (mistakes, bugs, missed aspects) on every turn, and the grader reads them.
   Our Interviewer sees things live and throws them away. The Evaluator only sees the
   transcript. [P]
7. **Who drives depends on level.** interviewing.io: junior, the interviewer drives;
   senior, *"it's a good sign if you direct more of the interview."* Hello Interview:
   senior candidates should find the weaknesses themselves in deep dives. We pass
   `Level` to the Interviewer but never tell it what to do with it. [P/V]
8. **Most open-source interviewer prompts are weaker than ours** on neutrality,
   spoken-voice style and injection hardening. FoloUp and GPTInterviewer are thin.
   Ours is already ahead on those. The gaps are in round structure, hinting, notes,
   level calibration and the follow-up budget, not in tone.

---

## 2. What open-source interviewer prompts do

### 2.1 IliaLarchenko/Interviewer: the most serious one (Apache-2.0, ~130 stars)

Links: [GitHub](https://github.com/IliaLarchenko/Interviewer) ·
[prompts.py](https://github.com/IliaLarchenko/Interviewer/blob/main/resources/prompts.py) ·
[HF Space](https://huggingface.co/spaces/IliaLarchenko/interviewer). Apache-2.0, so the
text can be adapted with attribution.

Structure: three base prompts (problem generation, interviewer, grader), each with a
per-round suffix (coding, system design, ML design, SQL, math, ML theory).

Verbatim excerpts from `base_interviewer`:
- *"Be very concise in your responses. Allow the candidate to lead the discussion,
  ensuring they speak more than you do."*
- *"Never repeat, rephrase, or summarize candidate responses. Never provide feedback
  during the interview."*
- *"Never repeat your questions or ask the same question in a different way if the
  candidate already answered it."*
- *"Never assume anything the candidate has not explicitly stated."*
- *"When appropriate, challenge the candidate's assumptions or solutions, forcing them
  to evaluate alternatives and trade-offs."*
- *"Make sure the candidate explored all areas of the problem and provides a
  comprehensive solution. If not, ask about the missing parts."*
- *"Understanding the candidate's intent, especially when using voice recognition which
  may introduce errors."*
- Hidden notes: *"You can make some notes that is not visible to the candidate but can
  be useful for you or for the feedback after the interview, return it after the
  #NOTES# delimiter ... Make notes when you encounter: mistakes, bugs, incorrect
  statements, missed important aspects, any other observations."*

Coding suffix: *"Initially ask the candidate to propose a solution in a theoretical
manner before coding."* · *"After coding, discuss the time and space complexity."* ·
*"Ask how they would adapt their solution if problem parameters changed."* · *"If you
found any errors or bugs in the code, don't point on them directly, and let the
candidate find and debug them."*

System design suffix: starts with functional and non-functional requirements, then
*"main API methods"*, then *"Their approach to system schemes that could operate on a
single machine"*, then *"Database choices, schema design, sharding, and replication"*,
then *"scaling the system and addressing potential failure points"*, then monitoring.
*"You can occasionally go deeper with questions about topics/parts of solution that are
the most important."*

Problem generation: *"Don't provide any detailed requirements or constrains or anything
that can lead to the solution, let candidate ask about them."* · *"Keep the problem
statement very open ended and let the candidate lead the solution and ask for the
missing information."*

Grader: *"aiming to fail candidates who do not meet very high standards"* · *"state
when the available information is insufficient to make a comprehensive evaluation"* ·
the grader is told it may use the *"hidden notes, left by interviewer."*

**Takeaways for us:** the hidden-notes channel, the single-machine-first step in
system design, "changed parameters" follow-ups, not pointing at bugs directly,
tolerance for speech-to-text errors, and the "insufficient data" escape hatch in grading.

### 2.2 FoloUp/FoloUp (MIT, ~1.3k stars)

Links: [constants.ts](https://github.com/FoloUp/FoloUp/blob/main/src/lib/constants.ts) ·
[prompts/](https://github.com/FoloUp/FoloUp/tree/main/src/lib/prompts). A Retell voice
agent aimed at recruiters, not candidates.

- Interviewer prompt in full is about 15 lines: *"You are an interviewer who is an
  expert in asking follow up questions to uncover deeper insights."* · *"Once you ask a
  question, make sure you ask a follow up question on it."* · *"The question word count
  should be 30 words or less."*
- Personas are numeric sliders (`rapport`, `exploration`, `empathy`, `speed`) shown in
  the UI, but the sliders never reach the prompt.
- Analytics prompt scores 12 factors including *"Consistency: Evaluate if the
  interviewee's answers are consistent throughout the interview or if they contradict
  themselves"* and *"Listening Skills ... responding appropriately to follow-up
  questions."*

**Takeaways:** one mandatory follow-up per question (matches our CLAUDE.md "probe at
least once"), the ~30-word cap on a question, and **consistency across the session** as
something to score. Otherwise it is shallow.

### 2.3 1146345502/aural-oss (MIT, ~220 stars)

Link: [src/lib/ai/prompts/interviewer.ts](https://github.com/1146345502/aural-oss/blob/main/src/lib/ai/prompts/interviewer.ts)

- Follow-up budget is configurable (`followUpDepth`) and is a hard cap: *"Move on as soon
  as you have a reasonable answer — you do not have to spend the full budget."* Research
  questions get a bigger budget.
- *"Answering a question the participant asks you, or repeating the question for them,
  does not count against this budget"* (we already do this with `clarify`).
- Coding: *"Do NOT move on until they have written code AND explained their approach"*,
  then complexity and improvements.
- Separate `buildFollowUpDetectionPrompt` that classifies vague, short, unexplored
  threads or emotionally significant answers.
- Lets the candidate go back to an earlier question.

**Takeaways:** a **per-type follow-up budget** (bigger for system design and coding) is
already a working pattern. So is a "go back to an earlier question" path.

### 2.4 zixi-liu/interview-ai-prototype (~220 stars, **no license**)

Link: [prompts.py](https://github.com/zixi-liu/interview-ai-prototype/blob/main/prompts.py).
There is no license file, so it is all rights reserved. **Read for ideas only. Do not
copy the text.** Quotes below are short excerpts for research.

The most sophisticated behavioral prober found:
- Probing questions must be *"Specific to THIS answer (not generic templates)"*,
  *"Designed to clarify personal contribution vs team effort"*, and *"should elicit
  AUTHENTIC details that can't be fabricated."*
- `ProbingAgent`: a value-of-information loop. For each gap it estimates
  severity × probe value × uncertainty minus a fatigue cost that grows each turn. It
  stops when the value drops to zero or below, when confidence reaches 80%, or after
  *"Last 2 responses showed diminishing returns"*. Hard cap of 8 turns.
- A classifier for each response: `ANSWER_GOOD`, `ANSWER_VAGUE`, `ANSWER_PARTIAL`,
  `ASKS_QUESTION`, `SAYS_IDK`, `OFF_TOPIC`, `NEW_INFO`, `PUSHBACK`, `OTHER`, with a
  policy hint for each. For example, PUSHBACK: *"Acknowledge their perspective, adjust
  approach or move on."*
- Follow-up calibration criteria: did probes add *"NEW concrete details (names, numbers,
  timelines, metrics)"*, *"Consistency: Were there any contradictions or gaps compared to
  the original story?"*, plus ownership and self-awareness.
- Gaps by level: Junior-Mid = clarity, specifics, basic ownership. Senior = ownership,
  cross-team impact, decision-making, metrics. Staff = strategy, org-wide influence.

**Takeaways:** our classifier is effectively clarify / IDK / vague / sufficient. It is
missing **PUSHBACK** (the candidate disagrees with the premise) and **NEW_INFO** (the
probe answer changes the picture). Evaluating *whether follow-up answers added new,
consistent detail* is a sharp `wouldSurviveRealInterview` signal that we don't compute.

### 2.5 espetro/dits (CPAL-1.0, new)

Link: [packages/shared/src/interview-agent.ts](https://github.com/espetro/dits/blob/main/packages/shared/src/interview-agent.ts).
A minimal voice agent. The prompt is about 6 lines: *"Speak naturally, one question at a
time. Keep responses short and conversational."* · *"If the candidate's answer is unclear,
ask one brief follow-up."* The useful idea is a tool (`read_editor`, whiteboard, code)
that lets the interviewer *read the candidate's workspace*. That is relevant if we add a
code pad or diagram canvas. CPAL needs attribution if the code is reused.

### 2.6 jiatastic/GPTInterviewer (MIT, ~260 stars)

Link: [prompts/prompts.py](https://github.com/jiatastic/GPTInterviewer/blob/main/prompts/prompts.py).
Templates like *"I want you to act as an interviewer. Remember, you are the interviewer
not the candidate."* plus "Do not repeat the question." No follow-up logic. Listed only to
show how thin the median open-source interviewer is.

---

## 3. How real interviewers run each round

### 3.1 Cross-round norms

- **Opening** [B: Tech Interview Handbook]: introduce yourself, have the candidate
  introduce themselves, explain the format, *"you don't have to finish all"* questions,
  and warn that *"you might interrupt."* Marcus already does most of this. Missing: the
  "I may interrupt or redirect, that's normal" warning. That warning matters because
  Marcus does cut answers short.
- **Talk time:** the candidate talks most. Ilia: *"ensuring they speak more than you
  do."* Practitioner rule of thumb is about 20/80 interviewer/candidate [S]. Our "at
  most two short sentences" rule already enforces this.
- **Neutrality:** no feedback during the interview (Ilia: *"Never provide feedback
  during the interview"*). Ours is stricter and better, with an explicit banned-phrase
  list.
- **Structured interviewing** [P: Google re:Work]: follow-ups are *planned* and
  *"help elicit a high level of detail"*. They should be mapped to the attributes the
  first prompt doesn't cover. Rubrics define *"what outstanding, solid, borderline, and
  poor response looks like."* Structured interviews are *"more predictive of job
  performance than unstructured interviews."* Implication: the Planner should emit, for
  each question, **which signals the question must collect**, so Marcus's follow-ups
  target missing signals rather than whatever looks vague. (The academic base is
  Levashina et al. 2014, *Personnel Psychology* 67:241–293. It treats probing as a
  structure dimension. I did not get the full text, so no claims beyond that.)
- **Pursue the charitable explanation** [B: Holloway]: *"Any time a possible
  exculpatory explanation exists, a good interviewer will pursue it."* Vague or evasive
  answers are *"often signs that the candidate either doesn't know the answer or is
  trying to hide something"*, and need *"specific or direct follow-up questions."*
- **Timekeeping and closing** [B: TIH]: track the time spent on each question, stop
  with about 5 minutes left, and let the candidate ask questions. Marcus's closing phase
  already covers this.
- **Transitions:** a one-clause bridge that names the change of round ("Let's switch to
  something more technical") [S]. We already do this.

### 3.2 Behavioral

- **Fewer questions, deeper.** Grove VC: *"we ask fewer questions overall, but when we
  come across an interesting situation, we go deeper."* The key skill is *"the ability to
  break a topic into sub-questions."* [V, but a hiring playbook, not prep marketing]
- **Probe count:** prep sites claim Amazon bar raisers ask 3 to 4 stories with 5 to 8
  probes each. **Unverified [V].** The consensus pattern across sources is 2 to 4
  questions in a 45-minute behavioral round, with 3 to 6 probes each [S].
- **What probes are for** (the behavioral event interview tradition: McClelland, then
  Spencer & Spencer, *Competence at Work*, 1993. Seen only through secondary sources):
  drill into **one incident**. Ask what happened, what *you* thought, what *you* did,
  what *you* said, and what resulted. This pulls the candidate out of the rehearsed
  summary.
- **Isolating ownership:** Grove says probing *"helps identify the candidate's actual
  role"* and filters out *"candidates [who] take credit for work that others on the team
  did."* The usual tell is "we" with no "I", or "I" that turns out to mean "I was in
  the meeting."
- **Spotting embellishment** [S, consistent with zixi-liu and Holloway]: ask for details
  that are cheap to give if true and expensive to invent. These include the actual
  number and how it was measured, who disagreed and what they said, the alternatives
  that were rejected, the timeline, and the specific moment a decision was made. Then
  check consistency with what was said earlier. Rehearsed stories are smooth at
  STAR level and go thin after two levels of "how".
- **Senior candidates** [B: TIH senior behavioral]: interviewers *"dive deep into
  decision-making processes, ask about alternatives you considered"*. They interrupt
  more, and candidates are told to put results first because *"you might never reach
  your conclusion."*
- **Reflection:** "Looking back, would you do anything differently?" (Grove) is
  standard. A bar-raiser anecdote [V, Glassdoor] shows it repeated when the first
  answer is generic.

### 3.3 Technical (coding / technical discussion)

- **Flow** [P: Ilia, B: TIH]: restate and clarify, then approach before code, then
  brute force, then optimize, then code, then walk through tests and edge cases, then
  complexity, then a change of parameters. Don't let the candidate spend too long on one
  question.
- **When to hint** [B: Holloway]: *"not too early, before the candidate has time to
  think; and not too late."* *"If a candidate is clearly stuck for more than a few
  minutes, it's usually time to get them unstuck."*
- **Graduated hints** [B: Holloway, verbatim examples, general to specific]:
  1. Narrow the scope: *"Don't worry about how this would work when stored on disk; you
     can focus on solving this in memory."*
  2. Point a direction: *"You mentioned binary trees; you might want to explore that
     direction further."*
  3. General feedback: *"It seems like there are cases this solution doesn't handle."*
  4. Specific input: *"What happens if you pass the argument 8 to this function?"*
  5. Explicit problem: *"If your solution were to handle multiple connections
     simultaneously, it would have race conditions."*
  Watch the reaction: *"Oh, of course, that was silly of me"* (a slip) versus
  confusion (a real gap). If the candidate still can't recover, TIH says give the
  solution and move on so you still get signal on the rest.
- **Wrong (not vague) answers:** don't say "that's wrong". Ask about a specific input
  or case that breaks it (Ilia, Holloway). Note it privately.

### 3.4 System design

- **Phase flow and timing** [V: Hello Interview, ~45 min]: Requirements (~5 min, pick
  3 to 5 numeric non-functional requirements), Core entities (~2), API (~5), optional
  Data flow (~5), High-level design (~10 to 15), Deep dives (~10). Ilia adds a
  *single-machine design first* step before sharding and replication.
- **Who steers** [V: interviewing.io]: *"The path your interview takes will be steered
  by your interviewer"*. Junior: *"your interviewer should determine the direction and
  speed"*. Senior: *"it's a good sign if you direct more of the interview."* Hello
  Interview says junior candidates *"can expect the interviewer to jump in"* during deep
  dives, while seniors find the weaknesses themselves.
- **What deep-dive questions sound like** [V: interviewing.io verbatim]: *"Is this ID
  going to be exposed to users? If so, how long does it need to be to avoid
  collisions?"* · *"Why Cassandra and not some_other_db?"* Interviewers *"may also
  change the requirements and ask how you could adapt your solution"*, or *"ask you to
  produce a more detailed design for one or more components."*
- **Interviewers withhold requirements** so that asking for them is the signal (Ilia).
  When asked, they give concrete numbers.

---

## 4. Follow-up ladders per round type

Shallow to deep. Ask one rung per turn, starting at the first rung the answer hasn't
already cleared. [S] unless quoted. A quoted line marks a source phrase. Everything else
is our wording, shaped for Marcus's voice.

### 4.1 Behavioral (one story, drilled)

| # | Target | Probe |
|---|---|---|
| 1 | Situation | "Set the scene for me. When was this, and what was your role on the team?" |
| 2 | Stakes | "What would have happened if nobody had done anything?" |
| 3 | Ownership | "You said 'we' there. What did *you* personally do?" |
| 4 | Ownership | "Which part of that was your call, and which was someone else's?" |
| 5 | Decision | "What were you thinking at that point?" |
| 6 | Alternatives | "What other options did you consider, and why didn't you pick them?" |
| 7 | Conflict | "Who disagreed with that? What did they say?" |
| 8 | Influence | "How did you get them on board?" |
| 9 | Evidence | "How did you know it worked? What did you measure?" |
| 10 | Evidence | "What was the number before, and after?" |
| 11 | Hard part | "What was the hardest moment, specifically?" |
| 12 | Failure | "What went wrong along the way?" |
| 13 | Reflection | "Looking back, would you do anything differently?" (Grove) |
| 14 | Generalising | "What did you change about how you work afterwards?" |
| 15 | Level-up (senior) | "How would that have played out if you'd had to do it across three teams?" |

Embellishment check: after rung 9 or 10, if the candidate can't name how a number was
measured, or the story changes (timeline, who did what), treat the answer as unproven
rather than wrong. Note it for the Evaluator.

### 4.2 Technical / coding discussion

| # | Target | Probe |
|---|---|---|
| 1 | Understanding | "Before you start, what are the inputs and outputs here? Anything you'd want to clarify?" |
| 2 | Approach | "Talk me through the approach before any code." |
| 3 | Baseline | "What's the simplest thing that works, even if it's slow?" |
| 4 | Complexity | "What's the time and space complexity of that?" |
| 5 | Optimise | "Can we do better?" |
| 6 | Mechanism | "Why does that data structure get you there?" |
| 7 | Edge cases | "What inputs would break it?" |
| 8 | Concrete case | "What happens if the list is empty?" / "...if you pass it 8?" (Holloway) |
| 9 | Correctness | "Walk me through it on a small example." |
| 10 | Testing | "How would you test this?" |
| 11 | Changed parameters | "What if the data doesn't fit in memory?" (Ilia: *"adapt their solution if problem parameters changed"*) |
| 12 | Concurrency | "What happens if two threads call this at the same time?" |
| 13 | Production | "How would you know this was misbehaving in production?" |

Hint ladder when stuck (separate from the probe ladder, and counted separately):
narrow the scope, then point a direction, then "there are cases this misses", then a
specific input, then name the problem explicitly. After that, move on and note it
(Holloway).

### 4.3 System design (one problem, phase by phase)

| # | Phase | Probe |
|---|---|---|
| 1 | Requirements | (Say nothing. Wait for them to ask.) If they jump straight in: "Before we draw anything, what does this need to do?" |
| 2 | Non-functional | "How many users, and what latency would be acceptable?" |
| 3 | Scope | "What are you deliberately leaving out?" |
| 4 | API | "What does the API look like? What does a client actually call?" |
| 5 | Data model | "What are you storing, and how is it keyed?" |
| 6 | Single node | "Before scaling, how would this work on one machine?" (Ilia) |
| 7 | Choice | "Why that database and not [alternative]?" (interviewing.io) |
| 8 | Bottleneck | "At ten times the load, what breaks first?" |
| 9 | Hot spot | "What happens when one celebrity key gets a million requests a second?" |
| 10 | Failure | "That node dies mid-write. What does the user see?" |
| 11 | Consistency | "Can two users see different values here? Is that acceptable?" |
| 12 | Detail | "Zoom into the [component] for me. What's inside it?" (interviewing.io) |
| 13 | Changed requirement | "Now it has to work across two regions. What changes?" (interviewing.io) |
| 14 | Tradeoff | "What did you give up by choosing that?" |
| 15 | Operations | "How would you know it's degrading before users tell you?" |

Junior: Marcus drives the phase transitions and picks the deep dive. Senior: Marcus
waits, and if the candidate doesn't pick a deep dive, asks "Where do you think this
design is weakest?" and treats whether they could answer as signal.

---

## 5. Gap analysis vs our three prompts

Ordered by impact. Each item names the file, the change, and the reason.

### 5.1 `planner.md`

1. **Make system design and coding one problem per round, not 5 questions.** In
   `mode=system_design` produce 1 (at most 2) `system_design` questions, and in
   `technical` 2 or 3. Give the Interviewer a larger follow-up budget for these
   (see 5.2 #1). *Why:* every source structures a design round as one problem over
   about 45 minutes (Hello Interview, interviewing.io, Ilia). Five separate design
   prompts with at most 2 follow-ups each can never reach a deep dive. The current
   shape trains a skill that real loops don't test.
2. **Remove "what would you clarify first?" from system design prompts, and ban leading
   suffixes.** Change the good example to "Design a service that notifies followers
   when someone goes live." Add: "Never tell the candidate what to cover (requirements,
   scale, tradeoffs). Withhold constraints; the Interviewer supplies them when asked."
   *Why:* Ilia: *"let candidate ask about them."* The Evaluator scores
   `requirements`, and the Planner currently hands that signal over.
3. **Add per-question `signals` (2 to 4 rubric targets) and `hiddenConstraints`
   (system design: scale numbers to reveal only when asked).** *Why:* Google re:Work
   says follow-ups are planned and mapped to attributes. Marcus would then probe for
   *missing signals* rather than deciding "vague" by gut. This needs an additive field
   on `QuestionPlan.questions[]` in both `models/contracts.py` and the TS types. Keep it
   optional so old plans still load.
4. **Behavioral: ask for a specific competency, and add one alternate.** One way to
   phrase it is "Tell me about a time you disagreed with a technical decision", with an
   alternate if the candidate has no such story. *Why:* in a real round, a candidate who
   says "I've never had that" gets offered a nearby prompt. Today the Interviewer has to
   improvise this.
5. **Level-scope behavioral prompts.** Senior means cross-team scope ("...that affected
   other teams"). Junior means project or school is fine. *Why:* zixi-liu and TIH
   both show the bar moving with level. Right now level only changes `targetDifficulty`.

### 5.2 `interviewer.md`

1. **Replace the global "followUpCount >= 2 → advance" with a per-type budget:**
   behavioral 3, technical 4, system design 8 (only if 5.1 #1 ships, otherwise 3).
   Keep "advance as soon as satisfied." *Why:* aural-oss shows the per-type budget
   pattern. Real behavioral rounds use 3 to 6 probes. Two follow-ups can't get past STAR
   into ownership and alternatives. Also add a diminishing-returns stop: "if their last
   two replies added no new concrete detail, advance" (zixi-liu). The budget lives in
   the prompt, so check the backend for any matching cap too.
2. **Add a system design phase map** (requirements, API, data model, single node,
   high-level, deep dive, failure and tradeoffs) and level-dependent steering. Junior:
   Marcus moves them to the next phase. Senior: Marcus waits, then asks "where is this
   weakest?" *Why:* Hello Interview and interviewing.io both describe interviewer-steered
   phases, with steering responsibility shifting to the candidate at senior level. The
   `Level` input is currently unused by the rules.
3. **Expand the hint ladder from 2 to 5 rungs** and track hints separately from
   follow-ups. The rungs are: scope down, direction, "there are cases this misses",
   a specific input, then explicit. *Why:* Holloway's graduated hints. Today a candidate
   stuck after one nudge gets moved on. That is harsher than a real interviewer and loses
   the "did they recover with a small hint?" signal.
4. **Add a WRONG (not vague) branch.** "If the answer contains a factual or logical
   error, do not correct it and do not move on. Ask about the specific input or case
   that exposes it ('What happens if two requests hit that key at the same moment?')."
   *Why:* Ilia: *"don't point on them directly, and let the candidate find and debug
   them."* Today rule 4 or 5 might advance on a confident wrong answer, or probe it as
   merely vague.
5. **Add a private `notes` field to `InterviewDecision`** (never spoken). It records
   mistakes, contradictions, hints given, and level of hint needed. Pass notes to the
   Evaluator. *Why:* Ilia's `#NOTES#` channel. Marcus spots things the Evaluator can't
   reconstruct from text, for example that a correct-sounding answer came only after
   the third hint. Schema change in `models/contracts.py`. Default to empty.
6. **Add ownership and alternatives to the behavioral ladder.** Insert "You said 'we',
   what did *you* do?" and "What else did you consider?" ahead of "scale to a team",
   and add the "details hard to fabricate" principle. *Why:* Grove and zixi-liu. These
   are the probes that crack rehearsed STAR stories, and CLAUDE.md lists the gap
   "it pushes back on vague answers" as the core demo.
7. **Handle PUSHBACK and NEW_INFO.** If the candidate challenges the premise ("I'd never
   build it that way"), engage with it in one sentence and probe their alternative, not
   the original framing. If a probe answer reveals new information, follow *that*
   thread. *Why:* zixi-liu's response ontology. Today pushback probably falls into
   "vague", which reads as robotic.
8. **Settle the "at least one probe" conflict.** CLAUDE.md says to probe with
   why/how *at least once per answer*. Rule 4 allows advancing with zero. Choose one.
   Recommendation: always probe once, except when the answer already clears every
   planned `signal` (5.1 #3). *Why:* FoloUp also mandates one follow-up, and an
   unprobed answer gives the Evaluator no follow-up data for `wouldSurviveRealInterview`.
9. **Warmup: add "I may interrupt or redirect you, that's normal."** *Why:* TIH opening
   norm. It makes Marcus's short probes feel intended rather than rude.
10. **Speech-to-text tolerance.** "The transcript comes from speech recognition. Interpret
    likely mis-hearings charitably ('cash' = 'cache'); never probe a transcription
    artifact." *Why:* Ilia lists this explicitly. Browser STT will produce these errors.
11. **Pass Memory weak spots to the Interviewer.** `weightedFromWeakness` is on the plan,
    but Marcus doesn't know *which* weakness (for example `no-edge-cases`) a question
    targets. Add the tag so his first probe goes at it. *Why:* the core differentiator
    from CLAUDE.md is cross-session memory that reshapes practice. Today it only shapes
    question *selection*, not the probing. Needs a `weaknessTarget` field on the planned
    question.

### 5.3 `evaluator.md`

1. **Score the follow-up answers explicitly.** Add a criterion or input to
   `survivalReasoning`: did probe answers add *new concrete detail* (numbers, names,
   timeline, measured outcome), and were they *consistent* with the first answer?
   *Why:* zixi-liu's calibration and FoloUp's "Consistency". "Would it survive the
   follow-up grilling" is literally what `wouldSurviveRealInterview` claims to measure.
   At the moment it is derived only from the four rubric scores.
2. **Make `wouldSurviveRealInterview` more than "all scores ≥ 3."** Keep that as a
   necessary condition. Also require false if the answer collapsed under a probe
   (contradiction, "I don't remember" on the core claim) or if the core result came
   only after an explicit (rung 5) hint. *Why:* today a fluent rehearsed story that
   collapses on probe 2 can still score ≥ 3 on structure and specificity and "survive",
   which is the opposite of the product promise.
3. **Level calibration.** Add "the same answer scores lower at senior: senior requires
   cross-team scope, alternatives considered, and self-directed tradeoffs." *Why:*
   zixi-liu bar-raiser plus interviewing.io. Mode and level are not inputs to the
   Evaluator today. Pass them.
4. **Add rubric criteria where real rubrics differ.**
   - Behavioral: add `reflection` (what they learned or would change). Merge
     `structure` into the overall score. STAR form is the least predictive signal and
     the easiest to rehearse.
   - Technical: add `complexity` and `testing`. Ilia's coding rubric and every coding
     flow include both. Today they hide inside `depth` and `edge_cases`.
   - System design: add `api_data_model` (Ilia, Hello Interview step 3) and
     `failure_handling`.
   Matching weakness tags: `no-reflection`, `no-complexity`, `untested`,
   `story-inconsistent`, `needed-heavy-hints`. *Why:* the Memory Agent can only target
   what the Evaluator names. Note that adding rubric keys changes the shape the frontend
   renders and the Memory aggregation keys. Ship them together.
5. **Use interviewer notes and hint level** once 5.2 #5 lands (Ilia's grader reads the
   hidden notes).
6. **"Insufficient data" path.** If the thread is too short to judge (for example the
   candidate skipped the question), say so in `survivalReasoning` and fail it. Don't
   produce plausible-looking mid scores. *Why:* Ilia's grader: *"state it clearly, don't
   fabricate details."*

### 5.4 What we already do better than the open-source field

Strict neutrality with a banned-phrase list. A spoken-voice style guide. The `clarify`
action that doesn't spend the follow-up budget. The "I don't know" handling for
behavioral questions ("closest real situation"). Prompt-injection fencing. A
human-shaped opening and close. None of the six repos has all of these. Ilia has
neutrality and conciseness but no injection handling and no persona.

---

## 6. Sources

**Open-source prompts [P]**
- [IliaLarchenko/Interviewer: resources/prompts.py](https://github.com/IliaLarchenko/Interviewer/blob/main/resources/prompts.py) (Apache-2.0) · [HF Space](https://huggingface.co/spaces/IliaLarchenko/interviewer)
- [FoloUp/FoloUp: src/lib/constants.ts](https://github.com/FoloUp/FoloUp/blob/main/src/lib/constants.ts) and [src/lib/prompts](https://github.com/FoloUp/FoloUp/tree/main/src/lib/prompts) (MIT)
- [1146345502/aural-oss: interviewer.ts](https://github.com/1146345502/aural-oss/blob/main/src/lib/ai/prompts/interviewer.ts) (MIT)
- [zixi-liu/interview-ai-prototype: prompts.py](https://github.com/zixi-liu/interview-ai-prototype/blob/main/prompts.py) (no license, ideas only)
- [espetro/dits: interview-agent.ts](https://github.com/espetro/dits/blob/main/packages/shared/src/interview-agent.ts) (CPAL-1.0)
- [jiatastic/GPTInterviewer: prompts.py](https://github.com/jiatastic/GPTInterviewer/blob/main/prompts/prompts.py) (MIT)

**Interviewer practice**
- [P] Google re:Work, [A guide to structured interviewing](https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices)
- [B] Holloway, Guide to Technical Recruiting and Hiring: [Hinting and Helping Candidates Shine](https://holloway.com/g/technical-recruiting-hiring/sections/hinting-and-helping-candidates-shine) · [Seeking Clarity in Questions and Answers](https://www.holloway.com/g/technical-recruiting-hiring/sections/seeking-clarity-in-questions-and-answers) · [Types of Nontechnical Questions](https://www.holloway.com/g/technical-recruiting-hiring/sections/types-of-nontechnical-questions)
- [B] Tech Interview Handbook: [Interviewer cheatsheet](https://www.techinterviewhandbook.org/interviewer-cheatsheet/) · [Behavioral interviews for senior candidates](https://www.techinterviewhandbook.org/behavioral-interview-senior-candidates/)
- [V] interviewing.io, [System design interview guide](https://interviewing.io/guides/system-design-interview)
- [V] Hello Interview, [System design delivery framework](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery)
- [V] Grove Ventures, [People-first playbook: interview questions](https://www.grovevc.com/playbooks/people-first-playbook/interview-questions/) (a VC's hiring playbook, not prep marketing)
- [Academic, abstract only] Levashina, Hartwell, Morgeson & Campion (2014), *The structured employment interview*, Personnel Psychology 67:241–293, [record](https://digitalcommons.usu.edu/manage_facpub/423/)
- [Secondary] Behavioral event interview method (McClelland; Spencer & Spencer, *Competence at Work*, 1993). Seen only through vendor summaries such as [voicit](https://voicit.com/en/blog/human-resources/critical-incident-interview/8337/). Its validity figures are unverified.
- [V, low] Amazon bar-raiser probe counts: [aakashg.com](https://www.aakashg.com/amazon-interview-questions/), [SystemCraft](https://deepaucksharma.github.io/SystemCraft/behavioral/bar-raiser-mastery). Unverified prep-site claims.

**Not reached:** interviewing.io's behavioral guide (404). The full re:Work rubric PDFs. The text of the Levashina review. The Amazon or Meta internal interviewer training, which is not public.
