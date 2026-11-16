# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Hey Marcus, thanks for having me. I'm doing great, a little caffeinated, honestly. I've been looking forward to this one. The job description lined up really well with what I've been building, so I'm excited to talk through it.


### background

**Marcus:** Ha, a little caffeine never hurts. I'm doing well, thanks for asking. So today we'll go through some technical questions, backend concepts, maybe a bit of design, at a junior level. Think out loud as you go, and feel free to ask me to clarify anything. Okay, to get started, can you walk me through your background briefly?

**Brandon:** Sure. I'm finishing my B.S. in Computer Engineering at Purdue, graduating in 2026. Most of my hands-on work has been in Python. The project I'm proudest of is a Discord bot I built that handles commands and keeps some state, and I also put together my own portfolio site. I'd call myself a fast learner, so when I hit something new I usually pick it up quickly by building with it. I'm really keen to get into backend work, since that's where I want to spend most of my time.


### q1

**Marcus:** Discord bot, nice. Okay, let's get into the technical side. What can go wrong when several threads increment the same counter without any locking?

**Brandon:** Yeah, so, race condition, right? If two threads read the counter at the same time, they both see the same value, both add one, and you end up one short. Honestly the bigger issue is that in Python the GIL means that can't really happen, so the counter's basically safe as long as it's pure Python. I'd still just use a lock to be clean about it.

**Marcus:** Right. Does it make a counter increment atomic?

**Brandon:** Yeah, the GIL makes it atomic. One thread can't get interrupted halfway through a `+= 1`, so you don't need the lock for that. That's basically why Python counters are fine without it.

**Marcus:** Actually, `+= 1` is a few bytecode steps, load, add, store, and the GIL can release between them. So what does that mean for your counter if two threads interleave on those steps?

**Brandon:** Hmm, I mean, I still think the GIL covers it. Threads take turns on the interpreter, so even if the switch happens in the middle, it's not going to matter for a simple counter. Maybe the lost update only shows up in really heavy code. Either way, for what I'd be writing, I don't think it's a real concern.

**Marcus:** Right, but I already pointed out that `+= 1` is load, add, store, three separate bytecode steps. If the GIL releases after the load but before the store, two threads can both have the old value in hand. So why would the final count still be correct?

**Brandon:** Okay, I hear you, but I still don't think that's a big deal. The switch interval in CPython is pretty short, so the chances of two threads landing on that exact window are tiny. For a counter in a bot, you'd almost never see it. And honestly, if it did drop a count now and then, it's not like anyone's going to notice a few missing increments. I'd still use a lock, but I don't think this is the kind of thing that breaks in practice.


### q2

**Marcus:** Right, the risk is real regardless of how short the window is, and under load those interleavings happen reliably. Anyway, let's move on. What happens when you type a URL into a browser and press enter?

**Brandon:** Oh, that one I've actually read about. Okay, so first the browser checks its cache, then it does a DNS lookup to turn the domain into an IP address. Then it opens a TCP connection to that IP, and for HTTPS there's a TLS handshake on top of that. After that the browser sends the HTTP GET request, the server responds, and the browser parses the HTML and loads the other resources, like CSS and JavaScript, to render the page.

I think the part people usually get wrong is the DNS step. Honestly I'd say DNS is basically one lookup to a single central server that knows every domain, so it's pretty quick. Want me to go deeper on any of those pieces?

**Marcus:** Got it. You mentioned DNS, walk me through what actually happens during that lookup, step by step.

**Brandon:** Sure. So the browser first checks its own DNS cache, and then the OS resolver cache, and if neither has it, the request goes to a recursive resolver, usually the one from my ISP or something like 8.8.8.8. That resolver is the one that does the actual work. It asks one of the root servers, which doesn't know the answer for the domain but points it to the .com servers. Then it asks the .com TLD server, which points to the authoritative name server for the domain, and that server gives back the IP. Honestly, I'd say the whole thing is basically one big hop to a central server, though. The root and TLD stuff is just a rough picture, the main lookup is still pretty much a single query.

**Marcus:** Right, but you just walked me through root servers, TLD servers, and the authoritative nameserver, that's several separate queries, not one. So what does that actually look like in terms of hops?

**Brandon:** Yeah, okay, fair, there are a few hops. But I'd still say the main work is one query to the authoritative server, because that's the one that actually has the IP. The root and TLD servers are more like signposts, so they don't really count the same way. Once the resolver gets the answer from the authoritative server, it's basically done, so in practice it's still pretty close to a single lookup.


### q3

**Marcus:** Right. The root and TLD queries are real network round-trips the resolver makes, they count the same as the authoritative one. Okay, let's move on. A page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Okay, so my first move would be to find the slow query. I'd probably check the query log or whatever APM the team has, then run EXPLAIN on it to see if it's doing a full table scan. If it is, the fix is usually an index on the column in the WHERE or JOIN clause. Honestly, indexes are basically free speed, so I'd add one pretty much anywhere a query looks slow. I'd also check if the query is N+1, since that's a common one in ORMs where you load a list and then hit the database once per item.

**Marcus:** Okay. What does adding an index actually cost you?

**Brandon:** Writes, mostly. Every insert, update, or delete has to update the index too, so it's slower. Storage goes up as well. But I'd still say for reads it's basically free, so the tradeoff isn't a big deal for most apps.

**Marcus:** Right. What would make you decide *not* to add one?

**Brandon:** Hmm, good question. I guess if the table is tiny, like a few hundred rows, a full scan is basically instant, so an index wouldn't buy you anything. Or if the column has really low cardinality, like a boolean with mostly the same value, the index might not even get used. I'd still lean toward adding one when a query is slow, though, since it's usually the quickest fix.

**Marcus:** Right. So you've added the index, how do you know it actually helped?

**Brandon:** Yeah, I'd check the query plan again with EXPLAIN after the index is in place, and I'd look for it switching from a full table scan to an index scan. I'd also time the query before and after, and check the page's response time in the APM. If the numbers drop, that's the proof. I'd probably also watch for a few days in production to make sure nothing else got slower because of the extra write cost.


### q4

**Marcus:** Got it. Okay, let's switch gears. When would you use REST, gRPC, or GraphQL for an API?

**Brandon:** Yeah, so REST is my default. It's simple, it's built on plain HTTP, and everybody knows how to hit a REST endpoint, so for most CRUD-style services it's the obvious pick. gRPC I'd reach for when services are talking to each other internally and you care about speed. It's binary over HTTP/2, and the protobuf contracts are strict, so you get generated clients. It's basically faster than REST in every case, so I'd pretty much use it for anything backend-to-backend.

GraphQL is good when the frontend needs to pull different shapes of data for different screens, because the client picks which fields it wants and you avoid a bunch of round trips. The downside is caching is harder since everything's usually a POST to one endpoint. So I'd say REST for public APIs, gRPC for internal service calls, and GraphQL when a client has lots of different data needs.

**Marcus:** Okay. What happens when a client just needs a single cacheable resource, like a product page that barely changes?

**Brandon:** Yeah, for that one I'd still just go with REST. A product page that barely changes is a perfect fit for plain GET, because HTTP caching works out of the box. You'd set Cache-Control headers, maybe an ETag, and then browsers and CDNs can hold onto the response and skip hitting your servers at all. GraphQL would make that harder, since everything's a POST to one endpoint and most caches don't key on the body. So for something that's basically a static resource, REST is the cleaner choice. gRPC's not really relevant here either, since that's a browser-facing thing and it doesn't cache the way plain HTTP does.

**Marcus:** Right. Why is that exactly?

**Brandon:** Because plain GET is built for caching. The URL is the cache key, and the response carries headers that tell caches how long to hold it. Browsers, CDNs, and reverse proxies all understand that without any app-specific code. GraphQL usually sends everything as a POST with the query in the body, and most caches don't look at request bodies, so the response isn't cached by default. I think gRPC is similar, since it's still HTTP underneath, so the same problem applies. Plus it's binary protobuf, so even if something tried to cache it, there's no simple URL-based key to work with.


### closing

**Marcus:** Right, the caching point is basically that GET requests have a URL as the natural cache key, and the whole HTTP caching infrastructure is built around that. Okay, that's everything I wanted to cover. What questions do you have for me?

**Brandon:** Yeah, I've got one. How much of the on-call rotation would a new grad be doing in the first six months, and is there a shadow period before you're primary? I'm pretty comfortable with that kind of thing, I just want to know what the ramp looks like.

**Marcus:** So the JD mentions on-call starts after six months, which is basically a built-in ramp. In practice, most teams do a shadow period before you're ever primary, you're on with a senior engineer, watching how incidents get triaged and resolved, before you're carrying the pager yourself. The exact shape of that varies by team, but a new grad going straight to primary on-call with no shadowing would be pretty unusual. Anything else you want to ask?

**Brandon:** Nah, I think that covers it for me. Thanks, Marcus, this was a good conversation. I appreciated the questions, they made me think. I'm pretty excited about the role, so I hope we get to talk again.

**Marcus:** Thanks, Brandon, it was good talking with you too. I'll write up my feedback, and you'll see it on the next screen. Take care.
