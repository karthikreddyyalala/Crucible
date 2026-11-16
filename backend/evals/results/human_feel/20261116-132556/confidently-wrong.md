# confidently-wrong (technical, junior)


### warmup

**Marcus:** Hi Brandon, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Brandon:** Hey Marcus, doing great, thanks for having me. Pretty pumped about this one, the team's work on the backend stuff is exactly the kind of thing I want to be doing. Hope your day's going well too.


### background

**Marcus:** Doing well, thanks for asking, and good to hear you're excited about it. So, we'll be going through some technical questions today, junior level, mix of concepts and maybe some design. Think out loud as you go, I'll dig in where I'm curious, and feel free to ask me to clarify anything. To kick things off, just walk me through your background briefly.

**Brandon:** Sure thing. I just finished my B.S. in Computer Engineering at Purdue this past spring. Most of my hands-on backend stuff has been side projects. The big one is a Discord bot I wrote in Python, which handles commands, stores user data, and runs a bunch of background tasks. I also built my own portfolio site from scratch. I'd describe myself as a fast learner, so whenever I hit something new I can pick it up pretty quickly. I'm really looking forward to getting into the technical side with you.


### q1

**Marcus:** The Discord bot with background tasks, okay, that's a good place to start. Let's get into the technical stuff. What can go wrong when several threads increment the same counter without any locking?

**Brandon:** Yeah, so a counter with no locking is basically fine most of the time because increments are atomic at the CPU level, so you'd just get the right number eventually. The only real risk is if you're reading it and writing it back in two steps, and even then it's pretty rare in practice. I mean, in Python the GIL handles most of that anyway, so I wouldn't worry too much about it for a simple counter.

**Marcus:** Okay, so you mentioned the read-then-write being the risky part. Walk me through exactly what happens when two threads interleave on that single increment, like, step by step.

**Brandon:** Yeah, so, um, the way I'd think about it is each thread reads the value, adds one, and writes it back. If they interleave, both might read the same number, say 5, and then both write back 6. So you'd lose one increment. But honestly I'd say that's still pretty unlikely for a simple counter, and the GIL basically keeps it in line, so it's not something I'd lose sleep over.

**Marcus:** Right, so you've got the lost-update picture, both read 5, both write 6. But you said it's unlikely. Why does it only fail sometimes and not every single time?

**Brandon:** Yeah, so it's a timing thing. Most of the time the threads don't actually overlap on that read-add-write, so each one finishes before the other starts and you get the right count. It only breaks when the switch happens right in between the read and the write. And honestly the GIL kind of helps there too, since Python only lets one thread run bytecode at a time, so the window is pretty small. I'd still say it's rare enough that for a simple counter it's not really a big deal.

**Marcus:** Okay, so the timing window is small but real. How would you actually fix it?

**Brandon:** Yeah, so the simplest fix is a lock. You wrap the read-add-write in a mutex so only one thread can be in that section at a time. In Python that's a threading.Lock, and you use it with a with statement. Honestly though, for a counter that's barely touched, I'd probably still lean toward just leaving it, since the GIL already makes it pretty safe in practice.


### q2

**Marcus:** Got it, threading.Lock with a with statement. Okay, let's move on. When would you use REST, gRPC, or GraphQL for an API?

**Brandon:** Yeah, so REST is my default. It's simple, everything speaks HTTP, and most of the tooling you'd need is already there. I'd use it for most CRUD-style services. gRPC I'd reach for when I need service-to-service calls that are fast and strongly typed, since it's binary and uses protobuf, so it's a good fit for internal traffic. GraphQL is useful when clients need to pick exactly which fields they want and you don't want a bunch of separate endpoints. Honestly, gRPC is basically just REST but faster, so for most projects I'd probably still just go with REST.

**Marcus:** Okay, gRPC for internal, REST as the default. One thing you didn't mention: who are the clients of the API?

**Brandon:** Yeah, good point, that matters a lot. If the clients are browsers or outside partners, REST is the safer call since everything can hit it and it caches well. If it's internal services talking to each other, gRPC makes more sense for the speed and typed contracts. And if you've got a bunch of different frontends that each need different slices of the same data, GraphQL starts to earn its keep. So I'd say it depends on who's calling, but honestly I'd still lean REST unless there's a specific reason not to.


### q3

**Marcus:** Right, client type, caching, typed contracts. One thing neither of us touched on: once you've shipped an API and clients are depending on it, how do you change a field without breaking them? Okay, let's move to something different. A page in your app got slow and you suspect a database query, how would you fix it?

**Brandon:** Yeah, so my first move would be to look at the query itself. I'd run EXPLAIN on it and see whether it's doing a full table scan. If it is, the usual fix is adding an index on the columns it filters or joins on. I'd also check whether it's pulling back more columns or rows than the page actually needs. And honestly, if it's a join, a LEFT JOIN is going to drop rows that don't have a match, so I'd make sure I'm using the join type that actually gives the results the page expects.

**Marcus:** Okay, EXPLAIN, full scan, index on the filter columns. Before you add that index, how would you confirm it's actually that query that's making the page slow?

**Brandon:** Yeah, so I'd start by timing the page and seeing where the time actually goes. If the app has any kind of request logging or APM, I'd pull up the slow endpoint and check how long the database calls take compared to everything else. I'd also turn on the slow query log on the database and see which statements are over the threshold. Honestly though, if the query is obviously doing a full scan on a big table, I'd probably just go ahead and add the index, since that's almost always the culprit.

**Marcus:** Right, slow query log and APM to confirm it first. So once you've got the query plan in front of you, what are you actually looking at in there to decide whether an index will help?

**Brandon:** Yeah, so I'd look for the scan type first. If it says full table scan on a big table, that's the red flag. Then I'd check the estimated rows against the actual rows, because if the planner's way off, the plan might be bad for a different reason. I'd also look at the filter and join conditions and see whether there's an index that matches them. Honestly, if I see a seq scan with a WHERE on one column, I'm pretty confident an index on that column is the answer.

**Marcus:** Okay, seq scan, WHERE on one column, index on that column. If the query filters on two columns, say status and created_at, how do you decide which one goes first in the index?

**Brandon:** Yeah, so for a two-column filter I'd usually put the equality column first and the range column second. So status first, since it's probably an exact match, and created_at second. Honestly, though, the order doesn't matter much as long as both columns are in there, because the database will pick whichever index it likes best anyway. I'd just make a composite index on both and move on.


### q4

**Marcus:** Okay, equality column first, range second. That's the right instinct. Let's switch gears. How would you write a test for a Python function in your Discord bot that fetches data from an external API?

**Brandon:** Yeah, so I'd mock the external API call so the test doesn't actually hit the network. In Python I'd use unittest.mock, patch the request function in the module where the bot calls it, and have it return a fake response. Then I'd assert that my function parses that response correctly. Honestly, for a function that just fetches and formats data, I'd probably skip a separate integration test, since the mock covers the logic and the real API is outside my control anyway.

**Marcus:** Okay, patching in the module where it's called. How exactly would you set that patch up, like, what does that unittest.mock call look like in practice?

**Brandon:** Yeah, so you'd use patch as a decorator or a context manager. Something like with patch("bot.commands.requests.get") as mock_get, and then you set mock_get.return_value to a fake response object with a json method that returns whatever data you want. Then you call your function and assert on the output. The key part is the string path, it has to point to where the name is looked up, not where it's defined, which is why I'd patch it in the bot's module. Honestly, I've done this a bunch in my Discord bot, so it's pretty second nature at this point.

**Marcus:** Right, patching where the name is looked up, not where it's defined. What would you do if the function you're testing makes two separate API calls, and you need them to return different responses?

**Brandon:** Yeah, so that's easy with side_effect. You set mock_get.side_effect to a list of fake responses, and each call returns the next one in order. Or if the calls go to different URLs, you can make side_effect a function that checks the URL and returns the matching response. Honestly, I'd probably just go with the list since it's quicker to write, and as long as the calls happen in the same order every time, it's pretty solid.

**Marcus:** Okay, side_effect as a list, or a function that checks the URL. One more thing: you mentioned skipping a separate integration test. What's the tradeoff you're making there?

**Brandon:** Yeah, so the tradeoff is mostly speed and control versus realism. Mocks are fast and they let me hit edge cases, like a 500 or a weird payload, without having to trigger them on the real API. The downside is the mock only knows what I told it, so if the real API changes its response shape, my tests will still pass and the bot breaks in production. Honestly though, for a small Discord bot I think that's an acceptable risk. I'd rather have fast unit tests and maybe check the real API by hand once in a while.


### closing

**Marcus:** Got it, fast tests, manual spot-checks for drift. Okay, that's everything I wanted to cover. What questions do you have for me?

**Brandon:** Yeah, thanks. I do have one question. What does on-call look like for a new grad on the team? Like how often you rotate in, and how much support you get the first few months before you're taking pages on your own?

**Marcus:** Yeah, that's a common one to wonder about. So the JD mentions on-call kicks in around six months in, the idea being you've had time to get familiar with the systems first. In practice, new grads usually shadow someone on-call before they're ever the primary, and there's typically a runbook or escalation path so you're not just staring at a page alone at 2am. The ramp varies by team, but you'd have a buddy or a senior on-call alongside you early on. Anything else you want to ask?

**Brandon:** Nope, that answers it for me. I think I'm all set, thanks Marcus. Appreciate you walking me through everything today.

**Marcus:** Okay, Brandon, thanks for coming in today. I'll write up my feedback, and you'll see it on the next screen. Take care.
