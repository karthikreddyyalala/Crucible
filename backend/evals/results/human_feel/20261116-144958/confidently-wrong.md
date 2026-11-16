# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Hey Marcus, thanks for having me. I'm doing great, a little caffeinated, honestly. I've been looking forward to this one. Purdue's been good prep, and I've been building stuff on the side pretty much nonstop, so I'm excited to talk about the role.


### background

**Marcus:** Ha, a little caffeine never hurts. I'm doing well, thanks for asking. So today we'll go through some technical questions, backend concepts, maybe some design thinking, at a junior level, so think out loud as you go, and feel free to ask me to clarify anything. Okay, to get started, just walk me through your background briefly: where you've been, what you've built, that kind of thing.

**Brandon:** Sure. I'm a Computer Engineering grad from Purdue, class of 2026. Most of my coding has been outside of class, honestly. The big one is a Discord bot I wrote in Python. It handles moderation commands, pulls data from a couple of external APIs, and stores user stats in a database, so I got to deal with the whole thing end to end, from parsing commands to keeping the bot from falling over under load. I also built my own portfolio site, which was mostly a way to practice front-end basics and deployment. Classwork gave me the fundamentals, like data structures and some embedded stuff, but the projects are where I really learned to ship things. I pick up new tools pretty quickly, so I'm excited to get into backend work at a real team.


### q1

**Marcus:** Discord bot end to end, okay. Let's get into the technical side. What happens when you type a URL into a browser and press enter?

**Brandon:** Okay, so the browser first checks its cache, and if it doesn't have the address it does a DNS lookup to turn the domain into an IP. Then it opens a TCP connection to that IP, usually on port 443, and does a TLS handshake so the connection is encrypted. After that it sends an HTTP GET request, the server sends back a response, and the browser renders the HTML. It also pulls in CSS, JS, and images as it goes. I think that's the core of it, though I'm a little fuzzy on exactly where the TLS handshake fits relative to the TCP part.

**Marcus:** Got it. You mentioned port 443, is that always the port a browser connects to, or is that specific to a certain kind of URL?

**Brandon:** Yeah, pretty much. 443 is the default for HTTPS, and basically every site people actually use is HTTPS now, so I'd say it's the one you'll see almost always. If the URL is plain http, it goes to port 80 instead. And if someone puts a port number right in the URL, like localhost:8080, the browser uses that one. So the scheme sets the default, but an explicit port overrides it.

**Marcus:** Right. What actually sits between the browser and the application server handling that request?

**Brandon:** Hmm, good question. Between the browser and the app server you've usually got a load balancer, and probably a reverse proxy like nginx sitting in front of the app. The load balancer spreads traffic across servers, and the proxy handles things like TLS termination, serving static files, and maybe caching. So the request hits the load balancer first, then the proxy, then gets forwarded to the actual app process. Oh, and there's usually a CDN in there too for static assets, though for a plain API request it mostly doesn't matter.


### q2

**Marcus:** Okay. Let's switch gears, what can go wrong when several threads increment the same counter without any locking?

**Brandon:** Okay, so if a bunch of threads are all doing counter++ with no lock, you get a race condition. Basically the increment isn't atomic, it's a read, an add, and a write, so two threads can read the same value, both add one, and both write back the same result. Now you've lost an update. Do that enough times and the final count is way lower than it should be. And it's not even consistent, so it'll look fine in testing sometimes and then break in prod. Honestly in Python the GIL means it's basically safe anyway, so it's mostly a problem in Java or C++ where threads really run in parallel.

**Marcus:** Okay. On the Python GIL point, walk me through what the GIL actually protects you from there, and whether counter++ can still interleave between bytecode operations.

**Brandon:** Yeah, so the GIL means only one thread runs Python bytecode at a time, so it's basically protecting the interpreter's internal state, and that makes the counter safe. I'm pretty sure a plain counter++ in Python is atomic because of that. There's no real interleaving at that level, the GIL just handles it.

**Marcus:** Right. What does that mean for whether the increment is actually safe?

**Brandon:** Well, I'd say it's safe, since the GIL only lets one thread run at a time, so nothing can cut in halfway through the increment. The GIL is doing the locking for you. That's why I said it's mostly a Java and C++ problem. Python just doesn't really have that issue in practice.

**Marcus:** The GIL actually doesn't make counter++ atomic in Python. It's still multiple bytecode instructions, a load, an increment, a store, and the GIL can release between them. So you can get the same lost update you described for Java. What would you use to actually fix this in Python?

**Brandon:** Hmm, I don't think that's right, though. The GIL switches threads at the interpreter level, and I'm pretty sure a simple increment doesn't get split like that. Plus I've never really seen this bite anyone in Python in practice. But if you're saying it can happen, I guess a lock would do it. Like a threading.Lock around the increment, so only one thread touches the counter at a time. That's the standard fix, right?


### q3

**Marcus:** Okay, a threading.Lock is the right call. Let's move on. A page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Yeah, I'd start by finding the slow query before changing anything. Most databases have a slow query log, or I'd pull the query plan with EXPLAIN and see what it's actually doing. If it's doing a full table scan on something big, the usual fix is an index on the columns in the WHERE or JOIN clause. I'd also check if it's pulling way more columns or rows than the page needs, or if it's running once per item in a loop, which is an N+1 pattern. Those are usually the big wins. Caching helps too, but I'd treat that as a last resort because then you've got invalidation to deal with, and that's where things get messy. Honestly, indexes fix most of these in my experience, so that's where I'd look first.

**Marcus:** Okay. What specifically would you look for in it to decide what to do next?

**Brandon:** Yeah, so in the EXPLAIN output I'd look at whether it's doing a sequential scan on a big table, and whether the row estimates are way off from what actually comes back. If the planner thinks it's going to get a handful of rows but it's really getting thousands, that's a sign the stats are stale or the query's joining in a weird way. I'd also check for sort or hash steps that spill to disk, and whether the same table is getting hit over and over in a loop. Once I see which of those it is, I'd know whether it's an index, a query rewrite, or just fetching too much. I'm pretty sure a full scan almost always means you need an index, so I'd probably go straight there.

**Marcus:** Right. One thing on that, a full scan doesn't always mean you need an index. Sometimes the planner chooses a scan because it's returning most of the rows anyway, and an index would actually be slower. So, if you did decide to add an index, how would you pick which column or columns to put it on, and in what order?

**Brandon:** Yeah, that makes sense, I was too quick to say full scan means index. If it's returning most of the rows anyway, a sequential scan is cheaper. So I'd check the selectivity first, how many rows the filter actually cuts down to.

For picking the columns, I'd look at the WHERE and JOIN conditions. Columns that are used with equality checks go first in a composite index, and then the range or sort columns after that. So if the query filters on user_id equal to something and then orders by created_at, I'd probably do an index on user_id and created_at in that order. I'd also make sure the index actually covers what the query needs, so the database doesn't have to go back to the table for every row. And I'd verify it after with EXPLAIN again, because I'm pretty sure the planner will just use the index if it's there, so you can see the difference right away.

**Marcus:** Right. One thing there, the planner doesn't automatically use an index just because it exists. It picks based on cost estimates, so a new index might still get skipped. But setting that aside, what does adding an index actually cost you?

**Brandon:** Yeah, that's fair, I kind of glossed over that. Okay, so the main cost is on writes. Every insert, update, or delete on that table has to update the index too, so you're doing extra work every time. That slows down writes a bit, and it also takes up disk space, sometimes a lot if the table is big or the index covers several columns. And with more indexes, the optimizer has more to consider, and the maintenance and stats updates take a little more time. I'd say for a read-heavy table it's usually a worthwhile trade, but on something that gets hammered with writes you'd want to be more careful about how many you add.


### q4

**Marcus:** Got it. Okay, let's switch gears. How would you find the ten most frequent search queries from a day of query logs?

**Brandon:** Sure, so with a day of logs I'd probably just load everything into a hash map, count each query string, then sort the counts and take the top ten. Hash map lookups are O(log n) since the keys are kept in order under the hood, so counting is fast. Then sorting the whole thing is O(n log n), which is fine for a day of logs. If the file's too big for memory, I'd split it up by hash and count each chunk separately, but honestly for most logs a single dictionary is plenty.

**Marcus:** Okay. What's the overall complexity of your approach?

**Brandon:** Hmm, so it's O(n log n) overall, right? Counting is O(n) and then the sort is O(n log n), and the sort dominates, so that's the total. Well, I said hash lookups are O(log n) earlier, which I guess muddies it a bit, but the sort is the expensive part either way. Anyway, it's fine for a day of logs.

**Marcus:** Right, is there a way to do that part cheaper?

**Brandon:** Yeah, actually, there is. Instead of sorting the whole dictionary, I could use a heap of size ten. Walk through the counts and push into a min-heap, and if it gets bigger than ten, pop the smallest. That's O(n log k) where k is ten, so it's basically linear for this. Python has heapq.nlargest for that, which is what I'd probably reach for.

And hold on, I want to double check my earlier thing. Hash map lookups being O(log n) because the keys are sorted... I think that's right, a hash map keeps things in order under the hood, so yeah, that's why lookups are fast. Anyway, the heap approach is the cheaper one.

**Marcus:** Right, what's actually happening when you do a lookup in a hash map?

**Brandon:** Hmm, so it hashes the key to get an index into an array of buckets, then goes straight to that bucket and checks the entry. That's why it's fast. I'm still pretty sure there's some ordering going on under the hood, though, since that's the part that makes it O(log n) in my head. I know that sounds like I'm contradicting myself, but I think the hash just tells you roughly where to look in a sorted structure.


### closing

**Marcus:** Right, so a hash table hashes the key to get a bucket index and jumps straight there, which is O(1) on average. There's no sorted structure underneath; that's a different thing called a balanced BST, like a tree map. Anyway, that's everything I wanted to cover. What questions do you have for me?

**Brandon:** Yeah, I have one. How big is the team right now, and is most of the backend work Python or Java? I saw the posting mention both, and I'm curious which one I'd be in day to day. That's it for me, I think I'm all set.

**Marcus:** Good question. Honestly, the split varies by team, but from what I know of this role, Python tends to be the more common day-to-day language, though you'd likely touch both at some point. As for team size, I can't give you a precise number right now, but it's a small enough group that you'd be close to the work from day one. Okay, Brandon, thanks for coming in today. I'll write up my feedback, and you'll see it on the next screen. Take care.
