# Which interview questions are asked most

Researched 2026-10-27/28. The goal: Crucible should open with the questions candidates
actually get in software-engineering and AI-engineering loops, so practice feels like
"this is exactly what I got asked".

## Method, and how far to trust it

- For each question **theme** (not exact wording), I counted how many independent
  public sources list it. The sources are prep guides, curated question lists,
  company-prep pages, book tables of contents and open-source repos.
- **These counts are approximate. They are not frequency data.** No public source
  publishes real interview frequencies. Glassdoor, Blind and LeetCode Discuss have the
  closest thing, but their terms forbid scraping, so I did not mine them. Two sites
  that claim a "ranked by real frequency" list (Dataford, PracHub) either sit behind a
  sign-up wall or cite no data.
- **The sources are not fully independent.** Prep sites copy each other, and many
  descend from the same few books and repos (Alex Xu's books, Grokking,
  system-design-primer, Tech Interview Handbook). A count of 6 means "this shows up
  everywhere you look", not "6 separate observations of real interviews".
- Some sources are category lists (The Muse, Formation). A few counts come from search
  result summaries rather than a page I fetched. Those are marked *(snippet)* below and
  are weaker evidence.
- Coding puzzles (LeetCode-style) are out of scope here. Four existing coding questions
  are tagged `common` because their patterns are on the well-known Blind 75 / Grind 75
  lists: merge intervals, top-K frequent, LRU cache and topological ordering. I did not
  re-count those patterns for this doc.
- Licensing follows `question-sources-and-datasets.md`. The sources were **counted, not
  copied**. Every question added to the bank is written in our own words and marked
  `original`. Generic themes ("tell me about a time you failed", "design a chat app")
  are ideas, not anyone's expression. GPL, no-license and non-commercial sources
  (ashishps1, arialdomartini, llmgenai, karanpratapsingh) were used only as one more
  vote in a count.

### Tiering rule used for the `asked` tag

- **very_common**: themes in the top tier of a list below. Roughly: behavioral rank
  1–12, the other lists rank 1–8. Usually 5+ sources. Only the bank question that
  covers the theme most directly gets the tag.
- **common**: the theme appears in several (about 3+) sources, or the question is a
  second angle on a very_common theme.
- **occasional**: everything else, mostly our scenario-style originals.

Ties at the tier boundary were broken by judgment, and each one is noted below.

## Sources

Behavioral:
- **B1** Tech Interview Handbook, "30 most commonly asked behavioral questions" plus per-company lists (MIT): https://github.com/yangshun/tech-interview-handbook/blob/main/apps/website/contents/behavioral-interview-questions.md
- **B2** Formation, common SWE interview questions (categories): https://formation.dev/blog/common-interview-questions-software-engineers
- **B3** The Muse, behavioral questions (categories): https://www.themuse.com/advice/behavioral-interview-questions-answers-examples
- **B4** Indeed, most common behavioral questions: https://www.indeed.com/career-advice/interviewing/most-common-behavioral-interview-questions-and-answers
- **B5** Hello Interview, behavioral intro: https://www.hellointerview.com/learn/behavioral/overview/introduction
- **B6** levels.fyi, Amazon Leadership Principles questions: https://www.levels.fyi/blog/amazon-leadership-principles.html
- **B7** PracHub, 20 common Meta behavioral questions (no data cited): https://prachub.com/resources/20-common-meta-behavioral-interview-questions-2026-2
- **B8** techinterview.org, Meta behavioral cheat sheet: https://www.techinterview.org/post/3233477365/meta-behavioral-interview-cheat-sheet/
- **B9** Interview Kickstart, Amazon behavioral questions: https://www.interviewkickstart.com/interview-questions/amazon-behavioral-interview-questions
- **B10** *(snippet)* Google "Googleyness" prep pages (Interview Kickstart, igotanoffer): https://interviewkickstart.com/blogs/interview-questions/google-software-engineer-interview-sample-questions-and-tips
- **B11** *(snippet)* Former Meta interviewer: ambiguity was their #1 area across 500+ interviews: https://thebehavioral.substack.com/p/deeper-dive-into-the-signal-areas
- **B12** Recrew, LLM engineer interview guide (behavioral and intro sections): https://www.recrew.ai/interview-questions/llm-engineer

System design:
- **S1** system-design-primer (CC BY 4.0): https://github.com/donnemartin/system-design-primer
- **S2** Hello Interview problem breakdowns (32 problems): https://www.hellointerview.com/learn/system-design/problem-breakdowns/overview
- **S3** Alex Xu, *System Design Interview* Vol. 1, table of contents only *(snippet, via retailer listings)*: https://payhip.com/b/B5d4e
- **S4** Xu & Lam, *System Design Interview* Vol. 2, table of contents only *(snippet)*: https://bookshop.org/p/books/system-design-interview-an-insider-s-guide-volume-2-alex-xu/55e65c463adb15c4
- **S5** Grokking System Design free companion repo, `questions/` directory: https://github.com/design-gurus/grokking-system-design
- **S6** ashishps1/awesome-system-design-resources (GPL-3.0; counted only): https://github.com/ashishps1/awesome-system-design-resources
- **S7** *(snippet)* GeeksforGeeks, most commonly asked SD problems: https://www.geeksforgeeks.org/most-commonly-asked-system-design-interview-problems-questions/
- **S8** *(snippet)* study-notes "Top 25 most common": https://study-notes-dge.pages.dev/system-design/system-design-interview/practice/common-questions
- **S9** karanpratapsingh/system-design problem list (CC BY-NC-ND; counted only, per our earlier research): https://github.com/karanpratapsingh/system-design

Backend technical discussion:
- **T1** arialdomartini/Back-End-Developer-Interview-Questions (GPL-2.0; counted only): https://github.com/arialdomartini/Back-End-Developer-Interview-Questions
- **T2** Braintrust, backend developer questions: https://usebraintrust.com/hire/interview-questions/backend-developers
- **T3** SecondTalent, backend interview guide: https://www.secondtalent.com/interview-guide/backend-developer/
- **T4** Intervy, backend developer questions: https://intervy.pages.dev/interview-questions/backend-developer
- **T5** system-design-primer topic index (CAP, consistency, caching, RPC vs REST, SQL vs NoSQL)
- **T6** "What happens when you type a URL": alex/what-happens-when (about 43k stars, https://github.com/alex/what-happens-when), Expedia Group Tech (https://medium.com/expedia-group-tech/what-happens-when-i-type-something-in-the-browsers-address-bar-89a1243f0fff), and a post titled "Common Interview Question: What Happens When You Type An URL?" (https://sabootcamp.kit.com/posts/common-interview-question-what-happens-when-you-type-an-url)
- **T7** *(snippet)* upGrad top 25 / startup.jobs backend questions: https://www.upgrad.com/blog/backend-interview-questions-and-answers/

AI engineer:
- **A1** KalyanKS LLM Interview Questions and Answers Hub (Apache-2.0): https://github.com/KalyanKS-NLP/LLM-Interview-Questions-and-Answers-Hub
- **A2** llmgenai/LLMInterviewQuestions, section headings only (no license; counted only): https://github.com/llmgenai/LLMInterviewQuestions
- **A3** lets-code, GenAI/LLM/RAG interview questions 2026: https://lets-code.co.in/articles/generative-ai-interview-questions
- **A4** Recrew, LLM engineer interview questions: https://www.recrew.ai/interview-questions/llm-engineer
- **A5** InterviewBit, 60 GenAI interview questions: https://www.interviewbit.com/varsity/blog/?p=127
- **A6** The Interview Guys, top LLM interview questions: https://blog.theinterviewguys.com/?p=12501
- **A7** *(snippet)* prep-site summaries listing the recurring areas (huru.ai, Educative): https://www.educative.io/guide/generative-ai-interview-preparation
- **A8** Grokking System Design repo AI problems (RAG pipeline, ChatGPT, LLM inference, model evaluation, LLM gateway, semantic search, recommendation): https://github.com/design-gurus/grokking-system-design
- **A9** alirezadir/Machine-Learning-Interviews, ML system design section (MIT): https://github.com/alirezadir/Machine-Learning-Interviews

---

## 1. Behavioral (applies to both roles)

| # | Theme | # sources | Sources | In bank? |
|---|---|---|---|---|
| 1 | Conflict or disagreement with a teammate | 7 | B1 B4 B5 B6 B7 B8 B9 | `sde-beh-conflict-1`, `aie-beh-disagree-1` |
| 2 | A time you failed, or a mistake you made | 6 | B1 B4 B6 B7 B8 B9 | **new** `sde-beh-failure-1`, **new** `sde-beh-mistake-1`; `sde-beh-wrong-call-1`, `aie-beh-failed-idea-1` |
| 3 | Most challenging or proudest project | 6 | B1 B2 B5 B6 B7 B8 | **new** `sde-beh-challenging-project-1`, **new** `aie-beh-hardest-project-1` |
| 4 | Tight or missed deadline | 6 | B1 B3 B4 B6 B7 B8 | `sde-beh-ownership-1` |
| 5 | Ambiguity, or deciding with incomplete information | 6 | B1 B6 B7 B8 B10 B11 | `sde-beh-ambiguity-1`, **new** `aie-beh-vague-ai-ask-1` |
| 6 | Feedback you received, growth | 5 | B1 B4 B5 B7 B8 | `sde-beh-feedback-1` |
| 7 | Why this company or role | 5 | B1 B2 B8 B10 B12 | **new** `sde-beh-why-role-1` |
| 8 | Took initiative beyond your scope | 5 | B4 B6 B7 B8 B9 | `sde-beh-initiative-1` |
| 9 | Influenced or led people without authority | 5 | B1 B4 B6 B7 B10 | **new** `sde-beh-influence-1` |
| 10 | Competing priorities, too much work | 5 | B1 B3 B6 B7 B10 | **new** `sde-beh-priorities-1` |
| 11 | Disagreed with your manager, pushed back | 4 | B1 B6 B7 B8 | `sde-beh-pushback-1` |
| 12 | Tell me about yourself, walk me through your background | 4 | B1 B2 B5 B12 | **new** `sde-beh-intro-1` |
| 13 | Learned something new fast | 4 | B1 B4 B6 B7 | `sde-beh-ramp-up-1` |
| 14 | Customer or user focus | 4 | B3 B6 B7 B9 | **new** `sde-beh-customer-1` |
| 15 | Adapted to changing requirements | 4 | B3 B4 B7 B8 | **new** `sde-beh-changing-reqs-1` |
| 16 | Worked with a difficult person | 3 | B1 B7 B8 | **new** `sde-beh-difficult-coworker-1` |
| 17 | Hardest bug or technical problem | 3 | B1 B6 B12 | `sde-beh-hardest-bug-1` |
| 18 | Explained something technical to a non-technical person | 3 | B3 B8 B12 | **new** `sde-beh-explain-1`, `aie-beh-explain-failure-1` |
| 19 | Gave someone difficult feedback | 3 | B6 B7 B8 | **new** `sde-beh-give-feedback-1` |
| 20 | Quality vs speed, tech debt, short vs long term | 3 | B6 B7, Amazon prep *(snippet)* | `sde-beh-tech-debt-1` |
| 21 | Mentored or unblocked a teammate | 3 | B1 B6 B7 | `sde-beh-mentoring-1` |
| 22 | Persevered on something hard | 3 | B1 B4 B5 | `sde-beh-stuck-1` |
| 23 | Production incident or a feature that degraded | 3 | B7 B12 A6 | `sde-beh-incident-1`, `aie-beh-drift-1` |
| 24 | Strengths and weaknesses | 3+ | B1 B2, Hired list in B1 | missing (see gaps) |
| 25 | A decision driven by data | 2 | B6 B7 | partly `aie-beh-too-good-1` |

Tie-breaks: "disagree with your manager" (4) and "tell me about yourself" (4) are tagged
very_common, while the other 4-source themes are `common`. The manager question is
emphasised in the Amazon and Meta-specific guides (backbone / disagree-and-commit).
"Tell me about yourself" opens most loops, and guides tend to leave it off their lists
because it's assumed.

AI-flavoured behavioral (ai_engineer only, where the story is genuinely different):
- A model or LLM feature that degraded in production (B12, A4, A5, A6): `aie-beh-drift-1`, very_common.
- Pushed back on shipping without evals (A4): `aie-beh-launch-block-1`.
- When an LLM is not the right tool (A4): `aie-beh-not-ml-1`.
- Explaining model limits to stakeholders (A4, A6): `aie-beh-explain-failure-1`.
- Demo vs production (A4): `aie-beh-demo-to-prod-1`.
- Staying current / trying new techniques (A4, A5, A6, B1-Stripe): **new** `aie-beh-new-technique-1`.

## 2. System design

| # | Problem | # sources | Sources | In bank? |
|---|---|---|---|---|
| 1 | URL shortener / Pastebin | 8 | S1 S2 S3 S5 S6 S7 S8 S9 | `sde-sd-shortener-1` |
| 2 | Chat / messaging | 8 | S1 S2 S3 S5 S6 S7 S8 S9 | `sde-sd-chat-1` |
| 3 | News feed / Twitter timeline | 8 | S1 S2 S3 S5 S6 S7 S8 S9 | `sde-sd-news-feed-1` |
| 4 | Video streaming (YouTube / Netflix) | 7 | S2 S3 S5 S6 S7 S8 S9 | **new** `sde-sd-video-1` |
| 5 | File storage and sync (Dropbox / Drive) | 6 | S1 S2 S3 S5 S6 S7 | **new** `sde-sd-file-sync-1` |
| 6 | Rate limiter | 5 | S2 S3 S5 S6 S8 | `sde-sd-rate-limiter-1` |
| 7 | Notification system | 5 | S2 S3 S5 S6 S8 | `sde-sd-notifications-1` |
| 8 | Web crawler | 5 | S1 S2 S3 S5 S7 | `sde-sd-web-crawler-1` |
| 9 | Photo sharing (Instagram) | 5 | S1 S2 S5 S6 S7 | partly: `sde-sd-news-feed-1` + `sde-sd-profile-photos-1` |
| 10 | Ride hailing (Uber) | 4 | S2 S5 S6 S9 | **new** `sde-sd-ride-hailing-1` |
| 11 | Distributed cache | 4 | S1 S2 S5 S6 | **new** `sde-sd-distributed-cache-1` |
| 12 | Payment system | 4 | S2 S4 S5 S6 | **new** `sde-sd-payments-1` |
| 13 | Ticketing / hotel / flight booking | 4 | S2 S4 S5 S6 | `sde-sd-ticketing-1` |
| 14 | Metrics and monitoring | 4 | S2 S4 S5 S6 | **new** `sde-sd-metrics-1` |
| 15 | Proximity search (Yelp) | 4 | S2 S4 S5 S6 | partly: `sde-sd-ride-hailing-1` (geospatial index) |
| 16 | Collaborative editor (Google Docs) | 4 | S1 S2 S5 S6 | missing |
| 17 | Key-value store | 3 | S1 S3 S6 | `sde-sd-kv-store-1` |
| 18 | Typeahead / autocomplete | 3 | S3 S5 S6 | `sde-sd-autocomplete-1` |
| 19 | Unique ID generator | 3 | S3 S5 S8 | **new** `sde-sd-id-generator-1` |
| 20 | Distributed job scheduler | 3 | S2 S5 S6 | partly `sde-tech-run-once-1` |
| 21 | Message queue (Kafka-like) | 3 | S4 S5 S6 | missing |
| 22 | Leaderboard | 2 | S4 S5 | `sde-sd-leaderboard-1` |

AI system design (ai_engineer):

| Problem | # sources | Sources | In bank? |
|---|---|---|---|
| RAG assistant over private docs | 6 | A3 A4 A5 A7 A8, existing research | `aie-sd-rag-assistant-1` |
| Evaluation pipeline for LLM changes | 4 | A4 A5 A8, existing research | `aie-sd-eval-system-1` |
| Chat assistant product (ChatGPT-like) | 3 | S2 A8, A5 (production prompt design) | **new** `aie-sd-chat-assistant-1` |
| Recommendation system | 4 | S1 S6 A8 A9 | **new** `aie-sd-recommendations-1` |
| LLM serving / inference platform | 3 | A1 (serving topics) A8, existing research | `aie-sd-llm-serving-1` |
| LLM gateway | 2 | A8, existing research | `aie-sd-llm-gateway-1` |
| Support agent with tools | 3 | A4 A5 A8 (agent orchestration) | `aie-sd-support-agent-1` |
| Semantic search | 2 | A8 A3 | `aie-sd-semantic-search-1` |

## 3. Backend technical discussion (not coding puzzles)

| # | Topic | # sources | Sources | In bank? |
|---|---|---|---|---|
| 1 | SQL vs NoSQL | 6 | T1 T2 T3 T4 T5 T7 | **new** `sde-tech-sql-nosql-1` |
| 2 | Caching strategies and invalidation | 6 | T1 T2 T3 T4 T5 T7 | **new** `sde-tech-cache-invalidation-1` (`sde-tech-lru-cache-1` covers the in-process version) |
| 3 | Indexes, slow queries, N+1 | 5 | T1 T2 T3 T4 T7 | **new** `sde-tech-slow-query-1` |
| 4 | REST vs gRPC vs GraphQL, API design | 5 | T1 T2 T3 T4 T5 | **new** `sde-tech-api-style-1`; `sde-tech-pagination-1` |
| 5 | Concurrency, race conditions, deadlocks | 4 | T1 T2 T3 T4 | `sde-tech-shared-counter-1`, `sde-tech-double-spend-1` |
| 6 | What happens when you type a URL | 4 | T1 T6 (three independent write-ups) | **new** `sde-tech-url-1` |
| 7 | Debugging a slow service, p99, 5xx spikes | 4 | T1 T2 T3 T4 | `sde-tech-p99-bursts-1` |
| 8 | Transactions, ACID, isolation, locking | 4 | T1 T2 T3 T4 | **new** `sde-tech-transactions-1` |
| 9 | CAP, eventual consistency | 4 | T1 T2 T5 T7 | **new** `sde-tech-cap-1` |
| 10 | Idempotency and retries | 3 | T2 T3 T7 | **new** `sde-tech-idempotency-1`; `sde-tech-retry-client-1` |
| 11 | Security: authn vs authz, SQL injection, password storage | 3 | T2 T3 T4 | missing |
| 12 | Message queues, sync vs async | 3 | T3 T4 T5 | partly `sde-sd-notifications-1` |
| 13 | Horizontal scaling, load balancing, monolith vs microservices | 3 | T2 T4 T5 | covered inside SD questions |
| 14 | Testing strategy | 2 | T2 T4 | `sde-tech-flaky-test-1` |
| 15 | Rate limiting | 2 | T2 T4 | `sde-sd-rate-limiter-1` |

Tie-break: of the 4-source topics, "what happens when you type a URL" and "debugging a
slow service" are tagged very_common, and transactions and CAP are `common`. The URL
question is the one that several write-ups explicitly call a recurring classic.
Slow-service debugging shows up as several distinct questions inside each source.

## 4. AI engineer technical

| # | Topic | # sources | Sources | In bank? |
|---|---|---|---|---|
| 1 | RAG pipeline design and debugging wrong answers | 7 | A1 A2 A3 A4 A5 A7 A8 | `aie-tech-rag-1` |
| 2 | Evaluating LLM output, LLM-as-judge, regressions | 7 | A2 A3 A4 A5 A6 A7 A8 | **new** `aie-tech-llm-eval-1` |
| 3 | Agents and tool use | 7 | A1 A2 A3 A4 A5 A7 A8 | `aie-tech-agent-loop-1` |
| 4 | Prompting vs RAG vs fine-tuning | 6 | A1 A3 A4 A5 A6 A7 | **new** `aie-tech-rag-vs-finetune-1` |
| 5 | Hallucination causes and mitigation | 6 | A1 A2 A3 A4 A6 A7 | **new** `aie-tech-hallucination-1` |
| 6 | Fine-tuning, LoRA / QLoRA, forgetting | 6 | A1 A2 A3 A4 A5 A6 | **new** `aie-tech-lora-1` |
| 7 | Transformers and self-attention | 6 | A1 A2 A3 A5 A6 A7 | **new** `aie-tech-attention-1` |
| 8 | Latency, cost, serving, KV cache, quantization | 6 | A1 A2 A4 A5 A7 A8 | **new** `aie-tech-llm-latency-1`; `aie-tech-kv-cache-1` |
| 9 | Embeddings, vector search, chunking | 5 | A2 A3 A4 A5 A7 | **new** `aie-tech-chunking-1`; `aie-tech-similarity-search-1`, `aie-tech-reembed-1` |
| 10 | Prompt injection and LLM security | 4 | A2 A3 A4 A5 | `aie-tech-prompt-injection-1` |
| 11 | Monitoring quality and drift in production | 4 | A3 A4 A5 A6 | `aie-beh-drift-1`, `aie-sd-eval-system-1` |
| 12 | Decoding: temperature, top-p | 4 | A1 A3 A4 A5 | **new** `aie-tech-temperature-1` |
| 13 | Tokenization and context windows | 4 | A1 A3 A4 A5 | partly (`aie-sd-chat-assistant-1` ladder) |
| 14 | RLHF / DPO / alignment | 4 | A2 A3 A5 A6 | missing |
| 15 | Structured output, function calling | 2 | A3 A5 | partly `aie-sd-invoice-extraction-1` |

Classic ML fundamentals (overfitting, class imbalance, offline vs online metrics) are
standard in alirezadir (A9) and the deep-learning sections of A3. They are tagged
`common` on the existing questions.

## 5. What changed in the bank

- 40 new questions. SDE gets 27: 12 behavioral, 8 technical, 7 system design. AI
  Engineer gets 13: 3 behavioral, 8 technical, 2 system design.
- Every question now has an `asked` tag. The planner sees it and is told to include at
  least 2 very_common questions per session when they exist for the mode and level.
- Every theme in the behavioral top 15, the system design top 10, and the technical and
  AI top 10 is covered by at least one bank question. Problem 9 (Instagram) is only
  partly covered.

## 6. Known gaps (next candidates)

- Strengths and weaknesses: a screening question with little to probe. Left out on
  purpose for now.
- Collaborative editor (Google Docs), a message queue, a dedicated proximity service
  and a photo-sharing design.
- Backend security (password storage, SQL injection, authn vs authz).
- Tokenization and context windows, and RLHF/DPO, as AI technical questions.
- The frequency counts should be checked against real data if we ever get any: for
  example, ask beta users which bank questions they were actually asked, and re-tag.
