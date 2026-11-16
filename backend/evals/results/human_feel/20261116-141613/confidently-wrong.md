# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Hey Marcus, thanks for having me. I'm doing great, pretty excited for this one. I've been looking at the team's stack and the backend work sounds right up my alley. Happy to dive in whenever you're ready.


### background

**Marcus:** Good to hear it, glad you're excited. So, we'll be going through some technical questions today, junior level, and I'll dig in where I'm curious. Think out loud as you go, and feel free to ask me to clarify anything. To kick things off, just walk me through your background briefly, what you've been working on, what brought you here.

**Brandon:** Sure thing. I just finished my B.S. in Computer Engineering at Purdue this year. The project I'm most proud of is a Discord bot I wrote in Python. It handles moderation commands and some custom role assignment, and it's been running for a few hundred servers. I also built my own portfolio site to get comfortable with the web side of things.

Honestly, I'm a pretty fast learner, so when I hit something I don't know, I pick it up quickly. What drew me to this role is that it's backend-focused, which is where I want to spend my time. Writing services, working with databases, and getting into the code review process sounds like exactly the kind of work I want to be doing day to day.


### q1

**Marcus:** Discord bot at scale, nice. Okay, let's get into the technical side. What happens when you type a URL into a browser and press enter?

**Brandon:** Sure. So the browser first parses the URL and checks its cache for the page, then it does a DNS lookup to turn the domain into an IP address. Once it has the IP, it opens a TCP connection to the server on port 80, and since this is HTTP it's basically a three-way handshake and then the request goes out. The server sends back the response, which is usually HTML, and the browser renders it. Honestly, the main thing that matters there is DNS, because everything else is just the request-response cycle, and that's pretty quick once the connection is up.

**Marcus:** Okay. You mentioned port 80 and HTTP, what happens before that first byte of the HTTP request actually goes out?

**Brandon:** Right, so that's the TCP handshake, SYN, SYN-ACK, ACK. Once that's done the browser just fires off the GET request. And since it's plain HTTP on port 80, there's no encryption step, so nothing else really happens before the request goes out. I think the handshake is basically the last setup step.

**Marcus:** Right, so you've got the TCP handshake covered. But you said port 80 and plain HTTP, what if the URL starts with HTTPS instead?

**Brandon:** Yeah, so HTTPS just means it's the same flow but on port 443 instead of 80, and the request is encrypted. I think the encryption part is pretty straightforward, the browser and server just agree on a key and then everything gets encrypted with that key before the request goes out. So it's really just a small extra step on top of the handshake, nothing too complicated.

**Marcus:** Okay. You said the browser and server 'agree on a key', how does that actually work if they've never talked before and anyone on the network could be listening?

**Brandon:** Yeah, so basically the browser just generates a key and sends it to the server, and the server uses it from there. I think that's the core of it. Anyone listening would only see the handshake, and the key itself is what keeps everything else private, so as long as the key isn't leaked it's pretty secure.


### q2

**Marcus:** Got it. So the key exchange piece, when the browser sends the key in the clear, anyone listening could grab it, so that part doesn't quite hold up, but we can pick that thread up another time. Let's move on. A page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Yeah, so first I'd look at the query itself and run EXPLAIN to see what the database is actually doing. If it's doing a full table scan, the fix is usually an index on the columns in the WHERE or JOIN clause. Indexes are basically sorted structures, so lookups go from linear to logarithmic, which is a huge win. I'd also check whether the query is pulling more columns or rows than the page needs, and maybe add a LIMIT or pagination. If it's still slow after that, I'd look at caching the results, but I'd want to measure first before adding that complexity.

**Marcus:** Okay. Before you run EXPLAIN, how would you confirm it's actually that query that's slow?

**Brandon:** Yeah, so I'd check the logs or the APM tool first, if the team has one, and look at which endpoint has the highest latency. Then I'd pull the slow query log from the database and see which queries are taking the longest. If one query stands out, that's the one I'd dig into. I'd also want to reproduce it locally with a similar dataset, so I'm not guessing based on production alone.

**Marcus:** Got it. So you've got the query plan in front of you, what specifically are you looking for in it?

**Brandon:** Yeah, so the big thing I'd look for is whether it's doing a sequential scan on a large table, because that's usually the culprit. I'd also check the estimated versus actual row counts, since if those are way off the planner might be picking a bad plan. And I'd look at the join order and join types, making sure it's not doing a nested loop over a huge set when a hash join would be better. If there's a sort or a temp file spilling to disk, that's worth noting too. Basically I'm looking for where the cost is concentrated and whether an index could cut it down.


### q3

**Marcus:** Right. Okay, let's switch gears. What can go wrong when several threads increment the same counter without any locking?

**Brandon:** Sure, so the main thing is that the counter ends up with the wrong value. Basically, if two threads read it at the same time, they both see the same number, both add one, and both write back the same result, so you lose an increment. Python's GIL makes it a bit safer for simple ints, but it's not atomic for something like counter += 1, so you can still hit it. Honestly, the fix is just a lock around the increment, or use an atomic type if the language has one. Locks are pretty cheap these days, so I wouldn't worry too much about the overhead.

**Marcus:** Okay. You mentioned it only fails sometimes, why is that? What makes it non-deterministic?

**Brandon:** Yeah, so it's basically timing. Whether two threads actually collide depends on how the scheduler interleaves them, and that changes every run. If one thread finishes its read and write before the other one even starts, you get the right answer. It only breaks when they overlap in just the wrong spot. And honestly, with the GIL in Python, the switches happen at fairly predictable points, so it's not really random, it's more that the window is small enough that it doesn't show up often in testing.


### q4

**Marcus:** Got it. Okay, let's shift to something from your own work. You mentioned building a Discord bot, how would you write a unit test for a command handler in that bot to make sure it returns the right response without actually calling Discord's API?

**Brandon:** Yeah, so I'd mock out the Discord API calls. I'd use something like unittest.mock or pytest-mock to replace the client or the context object, so the handler thinks it's sending a message but really it's just recording the call. Then I'd call the handler directly with a fake context, and assert that the mock got called with the expected response text. That way the test runs fast and doesn't need a network connection or a real bot token.

I did a bit of this on my moderation commands, actually. Honestly I found the mocking part pretty easy once I got the hang of it. I'd probably also split the logic out of the handler into a plain function so I can test that without any Discord objects at all, which makes the tests even simpler.

**Marcus:** Okay. You mentioned splitting logic out of the handler into a plain function, how did you actually structure that in your moderation commands?

**Brandon:** Honestly, I didn't do a full split like that in the moderation commands. Most of it was just the handler doing everything inline, checking the user's roles, then calling the ban or mute function directly. I kind of mean I'd do it that way next time. The logic's basically all in the command function, and I test it by mocking the context. It works fine for the size of the bot, so I didn't really see a reason to refactor.

**Marcus:** Right. So when you do mock the context in those moderation tests, what exactly are you asserting on? Like, what does the test actually check?

**Brandon:** Yeah, so mostly I'm asserting that the mocked context got sent the right message. Like if someone runs the ban command without the mod role, I check that the reply says they don't have permission. And if they do have the role, I check that the ban function got called with the right user ID. Honestly those two checks cover most of what matters for moderation, since the whole point is making sure the right people get through and the wrong ones get stopped.

**Marcus:** Got it. You mentioned checking that the ban function got called with the right user ID, how are you setting up the fake context so the role check actually works? Like, what does that mock object look like?

**Brandon:** Sure, so I'd make the context a MagicMock, and then set up the author's roles as a list of mock role objects with a name attribute, like "Moderator" or nothing at all for the regular user. The handler checks something like "Moderator" in [r.name for r in ctx.author.roles], so if I set that list up right, the check just works. I usually build a little helper that takes a role name and returns the fake context, so I don't have to repeat that setup in every test.

The nice thing is that MagicMock gives you attributes for free, so you don't have to define every field. Ban function I'd patch with patch() so I can check the call args afterward. Honestly it's pretty simple once it's set up.


### closing

**Marcus:** Okay. That's everything I wanted to cover today, what questions do you have for me?

**Brandon:** Yeah, I do have one. What does a typical week look like for someone on the team, like how much time goes to on-call versus feature work? I know on-call kicks in after six months, so I'm curious how that's split and how much support you get when you're first starting it. That's really it for me, I think I'm all set.

**Marcus:** Sure. So most weeks it's probably seventy to eighty percent feature work, writing code, reviewing PRs, that kind of thing, with some time for meetings and design discussions. On-call, once it kicks in, tends to be lighter for a junior engineer at first: you're usually shadowing or paired with someone more senior before you're the primary. The ramp-up is gradual, and there's generally a runbook and a team channel to lean on. Anything else you want to know?

**Brandon:** Nope, that covers it for me. Thanks, Marcus, really appreciate you walking me through that. I'm all set.

**Marcus:** Thanks, Brandon. I'll write up my feedback, you'll see it on the next screen. Take care.
