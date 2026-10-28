# Question sources and datasets for the Crucible question bank

Researched 2026-10-27. Licenses were read from the Hugging Face API tags and dataset cards, the GitHub API (`license.spdx_id`) and the LICENSE/README text, and the Kaggle API. "Unknown" means no license was found. In that case, treat the material as all rights reserved.

Current state in the repo: `backend/models/question_data.py` defines `QuestionExemplar` (`competency`, `type`, `difficulty`, `prompt`, `ideal_answer_points`, `follow_up_hooks`, `rubric.criteria`). `backend/data/competencies/{sde,ai_engineer}.json` hold only weighted competency areas (for example "ML Fundamentals" 0.2 and "LLM / Prompting / RAG / Agents" 0.2). No question content ships yet.

---

## 1. Summary and recommendation

**No public dataset gives us what the bank needs.** The bank needs each question tied to a competency, with rubric anchors and a follow-up ladder. Every dataset we checked falls into one of these groups:
- Flat Q/A trivia ("What is Java?"), often synthetic or scraped.
- Personality and affect video corpora (MIT Interview, RecruitView, First Impressions), rated on traits such as "friendliness" rather than answer quality.
- Inaccessible.

None has graded answers to SWE or AI-engineering questions with rubric scores. **The rubric anchors and follow-up ladders must be authored by us.**

What to actually use:

1. **Write the bank ourselves**, based on the structured-interviewing method (Section 5). Each question gets one competency, a BARS-style 1/3/5 anchor set (2 and 4 are interpolated), and a 3–4 rung follow-up ladder. Only our own wording ships in the public repo.
2. **Questions we can copy or adapt with attribution:**
   - Tech Interview Handbook (MIT): behavioral question list plus a per-level rubric framing (junior/senior/staff scope).
   - system-design-primer (CC BY 4.0): canonical system design problems and the trade-off topics behind them.
   - KalyanKS LLM Interview Hub (Apache-2.0): LLM fundamentals question stems.
   - alirezadir/Machine-Learning-Interviews (MIT): ML and GenAI system design topics.

   Keep a `source` and `license` field per question, plus a NOTICE/ATTRIBUTION file.
3. **Rubric methodology** comes from US OPM structured interview guidance, which is a US government work and so public domain in the US. Use it together with re:Work's 4-level scale (poor / borderline / solid / outstanding) and Levashina et al. 2014. Cite these sources and write our own text. Don't copy re:Work text, because no reuse license is stated.
4. **Eval cases:** synthesize our own graded answers. For each question, write a 1/3/5 example answer from the anchors, plus adversarial cases (vague, rambling, injection, junk). This extends what commit `0c21d6a` already does.
5. **Evaluator calibration:** have 2–3 real engineers score 30–50 of our synthetic answers blind. Measure agreement with the Evaluator (e.g. Cohen's kappa / Spearman). No public dataset can substitute for this step.
6. **Don't ship anything derived from:**
   - ByteByteGo or karanpratapsingh (CC BY-NC-ND).
   - Chip Huyen's ML Interviews Book (copyright, no license).
   - Repos with no license (khangich, llmgenai, checkcheckzz, Devinterview-io).
   - Glassdoor or LeetCode text.
   - interviewing.io transcripts.
   - Any HF dataset whose rows were scraped from those sources, even if it is tagged Apache or MIT.

   Problem names like "design a URL shortener" are generic ideas, not copyrightable expression. Anyone can use those.
7. **Interviewer-behaviour inspiration only:** InterviewBench (CC BY 4.0). It benchmarks LLMs as survey interviewers on follow-up and recovery decisions. Its taxonomy of respondent disruptions is a useful template for our follow-up and pushback eval cases. The content itself is not job-interview material.

---

## 2. Datasets

Real/Synth means the following:
- **real:** human-authored questions or real recordings.
- **synth:** LLM-generated or template-generated.
- **scraped:** rows copied from third-party sites. The upstream copyright still applies regardless of the dataset's tag.

| Name | Link | Contents (verified sample) | Size | License (exact) | Real/Synth | Usable for |
|---|---|---|---|---|---|---|
| Eve39570/interview-dataset | huggingface.co/datasets/Eve39570/interview-dataset | **Not accessible.** The API returns "does not exist, or is not accessible without authentication (private or gated)". The author's public datasets are unrelated (e.g. `verified-analytics-tasks`). | n/a | unknown | unknown | not usable |
| anuj6316/Interview_Questions | huggingface.co/datasets/anuj6316/Interview_Questions | **Not accessible** (same error). The author's only public dataset is `anuj6316/text2sql`. | n/a | unknown | unknown | not usable |
| AI-Mock-Interviewer/Train_data | huggingface.co/datasets/AI-Mock-Interviewer/Train_data | Instruction pairs, e.g. `### Instruction: Generate a Data Engineer interview question for Intel ### Response: what are some limitations of these metrics that you should be aware of?` Many questions are context-free fragments. Mostly data science and analytics roles. | 6,932 rows (the card claims 10K–100K) | apache-2.0 (tag) | scraped/mixed | not usable (low quality, upstream provenance unknown) |
| AI-Mock-Interviewer/Test_Data | same org | Validation split of the above (`val_data.jsonl`). | <1K | apache-2.0 | same | not usable |
| AI-Mock-Interviewer/FAANG_Data | same org | CSV `Questions,Type,Role`, e.g. "How would you calculate the median in SQL?", "How do you find the third highest mountains in MX and USA?". The second matches StrataScratch/DataLemur-style problems, so likely scraped. The CSV is malformed (the HF parser fails at line 222). | ~794 rows | apache-2.0 (tag only, with an empty card) | scraped | not usable (the provenance makes the Apache tag unreliable) |
| AI-Mock-Interviewer/Company_Data | same org | `question, domain, company, year, coding, personal_exp`, e.g. "How do you approach image segmentation…". Company labels suggest it came from Glassdoor or similar. | 1K–10K | apache-2.0 | scraped | not usable |
| AI-Mock-Interviewer/PDF_Extracted_Data | same org | Q&A extracted from PDFs (`Q&A_merged.csv`). The PDFs are unnamed. | 1K–10K | apache-2.0 | scraped | not usable |
| AI-Mock-Interviewer/Bert_train, T5_retrain | same org | Training-format derivatives of the above. | 1K–10K | apache-2.0 | derived | not usable |
| AI4A-lab/RecruitView | huggingface.co/datasets/AI4A-lab/RecruitView | Multimodal (video) dataset of candidate responses rated for personality and interview-performance traits, intended for affective computing and soft-skill research. Access is gated (manual approval). | 1K–10K | **cc-by-nc-4.0** | real (recorded) | not usable for shipping (non-commercial). At most internal research on delivery signals. Its targets are personality traits, not technical answer quality. |
| MIT Interview Dataset (Naim, Tanveer, Gildea, Hoque) | roc-hci.com/?p=173 · arXiv:1504.03425 | 138 videos of mock interviews with 69 MIT undergraduates. Ratings from 9 MTurk judges on traits (overall, excitement, engagement, friendliness…), plus features. | 138 sessions | Custom terms via a request form. Institutional email required. No open license. | real | not usable (no redistribution allowed; ratings are of behavioural impression, not content) |
| ChaLearn First Impressions V2 | chalearnlap.cvc.uab.cat (challenge) | 10K × 15s YouTube clips with Big-Five labels and an "invite to interview" label (MTurk pairwise ratings). Transcripts were created by later researchers using Rev. | 10K clips | Not found. Challenge terms are research-only per community usage. | real (YouTube vlogs, not interviews) | not usable. Papers also flag it as unfit for hiring decisions. |
| Agnania/InterviewBench | huggingface.co/datasets/Agnania/InterviewBench | Benchmark of **LLMs as interviewers**: 4,500 next-action MCQs, 2,000 open next-action items, 1,000 disruption-recovery items, and questionnaire-grounded multi-turn interviews with personas. These are survey and journalism interviews, not job interviews. | 10K–100K | **cc-by-4.0** | synth/derived | eval-case **design inspiration** (follow-up, pushback, recovery categories). Items can be adapted with attribution, but the domain is wrong. |
| paddy4544/interview_followup_questions | huggingface.co/datasets/paddy4544/interview_followup_questions | Template pairs: "I've been learning Java and trying it out on API development." → "What's the best way to start learning Java in your opinion?" Small talk, no probing. | ~2M rows | mit | synth (templated) | not usable. This is the opposite of a hard follow-up. |
| Shlok307/Interview_questions | huggingface.co/datasets/Shlok307/Interview_questions | `domain, question, answer`, trivia-style ("Which type of AI is capable of … visual perception?"). The card says it is a "restructured … version of an **unlicensed** Kaggle dataset. Released under CC-BY 4.0". | 5,002 | cc-by-4.0 (claimed over unlicensed upstream) | scraped/rewritten | not usable (relicensing an unlicensed source is not valid) |
| K-areem/AI-Interview-Questions | huggingface.co/datasets/K-areem/AI-Interview-Questions | `<s>[INST] … [/INST] …` SFT format, software-engineering textbook questions ("How does UML facilitate…"). | 4,653 train + 1,164 eval | none on card | likely synth from textbooks | not usable |
| ali-alkhars/interviews | huggingface.co/datasets/ali-alkhars/interviews | Question-generation pairs aggregated from sudheerj/*, in28minutes, h5bp, arialdomartini repos, and the Kaggle set below. | 1K–10K | none on card (each upstream has its own) | scraped | not usable directly. Go to upstreams if needed. |
| syedmharis/software-engineering-interview-questions-dataset (Kaggle) | kaggle.com/datasets/syedmharis/software-engineering-interview-questions-dataset | "Advanced" SWE questions covering algorithms, system design and ML (per its description). | ~41 KB (a few hundred rows) | **MIT** (Kaggle metadata) | unclear | seed questions (stems only, after manual review). Origin is unclear, so prefer rewriting. |
| juasdexter/interview_questions | huggingface.co/datasets/juasdexter/interview_questions | `qid, language, level, question, answer`, e.g. Java Easy "What is Java?" | <1K | apache-2.0 | real (trivia) | not useful (trivia level) |
| ChigozieAnyaejiP/Interview_questions, dhyay/interviewprep, narayanan413/python_interviewQA | HF | Small trivia Q/A sets. | <1K each | mit / mit / apache-2.0 | mixed | not useful |
| devpkprajapati/ai-system-design-instruct | huggingface.co/datasets/devpkprajapati/ai-system-design-instruct | 60 LLM-generated end-to-end AI system designs over about 5 templates (Fraud Scoring 35k QPS p99<45ms, Enterprise RAG, Voice Orchestrator, LLM API Gateway, Semantic Search), with 15–20-section completions. | 60 | mit | synth | **eval cases / reference answers for AI system design** (the problem framing with QPS and latency budgets is good). Review before use. |
| ml-system-design/ml-design-doc-reviewer-data | HF | "Flawed" ML design docs (`flawed/case_000_disdoc.md`…). Gated. | <1K | apache-2.0 | synth | possible evaluator calibration for design flaws, after gaining access. Not inspected. |
| Shaharyar1/30k-tech-interview-questions-dataset | HF | Card only. Data files are not public. | claimed 30K | `other` (custom commercial license) | unknown | not usable |
| Glavin001/startup-interviews, Steve_Jobs/Musk/Trump interviews, SandO114/Medical_Interview, annomi (MI therapy) | HF | Press, medical or therapy interviews. | various | cc-by-nc-2.0 / apache-2.0 / openrail | real | not relevant |

**Honest bottom line:** there is no open dataset of *graded answers to SWE or AI-engineer interview questions*. Automatic interview assessment research (MIT Interview, First Impressions, RecruitView, HireVue-style work) scores delivery and personality, not technical substance, and is non-commercial or request-only. We must create our own evaluation and calibration data.

---

## 3. Question and rubric sources (non-dataset)

| Name | Link | Contents | Size | License (exact) | Real/Synth | Usable for |
|---|---|---|---|---|---|---|
| Tech Interview Handbook | github.com/yangshun/tech-interview-handbook | `behavioral-interview-questions.md`, `behavioral-interview-rubrics.md` (focus areas Motivation, Proactive, Unstructured env, Perseverance, Conflict, Empathy, Growth, Communication, each with example questions and **Junior/Senior/Staff scope anchors**), `system-design.md`, `behavioral-interview-senior-candidates.md`. | ~100 behavioral questions | **MIT** (LICENSE file; the README says "providing code… under an open source license") | real (practitioner-written) | **seed behavioral questions + level-scoping anchors** (copy with attribution; better to paraphrase) |
| system-design-primer | github.com/donnemartin/system-design-primer | Topic guides (CAP, consistency, caching, sharding, queues) + solved problems: Pastebin/bit.ly, Twitter timeline & search, web crawler, Mint.com, social graph, KV-store cache, Amazon sales rank, scaling AWS to millions. Includes Anki decks. | ~10 solved problems | **CC BY 4.0** ("Copyright 2017 Donne Martin"; GitHub shows NOASSERTION because it is not a code license) | real | **seed SD problems + expected trade-off points** (copy or adapt with attribution) |
| alirezadir/Machine-Learning-Interviews | github.com/alirezadir/Machine-Learning-Interviews | `src/MLSD` (ML system design template and problems), `ml-fundamental.md`, `ml-depth.md`, `behavioral`, `genai-resources.md`. | large | **MIT** | real | **seed AI-eng/ML SD problems + fundamentals stems** |
| KalyanKS-NLP/LLM-Interview-Questions-and-Answers-Hub | github.com/KalyanKS-NLP/LLM-Interview-Questions-and-Answers-Hub | 100+ LLM Q&A ("How do you handle the large memory requirements of KV cache in LLM inference?", "How does quantization affect inference speed and memory?"). | 100+ | **Apache-2.0** | real | **seed LLM technical stems** (keep NOTICE) |
| jwasham/coding-interview-university | github.com/jwasham/coding-interview-university | Study plan, not a question bank. | — | CC-BY-SA-4.0 | real | topic coverage checklist only (share-alike: don't copy text into our bank) |
| DopplerHQ/awesome-interview-questions | github.com/DopplerHQ/awesome-interview-questions | A list of links to other question lists. | — | CC0 (the list itself) | — | discovery only. Each linked repo has its own license. |
| binhnguyennus/awesome-scalability | github.com/binhnguyennus/awesome-scalability | Links to real company engineering blog posts on scaling. | — | MIT (list) | real | follow-up ladder inspiration ("how did X actually do it"). Linked articles are copyrighted. |
| viraptor/reverse-interview | github.com/viraptor/reverse-interview | Questions candidates ask companies. | — | CC BY-SA 4.0 | real | not needed |
| ashishps1/awesome-system-design-resources, awesome-behavioral-interviews; InterviewReady/system-design-resources | GitHub | Curated link lists + short notes. | — | **GPL-3.0** | real | reference reading only. Copying text would pull GPL obligations into the data. |
| andreis/interview | github.com/andreis/interview | Mixed algorithm questions and links. | — | WTFPL | real | usable but low value |
| Ebazhanov/linkedin-skill-assessments-quizzes | GitHub | MCQ quizzes (LinkedIn assessments). | — | AGPL-3.0 (and copied from LinkedIn) | scraped | not usable |
| ByteByteGo system-design-101 | github.com/ByteByteGoHq/system-design-101 | Visual explainers. | — | **CC BY-NC-ND 4.0** | real | **not usable** (no derivatives, no commercial use). Read only. |
| karanpratapsingh/system-design | github.com/karanpratapsingh/system-design | Full SD course + problems (URL shortener, WhatsApp, Twitter, Netflix, Uber). | — | **CC BY-NC-ND 4.0** (LICENSE file) | real | **not usable** beyond reading |
| Alex Xu, *System Design Interview* Vol 1/2; Chip Huyen, *ML Interviews Book* (github.com/chiphuyen/ml-interviews-book), *Designing ML Systems*, *AI Engineering* | books / repo | Canonical problems and worked solutions. | — | **All rights reserved** (the Huyen repo has no LICENSE file; the README says "Copyright ©2021 Chip Huyen") | real | read for coverage. **Never copy text or solution structure.** Generic problem names are fine. |
| khangich/machine-learning-interview, llmgenai/LLMInterviewQuestions, checkcheckzz/system-design-interview, Devinterview-io/llms-interview-questions, youssefHosni/Data-Science-Interview-Questions-Answers | GitHub | ML, LLM and SD question lists. | — | **none** (GitHub API: no license) | real/mixed | not usable for copying (default copyright). Coverage check only. |
| Google re:Work, "Guide to structured interviewing" | rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices | 4 components (vetted questions, written feedback, standardized rubrics, interviewer training/calibration). Sample behavioral question "Tell me about a time your behavior had a positive impact on your team" with follow-ups, plus a hypothetical example. Rating levels: **poor / borderline / solid / outstanding** with illustrative answers per attribute. | small | No reuse license stated (Google ToS) | real | **method reference** (cite, paraphrase). Don't copy the question text verbatim. |
| US OPM, Structured Interviews guide + FAQ | opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/structured-interviews.pdf; opm.gov FAQ "How do I develop a customized rating scale…" | One proficiency scale for all competencies (3–7 levels, at least 3 labelled). SMEs write behavioral anchors per level by consensus. 5-point scale from 1 Awareness to 5 Expert. Equal competency weights unless justified. Probes and pilot testing. | — | **US federal government work: public domain in the US (17 U.S.C. §105)** | real | **rubric methodology** (can quote) |
| Amazon Leadership Principles | amazon.jobs/content/en/our-workplace/leadership-principles; aboutamazon.com "leadership principles interview" | 16 LPs; advice to use STAR and say "I" not "we". Amazon publishes no official question bank. Question lists online are third-party. | 16 principles | Amazon copyright (principle names and descriptions) | real | competency taxonomy inspiration only. Write our own questions. Don't brand questions as "Amazon". |
| interviewing.io public mock interviews | interviewing.io (showcase, blog, YouTube) | Anonymized real mock interview recordings and transcripts with interviewer feedback. | hundreds | **Not openly licensed.** Terms of use were not found or verified, so treat as all rights reserved. | real | listen to calibrate follow-up style. **Do not copy or ingest.** |
| Glassdoor, LeetCode Discuss, Blind | — | Crowdsourced "questions I got asked". | huge | Site ToS forbid scraping/redistribution | real | not usable |

---

## 4. Canonical system design problems

What each problem *really* tests is the signal to anchor rubrics on. Problem names are generic and safe. Write all prompt text ourselves.

### 4a. SDE (generic distributed systems)

| # | Problem | Level | What it really tests |
|---|---|---|---|
| 1 | URL shortener / Pastebin | junior–mid | Requirements and capacity estimates, ID generation (hash vs counter vs base62 vs collisions), read-heavy caching, KV store choice, redirects 301 vs 302 |
| 2 | Rate limiter (API / distributed) | mid | Algorithms (token bucket, leaky bucket, sliding window), where to enforce, distributed counters (Redis + atomicity), clock skew, fail-open vs fail-closed |
| 3 | Distributed key-value store | senior | Partitioning (consistent hashing), replication, quorum (N/R/W), conflict resolution (vector clocks, LWW), CAP trade-offs, failure detection (gossip) |
| 4 | Distributed cache (e.g. memcached tier) | mid | Eviction (LRU/LFU), write-through/back/around, invalidation, hot keys, thundering herd/stampede protection |
| 5 | News feed / Twitter timeline | mid–senior | Fan-out on write vs read, the celebrity problem (hybrid), ranking, pagination, cache of timelines |
| 6 | Chat / messaging (WhatsApp, Slack) | mid–senior | Persistent connections (WebSocket), delivery guarantees and ordering, presence, offline sync, group fan-out, read receipts |
| 7 | Notification system (push/email/SMS) | mid | Queues, retries and idempotency, provider abstraction, rate limits per user, templating, dedup |
| 8 | Web crawler | mid–senior | URL frontier, politeness, dedup (content hashing, Bloom filters), DNS, distributed scheduling, traps |
| 9 | Search autocomplete / typeahead | mid | Trie vs prefix index, top-k precompute, latency budget, update pipeline, personalization |
| 10 | Video streaming (YouTube/Netflix) | senior | Upload and transcoding pipeline, chunked adaptive bitrate (HLS/DASH), CDN, metadata vs blob storage, view counts |
| 11 | File storage and sync (Dropbox / Google Drive) | senior | Chunking + dedup, delta sync, metadata DB consistency, conflict resolution, resumable uploads |
| 12 | Ride hailing / proximity (Uber, Yelp) | senior | Geospatial indexing (geohash/quadtree/S2), high-frequency location writes, matching, consistency of driver state |
| 13 | Ticketing / booking (Ticketmaster, hotel) | mid–senior | Inventory contention, reservations with TTL holds, strong consistency, idempotent payments, queueing hot events |
| 14 | Payment system | senior | Idempotency keys, double-entry ledger, exactly-once illusion via reconciliation, PSP integration, retries vs duplicates |
| 15 | Distributed job scheduler / cron | senior | Leader election, at-least-once execution + idempotency, time-bucketed storage, retries/backoff, sharding |
| 16 | Metrics / logging / monitoring system | senior | High write throughput, time-series storage and downsampling, aggregation (push vs pull), alerting, cardinality |
| 17 | Unique ID generator (Snowflake) | junior–mid | Uniqueness without coordination, time ordering, clock skew, bit layout |
| 18 | Leaderboard / top-K (real-time) | mid | Sorted sets, approximate counting (count-min sketch), windowing, sharded aggregation |
| 19 | Collaborative editor (Google Docs) | senior | OT vs CRDT, real-time sync, cursor presence, versioning |
| 20 | Message queue (Kafka-like) | senior | Log-structured storage, partitions and consumer groups, offsets, replication/ISR, delivery semantics |

Cross-cutting rubric dimensions for SD (these are the competencies the evaluator scores):
- Requirements clarification and scoping
- Back-of-envelope estimation
- API and data model
- High-level architecture
- Deep dive on the bottleneck
- Trade-off articulation (names alternatives and why one was rejected)
- Failure modes and operability
- Communication and structure

### 4b. AI engineer (LLM / ML systems)

| # | Problem | What it really tests |
|---|---|---|
| 1 | Enterprise RAG assistant over private docs | Chunking strategy, embedding choice, hybrid retrieval (BM25 + dense), reranking, permissions/ACL-aware retrieval, citations, freshness/re-indexing, hallucination handling |
| 2 | Evaluation pipeline for an LLM feature | Offline golden sets vs online metrics, LLM-as-judge and its bias/calibration, regression gates in CI, human review sampling, metric choice per task |
| 3 | LLM serving / inference platform at scale | Batching (continuous), KV cache memory, quantization, GPU utilization, autoscaling, streaming tokens, latency (TTFT vs TPOT) vs cost |
| 4 | Multi-tenant LLM gateway | Routing across models/providers, rate limits and quotas per tenant, fallback, caching (exact + semantic), cost attribution, PII redaction |
| 5 | Customer-support agent with tool use | Agent loop design, tool schemas, guardrails, escalation to human, state/memory, evaluation of multi-step tasks, cost/loop limits |
| 6 | Prompt-injection-resistant agent / LLM safety layer | Trust boundaries, input/output filtering, least-privilege tools, indirect injection via retrieved content, red-teaming |
| 7 | Semantic search / recommendation with embeddings | Two-tower retrieval + ranking, ANN index (HNSW/IVF) trade-offs, cold start, feedback loops, A/B testing |
| 8 | Fine-tuning vs RAG vs prompting decision for a domain | Problem framing, data availability, cost, eval-driven decision, LoRA/PEFT, catastrophic forgetting |
| 9 | Document extraction pipeline (invoices / contracts) | Structured output with schema validation, OCR + LLM, confidence and human-in-the-loop, eval on field-level accuracy |
| 10 | Conversational memory / personalization (like Crucible itself) | What to store vs summarize, retrieval of long-term memory, privacy/deletion, drift |
| 11 | Content moderation / classification at scale | Cheap-model cascade, thresholding and precision/recall trade-off, appeals, label drift |
| 12 | LLM observability and monitoring | Tracing, prompt/version management, drift and quality monitoring, cost dashboards, feedback capture |
| 13 | Real-time fraud / risk scoring (classic ML system design) | Feature store (online/offline skew), latency budget, label delay, model retraining, monitoring |
| 14 | Voice agent (STT → LLM → TTS) | Latency budget per stage, barge-in/turn-taking, streaming, failure fallbacks |

Cross-cutting AI rubric dimensions:
- Problem framing and success metric
- Data
- Retrieval/model choice with justification
- **Evaluation plan** (the strongest seniority signal)
- Serving, latency and cost
- Safety and failure modes
- Iteration and monitoring

---

## 5. Rubric and rating-scale practices (structured interviewing research)

Research findings to build on:

- **Structured interviews beat unstructured interviews** for reliability and validity. Levashina, Hartwell, Morgeson & Campion (2014) review this in *Personnel Psychology* 67:241–293, "The Structured Employment Interview: Narrative and Quantitative Review of the Research Literature". The finding is consistent with Campion, Palmer & Campion (1997), which lists 15 structuring components. Sackett et al.'s 2022 meta-analysis ranks structured interviews as the top predictor, with a mean validity of about .42. Huffcutt & Murphy's 2023 commentary in *Industrial and Organizational Psychology* notes the large variability (±.24) in that estimate.
- **BARS (Behaviorally Anchored Rating Scales)** come from Smith & Kendall (1963). Each scale point is anchored to a concrete example of behaviour, not an adjective like "good". The anchors are the part of a rubric that does the work.
- **OPM process (public domain):**
  - Use one proficiency scale for all competencies (3–7 levels, label at least 3).
  - SMEs independently write how a person at each level would answer, then agree on the representative example.
  - Score each competency separately, and weight competencies equally unless a difference is justified.
  - Use pre-planned probes.
  - Pilot-test the questions.
- **re:Work:** use vetted role-relevant questions and written evidence-based feedback. Score with anchors at **poor / borderline / solid / outstanding**. Train interviewers and calibrate them against each other.
- **Tech Interview Handbook rubric:** score the same story differently by *scope* (team vs org impact) to differentiate Junior, Senior and Staff. This maps onto our `difficulty` and level.

How this maps onto our schema (proposed, nothing implemented):

- **One competency per question.** Score sub-criteria (e.g. STAR structure, ownership, specificity, impact) on a shared 1–5 scale. Anchor 1, 3 and 5 with concrete answer descriptions. Interpolate 2 and 4 (OPM says label at least 3 levels).
- The 2/5 vs 5/5 anchor should describe **observable content**, not adjectives. Example for an ownership question:
  - **2/5:** "Describes the team's work with 'we' throughout; cannot state their own decision; result stated without numbers."
  - **5/5:** "States the decision they personally made and the alternative they rejected; quantifies outcome; names what they'd do differently."
- Map **`wouldSurviveRealInterview`** to "would reach at least *solid* after the follow-up ladder". This is the re:Work threshold.
- **Follow-up ladder = OPM pre-planned probes.** Example rungs:
  1. Clarify the candidate's own role.
  2. Ask why this approach and what alternative was considered.
  3. Ask what went wrong or which edge case broke.
  4. Ask what they'd change, or how the solution scales at 10×.

  The rung where the candidate's answer collapses is itself a score signal.
- **Calibration:** score the same answers by several raters and by the Evaluator, then compare agreement. This is re:Work's "calibration" step and OPM's pilot test. Our version: 2–3 engineers blind-score 30–50 synthetic answers.

Sources:
- Levashina et al. 2014, doi:10.1111/peps.12052 ([digitalcommons.usu.edu/manage_facpub/423](https://digitalcommons.usu.edu/manage_facpub/423/))
- Huffcutt & Murphy commentary ([Cambridge](https://resolve.cambridge.org/core/services/aop-cambridge-core/content/view/7CB1F7C86CB0D15328B3F07AD5F964E2/S1754942623000421a.pdf/structured-interviews-moving-beyond-mean-validity.pdf))
- [OPM structured interviews PDF](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/structured-interviews.pdf)
- [OPM rating-scale FAQ](https://www.opm.gov/frequently-asked-questions/assessment-policy-faq/structured-interviews/how-do-i-develop-a-customized-rating-scale-for-structured-interviews/)
- [re:Work guide](https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices)
- [TIH behavioral rubrics](https://github.com/yangshun/tech-interview-handbook/blob/main/apps/website/contents/behavioral-interview-rubrics.md)
- Naim et al. ([arXiv:1504.03425](https://arxiv.org/abs/1504.03425))
- Smith & Kendall 1963 (*J. Applied Psychology* 47:149–155). Not fetched; cited from the literature.
- Campion, Palmer & Campion 1997 (*Personnel Psychology* 50:655–702). Not fetched; cited from the literature.
- Sackett et al. 2022 (*J. Applied Psychology*). Not fetched; the validity figure is as quoted in the Huffcutt & Murphy commentary.

---

## 6. Licensing guidance

(This is not legal advice. When in doubt, write the question yourself.)

**What copyright covers in this context:**
- Short generic questions ("Tell me about a time you disagreed with a teammate", "Design a URL shortener") are ideas or common phrases, not protectable expression. Anyone can write them.
- *Collections, specific wording, rubrics, answers and worked solutions* are protectable.

**What we can copy, with attribution:**
- **MIT:** TIH, alirezadir, syedmharis (Kaggle). Keep the copyright and license notice in `ATTRIBUTION.md`.
- **Apache-2.0:** KalyanKS LLM Hub. Keep the notice and state any changes.
- **CC BY 4.0:** system-design-primer, InterviewBench. Give attribution, link the license, and indicate changes.
- **CC0 / public domain:** the DopplerHQ list, US OPM guidance. Free to use; citing is still polite.

**Use only to inform our own writing (read it, then write fresh text; don't copy wording):**
- **CC BY-SA / GPL / AGPL** (coding-interview-university, reverse-interview, ashishps1, InterviewReady, Ebazhanov). Copying text would force share-alike or copyleft terms onto the bank.
- Google re:Work, Amazon LP pages (no reuse license).

**Never copy, adapt, or train on:**
- CC BY-NC(-ND) (ByteByteGo, karanpratapsingh, RecruitView). These are non-commercial, and some also forbid derivatives.
- Books (Alex Xu, Chip Huyen).
- Repos with no license (khangich, llmgenai, checkcheckzz, Devinterview-io, youssefHosni, chiphuyen/ml-interviews-book).
- Glassdoor, LeetCode, Blind, interviewing.io.
- Request-only research datasets (MIT Interview, First Impressions).

**"Permissive tag over scraped rows" is not a license.** The AI-Mock-Interviewer/*, Shlok307 and ali-alkhars datasets carry Apache/MIT/CC-BY tags, but the rows come from unlicensed or third-party sources. The uploader cannot grant rights they don't hold. Treat them as unknown.

**Practical rules for the bank:**
1. Every `QuestionExemplar` gets two fields:
   - `source`: `"original"`, or a URL.
   - `license`: SPDX id, or `"original"`.

   Default to `"original"`. The model doesn't have these fields yet. Add them when the bank is built.
2. Rubric anchors, ideal-answer points and follow-up ladders are **always original**. That is our value-add, and nothing permissively licensed provides them at the needed quality anyway.
3. Don't name a real company in a question ("Amazon LP question", "Google L5 question"). Use the competency name instead. This avoids trademark issues and implying affiliation.
4. Synthetic eval answers generated by Claude are ours to ship. Mark them `synthetic: true` so they are never mistaken for real candidate data.
