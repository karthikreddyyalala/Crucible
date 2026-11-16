# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Hey Marcus, thanks for having me. I'm doing great, a little caffeinated, honestly. I've been looking forward to this one since the recruiter reached out. Purdue keeps me busy, but I like being pushed on real problems, so I'm ready to go whenever you are.


### background

**Marcus:** Ha, a little caffeine never hurts. I'm doing well, thanks for asking. So today we'll go through some technical questions, backend concepts, maybe some design thinking, at a junior level, and I'll dig in where I'm curious, so just think out loud as you go. It's totally fine to ask me to clarify anything. To start, why don't you walk me through your background, what you've been working on, what you're most comfortable with.

**Brandon:** Sure. I just finished my B.S. in Computer Engineering at Purdue this past spring. Most of my hands-on work has been in Python. The project I'm proudest of is a Discord bot I built, it handles commands, keeps some state, and I've had people actually use it, so I've dealt with the messy parts like rate limits and users doing things you didn't expect. I also put together my portfolio site from scratch. Honestly I'm most comfortable in Python, I'm pretty quick at picking up new stuff, and I like backend work more than frontend. I haven't worked on a big production codebase or real SQL databases at scale yet, but I'm a fast learner and I'd be ramping up on those quickly.


### q1

**Marcus:** The Discord bot work, okay. Let's get into the technical side. What happens when you type a URL into a browser and press enter?

**Brandon:** Okay, so the browser first checks its cache for the domain, and if it's not there it asks DNS to resolve the hostname to an IP. Then it opens a TCP connection to that IP on port 443, which is really just a three-way handshake, and then it does the TLS handshake on top of that. Once that's set up, the browser sends an HTTP GET request, the server responds with HTML, and the browser parses it, fetches the CSS and JS and images, and renders the page. Oh, and the DNS lookup is basically instant because it's a single UDP packet, so that part's never really the bottleneck.

**Marcus:** Got it. So you mentioned the DNS lookup is basically instant, what actually happens if the browser's cache doesn't have it and the OS cache doesn't either?

**Brandon:** Yeah, so it goes to the configured recursive resolver, usually whatever the ISP or the router hands out, or something like 8.8.8.8 if someone set it manually. That resolver checks its own cache, and if it misses, it walks the hierarchy: root servers point it to the .com servers, and those point it to the authoritative nameserver for the domain, which gives the actual IP. It's one UDP packet each way, so even with a few hops I'd still say it's pretty fast. I mean, I stand by that, a single lookup is basically a packet round trip.

**Marcus:** Right. So you've got the DNS walk covered. What sits between the browser and the actual application server once that connection is open?

**Brandon:** Uh, yeah, so once the TCP and TLS stuff is done, the request basically goes straight to the application server. There might be a load balancer in front, but really the server is just listening on the port and handling the request directly. I think in most setups it's pretty much just the app process itself, maybe with a reverse proxy like nginx if you want to get fancy, but that's mostly for serving static files. Python web apps usually run on something like Flask or Django, so the request hits that and it returns the response.


### q2

**Marcus:** Okay. Let's switch to something more practical, a page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Yeah, so first I'd figure out which query is actually slow. I'd probably turn on slow query logging, or just look at the query in the ORM output, and run EXPLAIN on it to see if it's doing a full table scan. If it is, the usual fix is adding an index on the columns in the WHERE or JOIN clause. Indexes are basically hash maps under the hood, so a lookup on an indexed column is O(1), which is why adding one usually makes things way faster. I'd also check if the query is pulling back more columns or rows than the page needs, and maybe add pagination. Honestly, I haven't done this on a big production database yet, but I'd want to measure before and after so I know the change actually helped.

**Marcus:** Okay. You mentioned running EXPLAIN to spot a full table scan, what specifically would you look for in that output to decide whether an index would actually help?

**Brandon:** So I'd look for "Seq Scan" on the big table, especially if it's got a Filter line with the WHERE condition and the row estimate is high. That means it's reading every row to find a handful. If the filter is pretty selective, meaning it only matches a small slice of the table, an index on that column should cut it down a lot. I'd also look at the cost numbers, the total cost at the top node. If that's huge, that's where I'd focus. And if it's already doing an Index Scan, then the index is there and the problem is somewhere else, probably how many rows come back.

**Marcus:** Right. So say you decide an index would help, how would you pick which columns to include?

**Brandon:** Yeah, so I'd start with the columns in the WHERE clause that filter the most rows, the ones that are most selective. If the query filters on user_id and then status, I'd probably put user_id first since it narrows things down more. If there's an ORDER BY on something, I'd think about including that too so the database doesn't have to sort afterward. And I'd keep it to just the columns the query actually needs, because every index slows down writes and takes up space. I'd also check whether an existing index already covers most of it before adding a new one.


### q3

**Marcus:** Got it. Okay, let's shift gears, what can go wrong when several threads increment the same counter without any locking?

**Brandon:** Yeah, so that's a race condition. Counter increment looks like one step but it's really read, add one, write back, and if two threads read the same value before either writes, you lose an update. Like if it's at 5 and both read 5, both write 6, and you end up at 6 instead of 7. Python makes it a bit weirder because of the GIL, so it's less likely to show up in simple cases, but I wouldn't rely on that. The fix is a lock around the increment, or if it's a shared counter across processes, something atomic like Redis INCR or a database UPDATE that does the increment in one statement. I'm pretty sure a lock is always the fastest option for this though, since it's just a quick mutex check.

**Marcus:** Okay. You mentioned a lock is the fastest option, what does that fix actually cost when you've got, say, sixty-four threads all hitting that counter?

**Brandon:** Yeah, so with sixty-four threads all fighting over one lock, you get contention. Each thread that can't get the lock has to wait, and the lock itself becomes a serialization point, so you're basically running the increments one at a time. Throughput doesn't scale with thread count, it can actually get worse because of all the context switching and the cache line bouncing between cores. But honestly for a simple counter the critical section is so short that it's still pretty quick in practice. I'd still say the mutex is the fastest option, I mean, it's just a quick check, so the overhead is basically nothing unless you're doing something heavy inside the lock.

**Marcus:** Right. So you're saying the overhead is basically nothing, how would you write a test that actually catches the race in the first place?

**Brandon:** Yeah, so I'd write a test that spins up a bunch of threads, like sixty-four or so, and each one calls the increment a few thousand times. Then at the end you assert the counter equals threads times iterations. If the race is there, you'd see the total come up short. The problem is it's not always going to fail on every run, since the GIL and the timing make it kind of flaky, so I'd run it a few times in a loop to make sure it reliably catches it. I'd also probably use a threading.Barrier so all the threads start at the same moment, that way they're really competing instead of running one after another. I think that's a pretty solid way to catch it.


### q4

**Marcus:** Got it. Okay, let's shift to API design, how would you design pagination for an API endpoint that lists a user's orders?

**Brandon:** Sure. I'd probably go with offset pagination, something like ?page=2&per_page=20, since it's the simplest to build and easy for clients to understand. The server does a LIMIT and OFFSET on the orders query, filtered by user_id, and returns the items along with a total count so the client knows how many pages there are. I'd cap per_page at something like 100 so nobody can ask for ten thousand rows at once. Honestly offset is fine for most cases. Cursor-based would only be worth it if the list is huge, but for a user's orders it's probably not going to matter.

**Marcus:** Okay. What happens if a new order arrives while the user is in the middle of paging through their list?

**Brandon:** Hmm, yeah, good question. So with offset pagination, new orders get inserted at the top if you're sorting by newest first, which shifts everything down. So if I'm on page two and a new order comes in, the row that was last on page one gets pushed onto page two, and I'd see it twice. Or if an order gets deleted, something could get skipped entirely. It's not a huge deal for a user's order history, honestly, but I guess that's the real tradeoff. Cursor-based would fix that since you're anchoring on the last item you saw instead of a row number. I'd still probably keep offset for something simple, though.

**Marcus:** Right. So you mentioned cursor-based anchors on the last item you saw, what would that cursor actually contain?

**Brandon:** Yeah, so the cursor would basically be an opaque token that encodes the sort key of the last item on the page. If you're sorting by created_at descending and then id as a tiebreaker, the cursor would carry those two values for the last order. The next request does a WHERE clause like created_at less than that timestamp, or equal with a smaller id, then LIMIT the page size. I'd base64 encode it so clients don't start depending on the format. That's pretty much it, it's a simple idea once you see it.

**Marcus:** Got it. One more thing, what index does that query actually need to run efficiently?

**Brandon:** Uh, yeah, so for that query I'd want an index on user_id plus created_at and id, in that order, so it's a composite index. The user_id goes first because it's the equality filter, then created_at descending and id, so the database can seek straight to the right spot and read the rows already in order without a sort. I think that's the right shape. Honestly I'd just double check it with EXPLAIN once I had it in place.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Brandon:** Yeah, I've got one. What does the on-call rotation look like for a new grad? Like, do I get paired with someone for the first few shifts, or is it pretty much solo from the start? That's the part I'm most curious about. Otherwise I think I'm all set, thanks Marcus, this was a good conversation.

**Marcus:** Yeah, that's a fair thing to ask about. From what I know of how these rotations typically work at this level, new engineers usually aren't thrown in solo right away, there's generally a shadowing period or a pairing arrangement for the first few shifts, and you'd have an escalation path so you're not the last line of defense on day one. The JD does say on-call starts after six months, so you'd have some runway to get comfortable with the codebase first. Anything else you want to ask?

**Brandon:** Yeah, that makes sense, thanks. I think I'm all set. Appreciate you walking me through everything today, Marcus. It was a good conversation and I'd really like to be part of the team.

**Marcus:** Thanks, Brandon. I'll write up my feedback, you'll see it on the next screen. Take care.
