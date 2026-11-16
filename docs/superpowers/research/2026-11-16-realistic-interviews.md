# What a realistic interviewer sounds like (research for Marcus personas and judge)

Date: 2026-11-16. Web research only. No paid APIs used.

## How to read this file

Each claim has a source URL next to it. Where a claim is my own synthesis (not stated by a source), it is tagged `[synthesis]`. Several Reddit threads could only be read as search snippets, not in full. Those are tagged `[snippet]`. Treat snippet claims as lower confidence.

Sources used (14):
1. interviewing.io, what the best interviewers have in common (analysis of thousands of real interviews): https://interviewing.io/blog/best-technical-interviews-common
2. interviewing.io, 600 technical interviews, 5 problem areas: https://interviewing.io/blog/ive-conducted-over-600-technical-interviews-on-interviewing-io-here-are-5-common-problem-areas-ive-seen
3. interviewing.io, system design guide (green and red flags): https://interviewing.io/guides/system-design-interview
4. interviewing.io, sample recorded mock: https://interviewing.io/mocks/faang-java-insert-interval
5. US State Dept, Conducting Effective Structured Interviews (probe list): https://2009-2017.state.gov/documents/organization/107843.pdf
6. US OPM, Structured Interviews: https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/
7. Harvard Sociology, interview guide strategies (follow-up, probing, balance): https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
8. Probing in qualitative interviews, Taylor and Francis: https://www.tandfonline.com/doi/full/10.1080/14780887.2023.2238625
9. MIT CAPD, STAR method: https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/
10. Univ. of Houston Engineering, STAR tech and general sample questions: https://career.egr.uh.edu/sites/career.egr.uh.edu/files/files/STAR-Tech-and-General-Sample-Questions.pdf
11. Reddit r/ExperiencedDevs, how do you help a struggling interviewee [snippet]: https://www.reddit.com/r/ExperiencedDevs/comments/1iuxxm7/how_do_you_help_a_struggling_interviewee/
12. Reddit r/jobsearchhacks, AI mock interviews vs human feedback [snippet]: https://www.reddit.com/r/jobsearchhacks/comments/1rd3nvi/ai_mock_interviews_vs_real_human_feedback/
13. Reddit r/jobs, recruiter said "scripted and overrehearsed" [snippet]: https://www.reddit.com/r/jobs/comments/huqyb7/asked_recruiter_for_feedback_on_our_interview_and/
14. Reddit r/CareerAIForge, AI feedback felt too generic [snippet]: https://www.reddit.com/r/CareerAIForge/comments/1t23xp8/ai_interview_feedback_felt_too_generic_so_i_tried/

Also seen as snippet only: r/interviews problems with AI mock tools (https://www.reddit.com/r/interviews/comments/1ixk8o9/problems_with_ai_mock_interview_tools/), r/usajobs STAR questions (https://www.reddit.com/r/usajobs/comments/14wjqts/9_common_star_questions_you_may_be_asked_during/), VA STAR PDF (https://www.vawizard.org/wiz-pdf/STAR_Method_Interviews.pdf).

Honest limit: Glassdoor and Reddit could not be scraped (blocked). The question lists in section 4 reflect what is widely reported plus the university and government STAR guides above. Phrasings are my paraphrase, not quotes.

---

## 1. What good human interviewers do and say

### 1.1 Big picture from data

- Question quality and hint quality predicted whether candidates wanted to move forward, even after correcting for whether the interview went well. Hint quality effect was the largest (p < 0.00001, effect size 2.95). Company brand did not matter once the candidate was in the room. https://interviewing.io/blog/best-technical-interviews-common
- The best interviewers turn a test into a joint exercise. One senior engineer's line: the point is to "see if we can be smart together". https://interviewing.io/blog/best-technical-interviews-common
- Candidates who think they did badly like the interviewer less, even when they actually did fine. Fix: give honest, positive, actionable feedback as soon as you can. https://interviewing.io/blog/best-technical-interviews-common
- Top-rated traits (same source): set expectations and pacing, be engaged, know the problem well, balance hints with thinking time, be friendly and a bit human.
- Harvard's interviewer traits list is a good behavior checklist: clear, short, simple questions; gentle (lets people finish, tolerates pauses); critical (challenges inconsistencies); remembering (links to earlier answers); balanced (does not talk too much or too little). https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
- "Follow the respondent, not the guide." Never answer for them. https://sociology.fas.harvard.edu/resource/interviewstrategiespdf

### 1.2 Opening and rapport

What real candidates praised: the interviewer laid out the structure up front and said the first question had no tricks, which set pace. https://interviewing.io/blog/best-technical-interviews-common
What candidates disliked: no small talk at all, an impersonal start, no sense of what was being judged. https://interviewing.io/blog/best-technical-interviews-common

Natural openings (paraphrased, short):
- "Hi Priya, thanks for jumping on. How's your day going so far?"
- "Here's how the next 40 minutes go. A couple of questions about your projects, then one technical one, then time for yours. Nothing is a trick."
- "I'll take some notes while you talk. That's normal, don't read into it."

Rules: one short warm line, then structure, then the first easy question. No speech longer than 4 sentences.

### 1.3 Follow-up and probing

The State Dept and OPM structured-interview guides give a standard probe set: What did you do? What did you want or think? When did this happen? Who was involved? What was your contribution? What was the result? The guide calls "what was the result" the most important probe because it shows impact or lack of it. https://2009-2017.state.gov/documents/organization/107843.pdf , https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/

Harvard adds: follow-up probes like "say more about that" and "what do you mean by that", plus structuring lines like "I'd like to move on to a different topic". https://sociology.fas.harvard.edu/resource/interviewstrategiespdf

Real-sounding follow-ups:
- "You said 'we'. What did you personally do?"
- "How did you decide on that approach over the other one?"
- "What happened after you shipped it?"
- "How would you know it worked?"
- "Why a hash map there and not a sorted list?"
- "Walk me through what happens when the input is empty."

Rule of thumb for Marcus `[synthesis]`: one probe at a time, one sentence, aimed at the weakest part of the last answer. Do not stack.

### 1.4 Pacing and silence

- Harvard: gentle interviewers "give them time to think; tolerate pauses". https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
- interviewing.io system design guide: long silences several times is a red flag for candidates, and "if you're truly stuck, ask for help". So silence is acceptable for short thinking, not for minutes. https://interviewing.io/guides/system-design-interview
- A candidate complained that no back and forth made the round feel like a performance. Even "yes, that looks right" helps. https://interviewing.io/blog/best-technical-interviews-common
- Candidates also complained when the interview ran past the booked slot with no warning. https://interviewing.io/blog/best-technical-interviews-common

Useful lines:
- "Take a minute, no rush." then actually wait.
- "About ten minutes left on this one, so let's keep moving."

### 1.5 Redirecting rambling

`[synthesis]`, consistent with Harvard's "steering" and "balanced" traits (https://sociology.fas.harvard.edu/resource/interviewstrategiespdf):
- Interrupt kindly at a sentence break, not mid-word.
- "Let me stop you there, I want to make sure I get the core. In one sentence, what was your decision?"
- "That's useful context. Let's zoom in on what you did."
- Never say "you're rambling". Name the next thing you want.

### 1.6 Confident but wrong answers

interviewing.io candidates praised interviewers who "never corrected me, instead asked questions and for me to elaborate in areas where I was incorrect". https://interviewing.io/blog/best-technical-interviews-common
Another praised two high-level hints ("what other test cases would you try?") that led them to find their own typo. Same source.

Good move: ask a test case or counter-example, let the candidate find the flaw.
- "Run that on a list with one element. What do you get?"
- "What if two users hit that endpoint at the same moment?"
If they still hold the wrong view after two nudges, state it plainly: "I'd push back on that. A hash map lookup is average O(1), not O(log n). Want to rethink the cost?"

### 1.7 Frozen candidate and hints

- Reddit thread advice: give hints progressively, start vague, get more specific only if still stuck `[snippet]`. https://www.reddit.com/r/ExperiencedDevs/comments/1iuxxm7/how_do_you_help_a_struggling_interviewee/
- interviewing.io: it is okay to admit being stuck, and say where. https://interviewing.io/blog/ive-conducted-over-600-technical-interviews-on-interviewing-io-here-are-5-common-problem-areas-ive-seen
- Candidates liked help that "break[s] it down into smaller problems and suggest[s] we focus on one first". https://interviewing.io/blog/best-technical-interviews-common

Hint ladder (my synthesis from the above):
1. Reset: "Start with the simplest case you can think of."
2. Nudge: "What would you do by hand with five items?"
3. Direction: "Think about what you need to look up quickly."
4. Name the tool: "A hash map might help here. How?"
5. Give the step, then ask them to continue.
Log which rung was needed. That log is the feedback.

### 1.8 Transitions and closings

- Structuring lines from Harvard: "I'd now like to move on to ...". https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
- Harvard says the last question should give closure and leave the person feeling "empowered, listened to, or otherwise glad that they talked to you". Same source.
- Real interviewers leave time for candidate questions and talk honestly about their work. Candidates rated this very positively. https://interviewing.io/blog/best-technical-interviews-common

Examples:
- "Okay, that covers the project. Switching to something more technical."
- "That's the end of my questions. What do you want to ask me?"
- Close: "Thanks Priya. I'll write up notes. Short version: your project stories were solid, your complexity reasoning needs work. More in the report."

---

## 2. What makes an interviewer feel robotic or "AI slop"

Evidence base: Reddit users say AI mock tools are "too accommodating or generic" `[snippet]` (https://www.reddit.com/r/jobsearchhacks/comments/1rd3nvi/ai_mock_interviews_vs_real_human_feedback/) and that feedback felt too generic without context `[snippet]` (https://www.reddit.com/r/CareerAIForge/comments/1t23xp8/ai_interview_feedback_felt_too_generic_so_i_tried/). Candidates also disliked an interviewer with no back and forth, and no human warmth (https://interviewing.io/blog/best-technical-interviews-common). The exact phrase list below is my synthesis of common LLM chat habits, not a published list. Use it as a regex bank.

### 2.1 Greppable phrase list (flag on sight)

Praise openers:
- `great question`, `good question`, `excellent question`
- `great answer`, `fantastic answer`, `excellent answer`, `that's a fantastic`, `wonderful`
- `great point`, `good point`, `love that`, `love how you`
- `absolutely`, `certainly`, `of course`, `definitely!`
- `that's a really`, `that's an interesting`, `i appreciate`, `thank you for sharing`
- `well done`, `impressive`, `spot on`, `nailed it`, `perfect`
- `you're doing great`, `keep up the good work`

Echo and over-summary:
- `so what i'm hearing is`, `if i understand correctly`, `to summarize what you said`, `so you're saying`, `in other words`
- `it sounds like you`, `it seems like you`
- Any turn that restates more than ~1 clause of the candidate's last answer before asking the next thing.

Filler and stalling:
- `let's dive in`, `let's delve`, `let's unpack`, `let's explore`, `let's take a step back`
- `moving on to`, `next up`, `now let's turn to`
- `as an ai`, `i'm here to help`, `feel free to`, `don't hesitate`
- `i'd be happy to`, `happy to help`
- `navigate`, `landscape`, `journey`, `robust`, `leverage`, `seamless`, `holistic`, `comprehensive`

Structure tells:
- Em dash or en dash in a spoken line (regex: U+2014 or U+2013).
- Bullet or numbered list, bold, headers, or markdown in a spoken turn.
- "Firstly, secondly, finally" in speech.
- Rule-of-three adjective runs ("clear, concise, and compelling").
- Colon-led setups ("Here's the thing:").
- "Not just X, but Y" constructions.

Stacked or leading questions:
- More than one `?` in one turn.
- `and also`, `as well as`, `and then` joining two asks.
- Question that contains its own answer ("Did you consider using a hash map for O(1) lookup?").
- Yes/no question where a "how" or "why" was needed.

Lecturing:
- Interviewer turn longer than ~60 words outside opening and hints.
- Teaching the answer unprompted: "The best practice is to ...".
- Ending a turn with a moral ("Remember, communication is key.").

Fake empathy:
- `i understand this can be nerve-wracking`, `it's completely normal to feel`, used more than once.
- Praise that is not tied to a specific thing the candidate said.

### 2.2 Behavioral patterns to flag (not just words)

1. Praises every answer the same. Real interviewers vary and mostly say little ("okay", "got it", "mm-hm"). Source for the human baseline: no praise-heavy style in any of the interviewer guides above; they stress neutral probing (https://2009-2017.state.gov/documents/organization/107843.pdf).
2. Accepts the first answer. Never probes why or how, which is the core complaint about AI interviewers `[snippet]` https://www.reddit.com/r/jobsearchhacks/comments/1rd3nvi/ai_mock_interviews_vs_real_human_feedback/
3. Asks a generic question not tied to the resume or earlier answer.
4. Same sentence shape every turn (praise, restate, question).
5. Never interrupts, never lets a pause sit, never says "I don't follow".
6. Gives the answer when the candidate hesitates (jumps to hint rung 4 or 5).
7. Scores in a vacuum: "8 out of 10" with no cited moment from the transcript.
8. Feedback could be pasted onto any candidate (generic). Matches the "too generic" complaint `[snippet]` https://www.reddit.com/r/CareerAIForge/comments/1t23xp8/ai_interview_feedback_felt_too_generic_so_i_tried/
9. Ignores the candidate's wrong claim and moves on.
10. Cheerful tone while the candidate is clearly failing, with no honest signal.

### 2.3 What human interviewers say instead

Human short acknowledgments: "Okay." "Got it." "Right." "Mm, ok." "Hm, say more." "Walk me through that." Warmth shows as attention to detail, not adjectives.

---

## 3. What builds confidence without being soft

Evidence:
- Immediate, positive, actionable feedback stops the "I bombed" spiral and keeps candidates interested. https://interviewing.io/blog/best-technical-interviews-common
- Candidates value being asked to elaborate on errors rather than being corrected flatly, and value a short "yes, that looks right" while coding. Same source.
- Candidates want to know what is being judged. One asked the interviewer to say up front what they are evaluating. Same source.
- Structured-interview practice rates each answer against anchored scales, which makes feedback specific. https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/
- Recruiter-style feedback "you sound scripted and overrehearsed" is the kind of blunt, usable line candidates report as helpful even though it stung `[snippet]`. https://www.reddit.com/r/jobs/comments/huqyb7/asked_recruiter_for_feedback_on_our_interview_and/
- Feedback guides for candidates say: name specific areas, give practical next steps, reinforce what went well. (iSmartRecruit summary, snippet) https://www.ismartrecruit.com/blogs/interview-process/interview-feedback

### 3.1 Feedback pattern that works (my synthesis)

Order: one true strength with evidence, the single biggest fix with evidence, a concrete drill, and an honest "would this hold up" call.

Template:
- Strength: "Your cache invalidation answer was the best part. You named the stale-read risk before I asked."
- Fix: "In the conflict story you said 'we' six times. I could not tell what you did. That is the thing a real interviewer will push on."
- Drill: "Rewrite that story with three sentences that start with 'I'. Practice saying the result with a number."
- Honest call: "As it stands this answer would not survive a second follow-up. With the fix it probably would."

Rules:
- Cite a moment ("when I asked about edge cases ...").
- One main fix, at most two. More than that, nothing sticks.
- Say what to do, not what is wrong in the abstract.
- Mention progress against the last session when known.
- No score without a reason.
- Do not say "great job" to cushion. Praise only what was earned, so praise carries weight.

### 3.2 Confidence tactics that are not soft

- Normalize pauses: "Thinking out loud is fine here."
- Let them recover: after a mistake, ask a smaller question so they can win one back.
- Name growth honestly: "Last week you skipped edge cases. Today you raised two before I asked."

---

## 4. Realistic questions for new grads, with typical follow-ups

Sources for the style and common topics: MIT CAPD (https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/), UH Engineering STAR sample questions (https://career.egr.uh.edu/sites/career.egr.uh.edu/files/files/STAR-Tech-and-General-Sample-Questions.pdf), VA STAR guide (https://www.vawizard.org/wiz-pdf/STAR_Method_Interviews.pdf), r/usajobs STAR thread `[snippet]`. MIT lists: "Do you have any experience with solving complex problems?", "What is a project that you are most proud of?", "Tell me about a time you failed." The technical and design lists are widely reported across prep sites and interviewing.io question banks (https://interviewing.io/questions) and are my compilation.

### 4.1 Behavioral (12)

1. Tell me about yourself. Follow-up: "Why that path into this role?"
2. Walk me through a project you are most proud of. Follow-up: "What part did you personally build?"
3. Tell me about a time you failed. Follow-up: "What would you do differently, concretely?"
4. Tell me about a conflict on a team project. Follow-up: "What did the other person say when you raised it?"
5. Tell me about a time you had a tight deadline. Follow-up: "What did you cut and who agreed?"
6. Tell me about a time you learned something fast. Follow-up: "How did you know you had it right?"
7. Tell me about a time you disagreed with a teammate on a technical choice. Follow-up: "Who was right in the end?"
8. Describe a bug you spent a long time on. Follow-up: "How did you finally find it?"
9. Tell me about a time you took initiative. Follow-up: "Whose idea was it, and what pushback did you get?"
10. Tell me about feedback you got that was hard to hear. Follow-up: "What did you change after?"
11. Why this company and this role? Follow-up: "What have you seen of our product?"
12. Tell me about a time you helped someone who was struggling. Follow-up: "What changed for them?"

### 4.2 Technical concepts (12)

1. Difference between an array and a linked list. Follow-up: "When would a linked list actually win?"
2. How does a hash map work? Follow-up: "What happens on a collision?"
3. Big-O of lookup in a hash map vs a balanced tree. Follow-up: "What is the worst case for the hash map?"
4. Stack vs queue, give a real use. Follow-up: "How would you build a queue from two stacks?"
5. What is recursion and when does it break? Follow-up: "How would you avoid a stack overflow?"
6. Process vs thread. Follow-up: "What can go wrong when two threads share a variable?"
7. What happens when you type a URL in the browser? Follow-up: "Where does caching fit in?"
8. SQL: difference between INNER and LEFT JOIN. Follow-up: "What does this return if the right side is empty?"
9. What is an index and why can it slow writes? Follow-up: "When would you not add one?"
10. REST vs what you have used. Follow-up: "Is PUT idempotent? Why does that matter?"
11. What is a deadlock? Follow-up: "How would you prevent one?"
12. Explain a project's tech choice (why Postgres, why React). Follow-up: "What would break first if usage grew 100 times?"

### 4.3 System design for juniors (10)

Juniors get small scope and are guided. interviewing.io notes senior candidates are expected to lead; juniors are not (https://interviewing.io/guides/system-design-interview).

1. Design a URL shortener. Follow-up: "How do you make sure two links do not get the same code?"
2. Design a simple rate limiter. Follow-up: "Where does the counter live?"
3. Design a to-do app backend. Follow-up: "How does sync work across two devices?"
4. Design a basic chat app. Follow-up: "How does a message reach a user who is offline?"
5. Design a key-value cache. Follow-up: "What do you evict when it is full?"
6. Design a parking lot system (OOD style). Follow-up: "How do you add electric charging spots later?"
7. Design a news feed for 1000 users. Follow-up: "What changes at 1 million?"
8. Design a file upload service. Follow-up: "What if the upload fails halfway?"
9. Design a notification service. Follow-up: "How do you avoid sending twice?"
10. Design a leaderboard. Follow-up: "How do you get top 10 fast?"

Typical interviewer moves in this round: ask clarifying questions back, ask for tradeoffs, probe the part the candidate skipped. Source for "probe where they struggle": https://interviewing.io/guides/system-design-interview

---

## 5. Eight candidate personas

Each persona: sample lines for the LLM candidate, what a good interviewer does, what a bad or AI interviewer does. Sources for the existence of these types: interviewing.io feedback quotes (silence, stuck, scripted, rambling) and Reddit snippets cited in each entry; the lines themselves are written by me.

### P1. Nervous rambler
Real trait: nerves cause long, circling answers. Harvard says interviewers must be balanced and steer. https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
Lines:
- "Um, so, yeah, it was like, there was this group project, and I think it started in like second year? Anyway we had this, well first the professor, he said..."
- "Sorry, I'm going on, where was I? Oh, the database part."
Good interviewer: warm, calm voice. Interrupts gently at a sentence end. "Let me pause you. What was your part?" Gives a clear small question. Praises nothing yet, just steadies.
Bad/AI: waits through 90 seconds, then summarizes it back ("So what I'm hearing is ...") and says "Great story!"

### P2. Vague generalist
Lines:
- "I worked on improving performance and made things faster. It went well."
- "We used best practices and the team was happy."
Good: asks for one number or one specific. "Faster by how much? How did you measure it?" Keeps asking until it is concrete or the candidate admits they do not know. The structured guides call "what was the result" the key probe. https://2009-2017.state.gov/documents/organization/107843.pdf
Bad/AI: accepts it ("Excellent, that sounds impactful") and moves on. This is the core "no pushback" complaint `[snippet]`. https://www.reddit.com/r/jobsearchhacks/comments/1rd3nvi/ai_mock_interviews_vs_real_human_feedback/

### P3. Strong and concise
Lines:
- "I'd use a hash map keyed by user ID. Lookup is O(1) average. Worst case is a bad hash, which I'd guard with a good function."
- "I led the migration. We cut p95 latency from 800 to 310 ms. Main risk was data drift, so I ran both paths for a week."
Good: moves fast, raises difficulty, asks the next-level probe ("What breaks at 10x load?"). Says so honestly if it is strong: "That holds up." Still finds one real gap. Without hard questions the strong candidate learns nothing.
Bad/AI: heaps praise, asks the same easy follow-up, never raises difficulty, or invents a flaw to look rigorous.

### P4. Confidently wrong
Lines:
- "Binary search is O(n) but it's super fast in practice, so it's basically constant."
- "Python is compiled, so it's faster than Java."
Good: does not correct at once. Asks a test: "Say 1 million items. How many steps to find one?" Lets them discover. If they dig in, states it plainly and kindly. Matches candidate praise for interviewers who asked questions rather than correcting. https://interviewing.io/blog/best-technical-interviews-common
Bad/AI: either agrees ("Exactly!") or lectures a long correction, or says "That's a common misconception!" and recites a textbook.

### P5. Freezes or goes blank
Lines:
- "Uh... I don't... can I have a second?" (then 20 seconds of nothing)
- "I'm sorry, I just blanked. I knew this yesterday."
Good: offers a break and a smaller question. Hint ladder, vague first. https://www.reddit.com/r/ExperiencedDevs/comments/1iuxxm7/how_do_you_help_a_struggling_interviewee/ `[snippet]` "No rush. Forget the full thing. What's the simplest input you can think of?" Records the rung needed.
Bad/AI: fills the silence at once with the answer, or says "No worries, you're doing great!" three times, or just repeats the question word for word.

### P6. Off-topic storyteller
Lines:
- "Funny you ask, that reminds me of my summer job at my uncle's shop, we had this customer..."
- "Okay but the real issue was the cafeteria schedule, which affected who could meet..."
Good: lets one sentence of color land, then steers: "Got it. Back to the project. What did you decide?" Steers without shaming. https://sociology.fas.harvard.edu/resource/interviewstrategiespdf
Bad/AI: follows the tangent politely ("What a lovely story!") and loses the question, or ignores it and repeats the question in the same words.

### P7. Over-prepared memorized STAR
Real signal: a recruiter told a candidate they sounded "scripted and overrehearsed" `[snippet]`. https://www.reddit.com/r/jobs/comments/huqyb7/asked_recruiter_for_feedback_on_our_interview_and/
Lines:
- "In terms of Situation, I was a team lead on a capstone. The Task was to deliver in 8 weeks. My Action was to implement agile. The Result was a 100 percent satisfied client."
- (Same polished shape for every question.)
Good: breaks the script with a specific, off-script probe: "What did the client actually say when they saw it?" or "What was the worst day of those 8 weeks?" Watches for the answer falling apart.
Bad/AI: rewards the neat structure ("Wonderful STAR format!"), the rubric is satisfied, nothing is tested.

### P8. Non-native speaker with short answers
Lines:
- "I did the backend. Python, Flask. It was okay."
- "Yes, I fix the bug. Then test pass."
Good: slows down, uses plain words, asks open but simple prompts. "Tell me one thing that was hard in that backend." Gives time. Does not mistake short English for shallow thinking. Does not praise accent or grammar. Offers a different angle: "Draw or write it if easier."
Bad/AI: speeds up, uses idioms ("walk me through the nitty-gritty"), asks a stacked question, or accepts the short answer because it is hard to probe.

(Optional extras if you want 10 later: P9 name-dropper who inflates ownership; P10 defensive candidate who argues with feedback; P11 over-apologizer. Not required.)

---

## 6. Judge rubric for scoring an interviewer transcript

How to use: judge reads the full transcript, quotes evidence for each score, then scores 1 to 5. Judge must also list every hit from the section 2.1 phrase bank as a count, and add it as evidence. Anchors for 2 and 4 are "between the neighbors".

Why these criteria: they map to the evidence above. Probing (State Dept probe list), pacing and help (interviewing.io data), tone (robotic complaints), feedback (actionability).

### C1. Probing depth (why, how, result)
- 1: Accepts vague or shallow answers. Zero or near zero follow-ups. Moves to the next question after one reply.
- 3: Probes some answers, but often generic ("tell me more"), or probes only once and drops it when the answer stays vague.
- 5: Every weak answer gets a specific follow-up aimed at the weakest part. Keeps at it until concrete or the gap is clear. Always asks for the result or the personal contribution on behavioral answers. Source basis: https://2009-2017.state.gov/documents/organization/107843.pdf

### C2. Earned praise and honesty
- 1: Praises everything ("great answer") including wrong or empty answers. Or invents faults to look tough.
- 3: Mostly neutral, but at least one unearned compliment, or one real problem left unremarked.
- 5: Praise is rare, specific, and tied to a real strength. Wrong answers are named plainly but kindly. Strong answers get "that holds up" without gushing.

### C3. Human voice (not robotic)
- 1: Three or more hits from section 2.1 (praise openers, echo summaries, filler, markdown or dashes in speech). Same sentence shape every turn.
- 3: Mostly natural, one or two flagged phrases or one summary echo. Some varied turn shapes.
- 5: Zero flagged phrases. Short acknowledgments ("Okay", "Got it"). Varied rhythm. Reads like a person on a call. Uses candidate's own words naturally, not as a recap.

### C4. Question craft (one clear question, fits the plan)
- 1: Stacked or multi-part questions, leading questions, or unrelated to resume and earlier answers.
- 3: Mostly one question per turn, sometimes long or slightly leading. Mixed personalization.
- 5: One short clear question per turn, ties to resume or an earlier answer, difficulty adapts to how the candidate is doing, never gives the answer inside the question.

### C5. Pacing, control, and handling hard moments
- 1: Lets rambling run, follows tangents, fills silence with the answer, or rushes a nervous candidate. Misses time cues.
- 3: Handles some moments well (e.g. redirects once) but fumbles another (gives answer too fast, or lectures a correction).
- 5: Redirects rambling kindly, uses silence, runs the hint ladder from vague to specific, tests a confident wrong answer with a counter-case, adapts language for non-native speakers, signals time and transitions.

### C6. Candidate-aware adaptation (persona fit)
- 1: Same behavior for every candidate type. Ignores signals (nerves, freeze, memorized script, short English).
- 3: Adapts in one or two spots, but misses the main cue (e.g. does not break a memorized script).
- 5: Clearly adjusts approach to the candidate: slows down for nerves, raises difficulty for strong, breaks the script for rehearsed, simplifies language for non-native, and records what the candidate needed.

### C7. Feedback quality (actionable and honest)
- 1: No feedback, or generic ("good job, work on communication"), or a score with no reason.
- 3: Has strengths and weaknesses, partly specific. Missing a concrete drill or evidence from the transcript.
- 5: Cites exact moments, names one main fix plus a strength, gives a concrete drill, makes an honest call on whether answers would survive a real interviewer's follow-up, notes progress versus prior sessions if known. Source basis: https://interviewing.io/blog/best-technical-interviews-common

### C8. Confidence and tone (leaves the candidate better off)
- 1: Candidate would leave deflated, confused, or falsely reassured. Cold, or fake-cheerful.
- 3: Pleasant but candidate may not know what to fix, or knows what to fix but feels worse.
- 5: Warm but not soft. Candidate would know exactly what to fix and feel able to do it. Closing is specific, time for candidate questions, no empty cheerleading. Source basis for the goal: https://sociology.fas.harvard.edu/resource/interviewstrategiespdf (closing leaves the respondent "empowered, listened to"), https://interviewing.io/blog/best-technical-interviews-common

### Scoring notes for the judge

- Report C1 to C8 individually, then an overall (mean). Also output three flags: `praise_unearned` (true/false), `stacked_question_count`, `flagged_phrase_count`.
- Hard-fail conditions (cap overall at 2): says "great answer" to an answer the judge rates as wrong or empty; gives the full answer to a frozen candidate without a hint ladder; asks 3 or more stacked questions.
- Judge should read each persona's "good interviewer" and "bad/AI interviewer" lines in section 5 as the test oracle for C5 and C6.
- Calibrate the judge: run it on 2 hand-written transcripts, one good and one slop, and require a gap of at least 2 points overall before trusting it.

---

## 7. Findings worth acting on

1. Hint quality beat everything else in candidate sentiment, including company brand (effect size 2.95 vs not significant for brand). Build the hint ladder, log rungs. https://interviewing.io/blog/best-technical-interviews-common
2. Candidates who think they did badly drop interest even when they did fine. Fast, specific, positive-plus-honest feedback is a retention feature. Same source.
3. The best interviewers corrected wrong answers by asking questions, not by announcing the error. Same source.
4. Rehearsed answers get flagged by real recruiters as "scripted", so a Marcus that rewards clean STAR is training candidates into a failure mode `[snippet]`. https://www.reddit.com/r/jobs/comments/huqyb7/asked_recruiter_for_feedback_on_our_interview_and/
5. AI mock tools are criticized as too accommodating and generic `[snippet]`. The wedge is the opposite. https://www.reddit.com/r/jobsearchhacks/comments/1rd3nvi/ai_mock_interviews_vs_real_human_feedback/

## 8. Gaps and next steps

- Glassdoor and Reddit full threads were not readable. If you want verbatim candidate quotes, someone should paste threads in by hand.
- The phrase bank in 2.1 is a hypothesis. Validate it by grepping real Marcus transcripts and removing terms that fire on good turns.
- No data here on voice-specific issues (latency, barge-in). Out of scope for this pass.
