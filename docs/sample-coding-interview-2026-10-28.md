# Sample coding interview (2026-10-28)

A complete, unedited coding interview from a live end-to-end run on branch `feat/phase-1`.
Every request goes through the real API routes (start, turn, evaluate, finalize, coach) to
Claude Sonnet 4.6 on Bedrock, with Marcus at temperature 0.3 and the other agents at 0. The
candidate is scripted: a new grad, junior level, coding mode. Its code runs through the same
test harness the browser runs in Pyodide, so the test results Marcus sees are real. The
planner picked Two Sum and Valid Palindrome for this session; the script plays the Two Sum
slot. To reproduce it, run `backend/evals/live_coding_interview.py` (about $0.35).

The script makes the candidate do a few things on purpose:
- dodge Marcus's complexity question in the approach stage,
- go quiet for three minutes (the check-in event),
- write a bug that stores before it looks up, so example 2 (`[4, 4, 9]`, target 8) fails, then
  say "let me look" and fix it on their own,
- give a thin complexity answer in review.

What to look for:
- Marcus asks for the complexity before any code and doesn't let the dodge slide.
- One check-in line after the silence, then quiet ("Mm-hm — go ahead").
- After the failing run he gives the candidate room to debug instead of pointing at the bug.
- After Submit, the review goes complexity, then a variant (sorted input), one ask per turn.
- The evaluator keeps the real transcript, says the answer would survive, and still notes
  that the complexity had to be dragged out.
- The coach shows a clean solution only for a finished session. The same request with an
  unfinished session id gets no code.

Two earlier runs the same day caught problems that are fixed in this branch. After the
failing run, Marcus said "think about the order you're storing versus looking up", which
hands over the fix (now "Mm-hm — take your time.", commit `f00ed9f`, with a golden eval case).
In the warmup he said "we've got one coding problem today" although the plan had two (he's
never told the count; the prompt no longer asks him to say it, commit `0585889`).

Italic lines are stage directions from the script: Marcus's action, his reply time, the
coding stage, and the browser's test results.
## Transcript


**Marcus:** Hi Priya, I'm Marcus — I'm one of the engineers on the team. Thanks for making the time today. How are you doing?

**Candidate:** Doing well, thanks. A little nervous, but ready.

*(advance, 4.8s)*

**Marcus:** Hey, a little nervous is totally normal — I appreciate you showing up ready. So, today we'll be doing a coding problem, and since you're at a junior level I'm mostly interested in how you think through it, not just whether you get the answer. Think out loud as you go — I'll dig in where I'm curious, and it's fine to ask me to clarify anything. Before we jump in, can you just walk me through your background briefly — what you've been working on, what brought you here?

**Candidate:** Sure. I just finished my CS degree at ASU. Last summer I interned at Larkspur Health on a FastAPI service that deduplicates patient intake records.

*(advance, 2.1s)*

**Marcus:** A FastAPI deduplication service — okay. Let's jump into some code. Here's the problem: given an array of integers and a target, return the indices of the two numbers that add up to the target. Before you start coding, talk me through your approach.

**Candidate (approach):** The brute force is checking every pair, which is O(n squared). I think I can do one pass with a dictionary from value to index: for each number, check whether target minus it is already in the dictionary.

*(follow_up, 1.9s, stage approach)*

**Marcus:** Okay — one-pass dictionary, complement check first. What's the time and space complexity of that approach?

**Candidate (answers the probe):** Each number is checked against what came before it, so it can't pair with itself. If there's no pair, the problem says there's always exactly one, so I won't handle that case.

*(follow_up, 2.3s, stage approach)*

**Marcus:** Right — complement check, one pass. You mentioned the time and space complexity but then shifted to the no-pair case. What are the actual bounds — time and space — for the dictionary approach?

*(candidate types for a while, then goes quiet for three minutes)*

*(clarify, 2.7s, stage coding, event checkin)*

**Marcus:** How's it going — want to talk me through where you are?

**Candidate (replies to the check-in):** Yeah, I'm fine, just writing the loop.

*(clarify, 1.9s, stage coding)*

**Marcus:** Mm-hm — go ahead.

*(Run: Examples: 1/3 passed (example 2 failed: expected [0, 1], got [0, 0]).)*

**Candidate (after a failing run):** Hmm, example two fails, I get zero zero. Let me look.

*(clarify, 1.7s, stage coding)*

**Marcus:** Mm-hm — take your time.

*(Run: Examples: 3/3 passed.)*

*(Submit: Examples: 3/3 passed. Hidden tests: 10/10 passed.)*

*(follow_up, 1.9s, stage review, event submit)*

**Marcus:** All thirteen pass — okay. So, what are the time and space complexity of what you wrote?

**Candidate (review):** It's O(n) time and O(n) space for the dictionary.

*(follow_up, 2.2s, stage review)*

**Marcus:** O(n) time and O(n) space — right. So, if the list were already sorted, how would you change the approach?

**Candidate (review):** If it were sorted I'd use two pointers from both ends and move them in, so no extra memory.

*(complete, 2.3s, stage review)*

**Marcus:** Okay — two pointers from both ends, no extra memory. That's everything I wanted to cover. What questions do you have for me?

**Candidate:** Not really a question about the problem, but what does the first month look like for new grads on the team?

*(clarify, 2.8s)*

**Marcus:** Good question. The first month is usually a mix of onboarding — getting your dev environment set up, reading through the codebase, maybe pairing with a more senior engineer on a small bug or a well-scoped ticket. You're not expected to ship anything major right away; it's more about getting context and asking a lot of questions. By the end of the month most folks have at least one small PR merged. Anything else you wanted to ask?

**Candidate:** No, that's all. Thanks, Marcus.

*(complete, 1.9s)*

**Marcus:** Thanks, Priya. I'll write up my feedback — you'll see it on the next screen. Take care.

## Evaluation (3.1s)

- Would survive a real interview: **yes**. The candidate produced a clean, correct one-pass hash-map solution that passed all 13 tests, stated O(n) time and O(n) space when directly asked, and volunteered the sorted two-pointer alternative unprompted — covering all strong-answer points. The only weakness is that complexity bounds were not stated proactively before coding and required an explicit follow-up probe, which is a minor communication gap but not a disqualifying one.
- Rubric: correctness 5.0, efficiency 4.0, code_quality 5.0, communication 3.0
- Weakness tags: none
- Follow-ups counted: 4; transcript kept verbatim: True

## Memory after finalize (1.1s)

- Recurring weaknesses: none
- Strong areas: correctness, code_quality, efficiency

## Coach (5.9s)

The brute force here is checking every pair with a nested loop — that's O(n²) time, which gets expensive fast for large inputs. The better approach is a single-pass hash map from value to index. For each number, I check whether its complement — target minus the current value — is already in the map before I insert the current element. That ordering is the key detail: it means I'm only looking at numbers that came before the current one, so I can never accidentally pair a position with itself. Once I find the complement in the map, I return both indices immediately. That gives O(n) time and O(n) space for the dictionary. If the input were already sorted, I'd skip the hash map entirely and use two pointers from both ends, moving the left pointer right when the sum is too small and the right pointer left when it's too large — that gets down to O(1) extra space.
- Explicitly stated why the brute-force O(n²) approach is too slow before moving on, giving the interviewer clear signal that you evaluated alternatives rather than jumping straight to the optimal solution
- Articulated the 'complement check before insert' ordering as the key correctness detail — this shows you understand *why* the algorithm works, not just that it does
- Delivered the complexity analysis (O(n) time, O(n) space) and the sorted two-pointer tradeoff as a cohesive conclusion rather than scattered across follow-up prompts, making the answer feel complete and structured

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, value in enumerate(nums):
        if target - value in seen:
            return [seen[target - value], i]
        seen[value] = i
    return []
```

*(Coach with an unfinished session id returns code: False)*

*Estimated model cost for the session: $0.296 (plus the two coach calls)*
