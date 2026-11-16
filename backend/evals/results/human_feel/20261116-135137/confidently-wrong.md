# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Doing great, thanks for having me, Marcus. I've been looking forward to this. The team's work on the backend services is exactly the kind of thing I want to be doing, so I'm pumped to dig in.


### background

**Marcus:** Good to hear, glad you're excited about it. So, we'll be going through some technical questions today, junior level, and I'll dig in where I'm curious. Think out loud as you go, and feel free to ask me to clarify anything. To get us started, just walk me through your background briefly, what you've been working on, what brought you here.

**Brandon:** Sure, so I just finished my B.S. in Computer Engineering at Purdue this past spring. Most of my hands-on stuff has been on the software side. The project I'm proudest of is a Discord bot I wrote in Python. It handles moderation commands and some custom reminders, and it's been running for a while with a pretty active server using it. I also built my own portfolio site to show that work off.

I'm a fast learner, so when I hit something new I usually pick it up pretty quick. What brought me here is that I want to work on backend services at a real scale, where the code I write actually matters to a lot of users. Your team's posting lines up with that, so I figured I'd apply.


### q1

**Marcus:** Discord bot in production, okay. Let's get into the technical side. What happens when you type a URL into a browser and press enter?

**Brandon:** Sure. So the browser first parses the URL and figures out the protocol, host, and path. Then it checks its cache, and if it doesn't have a fresh copy it does a DNS lookup to turn the hostname into an IP address. Once it has the IP, it opens a TCP connection to the server, which is a three-way handshake, and then for HTTPS it does a TLS handshake on top of that. After that the browser sends the HTTP GET request, the server processes it and sends back a response, and the browser parses the HTML, fetches things like CSS and JavaScript, and renders the page.

The one part I'd want to be a bit careful about is the DNS step, since there are a few layers of caching involved, from the OS resolver up through the ISP. But that's the general flow.

**Marcus:** Okay. You mentioned a load balancer or CDN might sit in the middle, what actually lives between the browser and the application server in a typical setup?

**Brandon:** Yeah, so usually there's a load balancer in front of the app servers. It spreads incoming requests across a pool of instances, and it can do health checks so it stops sending traffic to a box that's down. Depending on the setup, a CDN might sit in front of that for static assets, and there's often a reverse proxy like Nginx or a managed one like an ALB doing TLS termination, so the app servers aren't dealing with certificates directly.

I'd say the big thing is the load balancer, because that's what lets you scale horizontally without the client caring which server it hits. Honestly, for a lot of smaller services you'd also find a plain Nginx box doing the proxying and routing before the request ever reaches the app.


### q2

**Marcus:** Got it. Okay, let's move to something closer to the day-to-day. A page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Yeah, so my first move would be to find out which query is actually slow instead of guessing. I'd turn on slow query logging or check whatever APM the service uses, and then run EXPLAIN on the suspect query to see whether it's doing a full table scan or something else dumb. If it's scanning a big table on a column used in the WHERE clause, the usual fix is an index on that column.

Hash indexes are great for that, by the way, since a hash map lookup is O(log n) because the keys get sorted under the hood, so it's really fast even on big tables. Once the index is in, I'd re-run EXPLAIN and compare timings, and I'd check that the query isn't pulling way more columns or rows than the page needs. If it's an N+1 thing where the app fires a query per row, I'd batch it into a join or a single IN query.

**Marcus:** Okay. You mentioned hash indexes being fast, what kind of index does most relational databases actually use by default?

**Brandon:** Yeah, B-tree. That's the default in basically every relational database, Postgres, MySQL InnoDB, all of them. It keeps the keys sorted, which is why it works for range queries and ORDER BY, not just equality lookups. Hash indexes are more of a niche thing, and I think they're what I was thinking of with the sorting part, so I guess that's on me. Anyway, B-tree is the one you'll see almost everywhere.

**Marcus:** Right. So you mentioned batching N+1 queries into a join or an IN query, once you've made that change, how would you confirm it actually helped?

**Brandon:** Yeah, so the first thing I'd check is query count. Before, you'd see one query for the list and then one per row, and after the change it should be down to one or two. I'd pull that from the request logs or the ORM's debug output, or just count the statements on that endpoint in the APM trace.

Then I'd compare latency on the same data, p95 or p99 rather than the average, since N+1 problems usually show up in the tail. I'd also run EXPLAIN on the new query to make sure the IN list is hitting an index. IN queries are honestly always faster than joins, because the lookup goes through the hash index on the key, so I wouldn't worry much about the plan there.

And I'd diff the results of the old and new code on a sample set of inputs to make sure the output's the same. A LEFT JOIN drops rows with no match, so that's the one I'd be paranoid about.

**Marcus:** Right. You said IN queries are always faster than joins, what happens when that IN list has, say, ten thousand IDs in it?

**Brandon:** Yeah, okay, so I was too quick with "always." An IN list with ten thousand IDs is a different situation. The parser and planner have to deal with a big list, and depending on the database you can hit limits on query size or parameter count, especially with ORMs that bind each value separately. Then the planner might just do a scan anyway if it decides that's cheaper, so it's not guaranteed to use the index.

I'd still stand by the general point that IN is fine for a modest list, because the index lookups are cheap. But for something that big I'd probably batch it into chunks of a few hundred, or switch to a join against a temp table or a VALUES list, and then check EXPLAIN to see what the planner actually does. I'd want to measure it rather than assume.


### q3

**Marcus:** Okay, let's switch gears. When would you use REST, gRPC, or GraphQL for an API?

**Brandon:** Sure. REST is my default for most public-facing or simple CRUD-style services, because it's easy to reason about, it caches well over plain HTTP, and pretty much every client and tool understands it. I'd reach for gRPC for service-to-service calls inside the backend, especially when latency and payload size matter, since it's binary over HTTP/2 and gives you strongly typed contracts through protobuf. GraphQL makes sense when you've got a lot of different clients, like a web app and a mobile app, that need different slices of the same data, so they're not stuck with whatever fixed endpoints the server exposes.

The tradeoff I'd keep in mind with GraphQL is that it makes HTTP caching harder, since everything goes through one endpoint, and it can open you up to expensive nested queries if you don't put limits on them. And honestly, for a new grad-sized service I'd probably start with REST unless there was a clear reason not to.

**Marcus:** Okay. How would you handle changing a field, say, renaming it or removing it, without breaking clients that are already using it?

**Brandon:** Yeah, so I'd treat it as a backwards compatibility problem. For a rename, the safe way is to add the new field alongside the old one first, so the API returns both. Then you give clients time to migrate, and you can track usage to see when the old field is no longer being read. Once nobody's using it, you remove it in a later release.

For REST that usually means versioning or just being careful about what you remove. For a removal, you'd deprecate it first, document it, and maybe log a warning when it's accessed. You'd never just delete it in the same release. With protobuf, the rule is to never reuse field numbers, and you mark removed fields as reserved so nobody accidentally recycles them later.

I think the general principle is additive changes are safe and destructive changes need a deprecation window. Honestly I'd want to check what the team already does for API versioning, since they probably have a convention I should follow.


### q4

**Marcus:** Got it. Okay, let's talk about testing. You mentioned your Discord bot fetches data from an external API. How would you write a unit test for a Python function that does that fetching and formatting?

**Brandon:** Yeah, so for a function like that I'd want to keep the test away from the real network. The point of a unit test is checking the formatting logic, not whether the external API is up. So I'd mock the HTTP call, probably with unittest.mock.patch on requests.get, or use responses or requests-mock if the project already has one. Then I'd hand it a canned JSON payload, call the function, and assert on the formatted output.

I'd make sure to cover a few cases, not just the happy path. Like an empty result, a missing field in the payload, and what happens when the API returns a 500 or times out. Those are usually where the bugs hide. I'd also use pytest parametrize if there are a bunch of similar input shapes, so it stays readable.

One thing I'd be careful about is not over-mocking. If you mock the formatting helpers too, the test ends up checking the mocks instead of the code. So I'd keep the mock at the network boundary and let the actual formatting run.

**Marcus:** Okay. You mentioned covering the case where the API returns a 500 or times out, how would you actually simulate that in the test?

**Brandon:** Yeah, so with the mock approach it's pretty straightforward. For a 500, I'd set the mock's return value to a response object with status_code set to 500, and then the function's error handling kicks in. If the code calls raise_for_status(), I'd set side_effect to raise requests.HTTPError instead, so the test follows whatever path the real code takes.

For a timeout, I'd set side_effect on the mock to raise requests.exceptions.Timeout. That way the test doesn't actually wait on a network call, it just simulates the exception being thrown. Then I'd assert that the function either returns a sensible fallback or raises the right exception, whatever the contract is.

I'd also make sure the test checks the call itself, like that a timeout argument was passed to requests.get, because a call with no timeout would hang forever in production. That's the kind of thing that's easy to miss if you only test the happy path.

**Marcus:** Right. You mentioned checking that a timeout argument was actually passed to requests.get, how would you write that assertion specifically?

**Brandon:** Yeah, so once the mock is in place, the mock object records how it was called, so you can just assert on that. Something like mock_get.assert_called_once_with(url, timeout=5) if you know the exact URL and the timeout value you want. But I'd usually be a little looser than that, since you don't want the test to break every time someone changes the URL format. So I'd grab the call args and check the keyword directly: mock_get.call_args.kwargs["timeout"] is not None, or assert it's less than some ceiling.

I'd also say the assert_called_with checks are only as good as the code you're testing, so I'd want the test to fail if someone removes the timeout argument. Honestly I'd probably check that first before I wrote anything else, since it's a one-liner and it catches a nasty production bug.


### closing

**Marcus:** Got it. That's everything I wanted to cover, so, what questions do you have for me?

**Brandon:** Yeah, I do have one. How does the team usually handle on-call for the new grads? Like, is there a shadowing period before you're taking pages on your own, or do you get thrown in after the six months? That's the part I'm most curious about. Otherwise I think I'm all set, thanks for the time, Marcus.

**Marcus:** Good question. The JD says on-call starts around six months in, and from what I've seen on teams like this one, there's usually a ramp, you'd shadow someone experienced for a rotation or two before you're the primary. The expectation isn't that you're flying solo on day one of on-call. Anything else you want to ask?

**Brandon:** Nope, that answers it for me. Thanks, Marcus, I appreciate you walking me through all that. I'm all set on my end.

**Marcus:** Thanks, Brandon. I'll write up my feedback, you'll see it on the next screen. Take care.
