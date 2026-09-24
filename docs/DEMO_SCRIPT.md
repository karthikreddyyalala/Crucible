# Demo video script

Target: 60–90 seconds of final footage, recorded on the local mock engine with the
stylized avatar. No AWS or Tavus credentials involved, so nothing can fail mid-take.

Every input below is tuned to the mock engine's actual rules
(`src/lib/mockEngine.ts`), so each beat triggers on the first try:

- An answer under 180 characters, or one containing a hedge word with no number,
  gets **pushed back on** (a follow-up question, not a score).
- An answer over 260 characters, with a number and more than one sentence, gets
  **scored**. It passes only if every rubric criterion scores 3 or higher.

## Setup (before recording)

```bash
npm install
npm run dev          # VITE_USE_MOCK defaults to true, so no backend is needed
```

Open http://localhost:5173 in a clean browser window at 1280×800 or larger. Clear
site data first so a previous session doesn't resume.

**Recording tool (macOS):** press Cmd+Shift+5 and choose "Record Selected Portion".
Turn on your mic if you'll narrate live. Otherwise record silently and add a
voice-over afterwards (easier to get right).

## The takes

Behavioral mode runs exactly 2 questions, so the whole session is beats 1–6 with
nothing to cut. Every beat was verified by driving the real session store against
the mock engine, and produced exactly the outcome listed.

### Beat 1: Setup (≈10s on screen)
- Name: `Karthik`
- Paste any real resume and JD (the mock ignores them, but blank fields look fake on camera)
- Role: **Software Engineer** · Mode: **Behavioral** · Level: **Mid**
- Video avatar: **off** · Voice: **on** (so the interviewer speaks)

> Narration: *"Crucible reads your resume and the job description and builds an interview around the gaps between them."*

### Beat 2: Greeting (≈8s)
The interviewer opens: "Hi Karthik, good to meet you…". Type:

```
Doing well, thanks. Ready to go.
```

It moves into the first question.

### Beat 3: The push-back (≈15s). This is the most important shot.
Question 1 is about owning a project under an unrealistic deadline. Type this
deliberately vague answer:

```
We had a really tight deadline and I made sure the team stayed focused and we got it done on time.
```

**Expected:** no score. Instead it asks *"You said 'the team' a lot — what did YOU
specifically do that nobody else did?"*

> Narration: *"Most AI interviewers would say 'great answer' here. This one doesn't. A vague answer gets pushed back on, just like a real interviewer would."*

### Beat 4: A strong answer (≈15s)
Type:

```
I owned migrating our payments service to a new provider in 3 weeks instead of the planned 8. I split it into 4 milestones, personally wrote the reconciliation job that compared both ledgers every hour, and cut two low-value features after getting sign-off from the PM. We shipped on day 19 with zero failed transactions, and the reconciliation job caught 2 rounding bugs before any customer saw them.
```

**Expected:** it accepts the answer and moves on to question 2, the last one.

### Beat 5: An answer that sounds fine but wouldn't survive (≈10s)
For question 2, type something fluent but unquantified. **Leave out numbers and
the words "basically", "stuff", "things", "made sure", "a lot of":**

```
I noticed our deploys were slow and unreliable, so I proposed a cleaner pipeline to my lead. I rewrote the build scripts, added caching, and documented the new process for everyone on the team. People were happy with the change afterwards.
```

**Expected:** it's scored, not probed, and the verdict comes back as
**WOULDN'T SURVIVE** ("the impact and personal ownership stay abstract"). This is
the last question, so the session wraps up and opens Results.

### Beat 6: Results (≈15s)
Scroll through the verdict cards. Linger on:
- **WOULD SURVIVE** on the payments answer
- **WOULDN'T SURVIVE** on the deploys answer, with its reasoning
- Click **Coach** on the failing card to show the reworked model answer

> Narration: *"Instead of a 1-to-10 score, every answer gets an honest verdict: would this hold up with a real interviewer? It also shows you how to fix the answer that wouldn't."*

### Closing line (voice-over only)
> *"Under the hood it's six agents on LangGraph and Claude on Bedrock, with an evaluation harness measuring how accurate the agents actually are. It remembers your weak spots and builds your next interview around them."*

## Don't claim in the video

- **Don't say the mock proves the memory loop.** In mock mode, question 2's
  "targets a past weakness" badge is simulated (hardcoded). The real cross-session
  reweighting is proven by the backend's end-to-end tests, and runs against real
  Bedrock in production. Say it happens; don't present the mock as the evidence.
- **Don't quote "100% accuracy."** The honest figures are 100% on the Interviewer's
  decisions and 93% on the Evaluator's verdict. See README and `docs/OVERVIEW.md`.

## After recording

- Trim to 60–90s and export as MP4 at 1080p.
- Link it in the README directly under the **Live app** line.
- Where it goes in the portfolio site is still an open decision.
