# Sample interview — question bank build (2026-10-27)

A complete, unedited interview from the live end-to-end run on branch `feat/question-bank`:
real UI in a browser, real Planner/Interviewer/Evaluator on Claude Sonnet 4.6 (Bedrock),
ElevenLabs voice on. The **candidate** is simulated by Claude Haiku playing a backend
engineer (4 years, payments, Go/Kafka/Postgres) and is scripted to give one weak answer,
say "I don't know" once and ask "can you repeat that?" once; otherwise it answers what it's
asked. Its turns are labelled with that intent. Marcus's turns show reply latency, stage,
question number and follow-up count.

What to look for:
- Questions come from the curated bank and are asked as written (no added asks); the
  system-design question is the problem only, personalized to the candidate's background.
- When the candidate jumps into the design without scoping, Marcus's first probe asks
  what they'd want to clarify — the signal the question tests.
- "I don't know" gets a narrowing hint, never the answer; "repeat that" is rephrased and
  not counted as a follow-up.
- Follow-ups climb the question's ladder (e.g. idempotency key → Postgres commits but Kafka
  publish fails → how a consumer tells "processed" from "stuck").
- Known slip: one verdict in ~20 interviewer lines ("That's a solid list of clarifying
  questions"). Tracked by the eval's judgment-leak metric.

Session start (intake + planner): 7.5s · reply latency 1.2–2.9s (one 5.6s) ·
finalize 6.5s · 21/21 voice lines synthesized.

---

**Candidate** _(small talk)_: I'm doing great, thanks. How about you?

**Marcus** _(2.3s, background)_: I'm doing well, thanks for asking. So — we've got a mix of questions today, mostly behavioral and system design, pitched at a senior level. Think out loud as you go, and feel free to ask me to clarify anything. To kick things off, can you walk me through your background — kind of how you got here and what you've been working on lately?

**Candidate** _(background)_: Sure — I've been at Brightwell Payments for about four years. Mostly backend in Go and Kafka; the big one was leading our migration off a Java monolith, and I'm primary on-call for checkout.

**Marcus** _(1.8s, question Q1/4 fu0)_: Four years at Brightwell, leading that monolith migration off Java — okay. Let's get into the questions. Tell me about a time you helped a less experienced engineer who was struggling.

**Candidate** _(weak)_: Yeah, so we had a junior on the team who was pretty overwhelmed with some of the Kafka consumer logic when we were doing the migration, and we just sat down together and broke down how the offset management worked and why we needed to think about it differently in our new Go services. Helped them ship their first feature pretty confidently after that.

**Marcus** _(1.2s, question Q1/4 fu1)_: Okay. How did you first notice they were struggling — what tipped you off?

**Candidate** _(strong)_: So we were looking at our payment success rates during a quarterly review, and I noticed they were hovering around 94% when our SLA guaranteed 99.5%, but the weird part was our error logs weren't lighting up in the usual way. I dug into the database metrics and saw massive latency spikes on the checkout queries every evening around 6 PM, which correlated exactly with when transaction volume ramped up. I pulled some slow query logs and realized the old Java monolith was doing N+1 queries for every payment verification, so under load with thousands of concurrent checkouts, Postgres connection pools were getting exhausted within seconds. We actually lost about 2% of revenue per day during peak hours before we migrated to the new Go service that batched those queries, but the tradeoff was we had to rewrite the entire payments engine in four months while keeping the old system running in parallel.

**Marcus** _(2.2s, question Q1/4 fu2)_: That answer's about a different situation — I think the context got mixed up there. I was asking about the junior and the Kafka consumer work. What did you think the real problem was for them — was it the technical concept, or something else going on?

**Candidate** _(strong)_: Oh right, yeah my bad. So the junior had solid fundamentals on consumer groups and offsets, but the real issue was they weren't thinking about failure modes — they'd written a consumer that processed messages, committed offsets, then made an external API call, so if that call failed we'd lose track of which messages we'd actually handled. I paired with them for a few hours and we walked through what happens when the API times out at 30 seconds versus when Kafka rebalances, and suddenly the technical pieces clicked because they saw it wasn't abstract anymore. The tradeoff we landed on was committing offsets after the API succeeded rather than before, which added maybe 200 milliseconds latency per message but gave us exactly-once semantics for the payment events we cared about. I think the deeper problem wasn't Kafka knowledge, it was that they hadn't spent enough time on-call watching things actually break, so failure scenarios felt theoretical.

**Marcus** _(1.8s, question Q1/4 fu3)_: Okay — commit after success, not before. So what did you deliberately hold back from doing for them during that pairing session?

**Candidate** _(strong)_: Yeah so during that payments migration, I deliberately didn't automate the full idempotency key generation on the client side like I wanted to, because we needed to keep backwards compatibility with their existing Java clients for six months. Instead I built it server-side first in Go, which meant we took on extra database load checking for duplicates across maybe two million transactions a day, but it let us migrate their merchants gradually without forcing a coordinated client deploy. The tradeoff was clear — we absorbed the compute cost to buy ourselves time and reduce blast radius, rather than push a breaking change that could've broken checkout for 30,000 merchants all at once.

**Marcus** _(1.4s, question Q2/4 fu0)_: Okay. Let's shift gears — here's a technical one for you. Two withdrawal requests for the same account arrive at the same moment — how would you make sure the balance never goes negative?

**Candidate** _(I don't know)_: Honestly, I don't know.

**Marcus** _(2.0s, question Q2/4 fu1)_: That's okay, let's work through it together. Forget distributed systems for a second — if you just had two requests hitting the same row in a database at the same moment, where exactly does the danger show up?

**Candidate** _(repeat)_: Sorry, can you repeat that?

**Marcus** _(1.8s, question Q2/4 fu1)_: Sure — two requests read the same balance at the same moment, before either one has written anything back. So, where does the danger show up in that sequence?

**Candidate** _(strong)_: Yeah so the danger shows up when both requests then try to deduct from that balance. Let's say the account has 100 dollars, both requests read 100 at the same instant before either write, then they each deduct 50 and write back 50 separately. You end up with 50 in the account instead of 0, so you've lost 50 dollars. I actually debugged this exact scenario during our payments migration when we moved off the monolith to Go services — we had a race condition on wallet debits that only showed up under load testing with concurrent requests. The fix was moving to row-level locks in Postgres with SELECT FOR UPDATE, or using optimistic locking with version numbers so the second write would fail and retry. There's a tradeoff though: row locks are safer but can bottleneck under high concurrency, whereas optimistic locking has lower contention but means you need retry logic and handle more collisions.

**Marcus** _(1.9s, question Q2/4 fu2)_: Okay — SELECT FOR UPDATE or optimistic locking with version numbers, and you've seen this in production. One thing you touched on: why wouldn't a mutex or lock inside your Go service be enough to protect that balance?

**Candidate** _(strong)_: So in a payments system, you can't use just an in-memory mutex because you have multiple Go services running, and if two checkout servers both grab a user's balance at the same time, they'll both read the same stale number and both think they can debit it. We actually hit this during the migration—we had two workers process the same refund simultaneously and almost double-credited a customer. The database-level lock with SELECT FOR UPDATE forces serialization across all your instances, whereas a mutex only works on one box. We went with SELECT FOR UPDATE on the balance row during the migration because we needed a hard guarantee across four checkout replicas, and the tradeoff was that lock contention on high-volume accounts became our bottleneck, so we had to shard customer balances by merchant ID after we hit about 2000 concurrent transactions per second.

**Marcus** _(1.5s, question Q3/4 fu0)_: Got it — sharding by merchant ID to spread lock contention. Okay, let's move to something different. A service's p99 latency spikes only during traffic bursts — how would you find the cause?

**Candidate** _(strong)_: I'd start by looking at what resources saturate first during those bursts. In our checkout service, we hit this exact problem—p99 would spike to two or three seconds when traffic jumped, but average stayed fine. We pulled metrics showing CPU was normal but database connection pool exhaustion was the culprit—we were at 95 connections out of 100 during spikes. So I added structured logging to capture the wait time before acquiring a connection, and we saw tail requests were queuing for 800 milliseconds just to get a slot. We bumped the pool from 100 to 150 and added circuit breaker logic to fail fast if wait time exceeded 200ms, which cut p99 from 2.8 seconds down to 600ms. The tradeoff was using more memory and opening us to cascading failures if the database actually got slow, but we mitigated that by being aggressive about shedding load early rather than letting requests pile up.

**Marcus** _(1.8s, question Q3/4 fu1)_: Connection pool exhaustion, 800ms queue wait — okay. How would you have distinguished that queuing time from the database actually getting slow?

**Candidate** _(strong)_: Good question. We instrumented the connection pool itself to emit metrics on available connections and queue depth, separate from query latency. So we could see that during the incident, we had zero available connections for 10-15 minutes while queries were still executing in 50-60ms. That told us the problem was clients holding connections too long, not the database being slow. We then added connection timeout telemetry and found that checkout requests were keeping connections open through external payment gateway calls, which could hang for 2-3 seconds. The tradeoff was we had to increase pool size from 20 to 35 to handle the spikes, which costs more memory, but the alternative was shipping connection pooling logic to every service which would've taken weeks.

**Marcus** _(1.5s, question Q3/4 fu2)_: Right — queries still fast, pool empty. How would you have reproduced this outside production to confirm the fix before shipping it?

**Candidate** _(strong)_: Yeah, so we actually load tested it with a tool that mimicked our peak checkout traffic patterns, but we were using connection pool defaults that didn't match production. What I did was grab the actual production config — the pool size, timeout settings, everything — and replayed two weeks of real traffic logs against a staging database. We hit the exact same bottleneck where queries were fast at maybe two milliseconds each, but we were getting timeout exceptions because all 50 connections were held by long-running transactions in a different service. The tradeoff was that load testing took an extra four hours to set up properly, but we caught it before it cost us money on Black Friday, and honestly that's when I learned to always diff your environments when something seems weird.

**Marcus** _(1.4s, question Q4/4 fu0)_: Got it — production config in staging, caught the same bottleneck before Black Friday. Okay, let's shift to system design. Design a payments ledger service that serves multiple regional markets.

**Candidate** _(strong)_: So we'd want to partition the ledger by merchant ID and region to avoid global write contention—each region runs its own Postgres instance with the same schema, and we use a coordinator service in Go to route writes to the right region based on merchant location. We built something similar at Brightwell when we migrated off the monolith, and the key was handling cross-region settlements without distributed transactions—we used an event log in Kafka where each region publishes its ledger entries, and a separate settlement service consumes those and batches transfers every hour. The tradeoff is you get eventual consistency on the aggregate view, so if an operator queries total balance across regions they might see a one-hour lag, but writes stay fast and you avoid the throughput cliff you hit with a single global database. We handled about 50k transactions per second that way across four regions during peak.

**Marcus** _(2.0s, question Q4/4 fu1)_: Okay — regional Postgres instances, Kafka event log, hourly settlement batches. Before we go deeper on the design, what would you want to clarify about the requirements before you committed to that architecture?

**Candidate** _(strong)_: Yeah, so a few things jump out. First—are we talking about settlement across multiple currencies and regions, or is each regional instance handling its own currency? That matters because if we have cross-region settlement, we might need a coordinator, and that changes the consistency model entirely. Second, what's the latency requirement on the hourly batches—do merchants need to see their net position in near real-time, or is T plus a few hours acceptable? I ask because we ran into this at Brightwell where finance wanted exact numbers but merchants wanted visibility, and we ended up needing both a streaming view and a batch reconciliation. Third—what happens when a regional Postgres goes down mid-settlement? Do we replay from Kafka, or do we have a backup region? And fourth, how are you handling idempotency on the batch writes themselves, because if a settlement job partially fails and reruns, you can easily double-settle a merchant if you're not careful. Those answers would tell me whether we need something like distributed transactions or if we can get away with event sourcing plus eventual consistency.

**Marcus** _(2.1s, question Q4/4 fu2)_: Right — currency mix, latency SLA, failure modes, idempotency. That's a solid list of clarifying questions. Let's stay on that last one — idempotency on the settlement writes. Walk me through how you'd actually implement that, concretely.

**Candidate** _(strong)_: So at Brightwell we had this exact problem during the monolith migration. We use idempotency keys — the merchant provides a unique ID per settlement batch, and we store that key plus the settlement transaction hash in Postgres before we ever write to Kafka. When a settlement message comes in, we check if that key exists; if it does, we return the cached result instead of reprocessing. The tricky part is the race condition — two requests with the same key hitting at the exact same moment — so we wrap the check-and-insert in a transaction with a unique constraint on the idempotency key column. We also set a TTL on old keys, maybe 90 days, because we can't keep them forever and there's a memory-latency tradeoff there. In practice this cut our duplicate settlement incidents from about eight a week down to basically zero once we had it in place.

**Marcus** _(5.6s, question Q4/4 fu3)_: Okay — unique constraint, check-and-insert in a transaction, ninety-day TTL. You said you write the idempotency key to Postgres before you write to Kafka — what happens if the Postgres commit succeeds but the Kafka publish fails?

**Candidate** _(strong)_: Right, so we actually had that exact scenario during the payments migration. If Postgres commits but Kafka fails, the idempotency key sits in the database marked as pending, and when the retry comes in with the same key, we detect it and return the cached response without re-processing. The tradeoff is we're burning storage on those zombie records, but it's worth it because the alternative is duplicate charges hitting the processor. We actually set up a cleanup job that archives records after ninety days anyway, so those failed publishes get swept up then. The real risk is if Kafka stays down for longer than our retry window, but we page on-call if publish latency spikes, so we catch that within minutes.

**Marcus** _(2.5s, question Q4/4 fu4)_: Okay — pending key, retry detects it, cleanup job sweeps it later. So you've got a record marked pending in Postgres that never actually produced a Kafka message. How does a downstream consumer know whether that settlement was successfully processed or just stuck?

**Candidate** _(strong)_: Yeah, that's the core issue we hit during the monolith migration. We actually added a status field that tracks not just pending, but pending-with-ack, so the consumer sends back a confirmation message once it reads from Kafka and writes to the ledger. The cleanup job only sweeps records that are pending-with-ack and older than four hours, which gave us a safe window. The tradeoff is we added latency—we can't immediately know if something succeeded, we have to wait for that round-trip—but we avoided the nightmare of duplicate settlements or lost ones entirely. In production we caught maybe two or three records a week that never acked, which we'd surface to ops to investigate manually rather than auto-retry blind.

**Marcus** _(1.8s, closing)_: Okay — status field, pending-with-ack, manual escalation for the unresolved ones. That's everything I wanted to cover. What questions do you have for me?

**Candidate** _(my question)_: What does on-call look like for this team?

**Marcus** _(2.9s, closing)_: On-call here is tied directly to service ownership — if your team ships it, you're rotating on it. From what I know of this role, payments is a high-availability environment, so you'd expect pages at odd hours, though there's a real investment in runbooks and reducing alert fatigue. Escalation paths exist, but the expectation is that engineers can triage and mitigate independently before looping in others. Anything else you want to ask?

**Candidate** _(goodbye)_: No, that's all from me. Thanks!

**Marcus** _(1.6s, closing)_: Thanks, Karthik. I'll write up my feedback — you'll see it on the next screen. Take care.
