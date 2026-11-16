# nervous-rambler (behavioral, junior)


### warmup

**Marcus:** Hi Dana, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Dana:** Oh, hi, yeah, um, thanks for having me. I'm doing okay, I think? I'm a little nervous, which is, like, normal, right? I had this whole thing where I almost got lost finding the building, because the parking garage, it's like a maze, and I went up instead of down, anyway, so yeah, I'm here. Sorry, I'm kind of rambling already.


### background

**Marcus:** Ha, yeah, the parking garage thing happens to everyone, don't worry about it. And being a little nervous is completely normal, honestly. So, today we'll be going through some behavioral questions, things about past experiences, decisions you've made, how you've handled different situations. I'll dig in where I'm curious, and it's totally fine to ask me to clarify anything. Think out loud as much as you want. Okay, so, to get started, walk me through your background.

**Dana:** Um, okay, background. So, I'm Dana, I graduated, well, I'm graduating, I mean I got my B.S. in computer science from the University of Houston, that's 2026, so, yeah. Um, I've kind of been doing like, a lot of things at once? Like school stuff and then I work part-time at the library, on the IT help desk, which is mostly like resetting passwords and fixing printers, which, honestly, the printers are the worst. Anyway, and then there's my capstone, which was, I think it was like our senior project? It was for the campus food pantry, they needed an inventory app, so we built one. Sorry, I'm going kind of all over the place. Do you want me to start with the school stuff or the capstone? I can do either, I just don't want to go on forever.


### q1

**Marcus:** The food pantry inventory app, okay, that's a good place to start. So, tell me about a time you had to push through something technically challenging on a project or at work.

**Dana:** Oh, okay, yeah, so, um, the capstone. I think the hardest part was like, there was this thing with the inventory counts, where they wouldn't match up? So, like, the pantry staff would log donations and then when they'd check the shelves the numbers were off, and we spent, I want to say like two weeks on it? Or was it three, I don't really remember. Anyway, we had four people on the team, and at first everyone kind of had their own theory, and I think I was the one who, well, I was the one who wrote most of the database stuff, so I was like, okay, it's probably my fault, and I was really stressed about it, which, you know, is not the most productive. Sorry, I'm sort of going around in circles. Do you want me to get into the actual bug, or the part where we fixed it, or, um, the stressing part?

**Marcus:** Okay, yeah, go straight to the bug. What was actually causing the counts to be off?

**Dana:** Um, okay, the bug. So, it was like, the app would take the donation entry and update the count, right? But if two people were logging stuff at the same time, like at the pantry during a busy shift, sometimes both of them would read the old number, and then they'd each write back their own version, so one of the updates just kind of, I guess, disappeared? I think we called it a race condition? Or my teammate called it that, I'm not totally sure I'd use the term right. Anyway, it was really intermittent, which is why it took forever to track down, because we couldn't reproduce it on demand. Sorry, is that the level of detail you wanted? I can say more about how we fixed it if that's helpful.

**Marcus:** Okay, so two people reading the same count and both writing back. How did you actually fix it once you'd pinned that down?

**Dana:** Um, okay, so the fix. I think, well, my teammate Priya mostly did this part, but I helped test it? So we changed the update so it wasn't like, read the number in the app, add one, write it back. It was more like, the database does the math itself, so something like update the count set quantity equals quantity plus whatever, in one statement. And I think we also wrapped it in a transaction? Or maybe that was a different thing, I honestly don't remember which change did what. Anyway, after that we ran it with like, a bunch of fake entries at the same time, which is where we finally could make it happen on purpose, and then the counts stayed right. Sorry, I'm not sure that's the clearest way to explain it, but that's basically it.

**Marcus:** Okay, so the atomic update, quantity plus the delta in one statement. You mentioned Priya mostly did that part. What was the piece you personally owned in tracking it down?

**Dana:** Oh, um, okay, so my part. I guess, well, I was the one who wrote the original inventory table and the logging endpoint, so when the counts were off I went through the logs and tried to figure out which entries were getting lost? And I think that's actually how we noticed they were always two entries close together in time, which, I don't know if that was a big deal or just, like, obvious in hindsight. Anyway, I also wrote the script that sent the fake simultaneous entries, which I think was kind of the thing that let us reproduce it. Sorry, I'm not sure if that's what you were asking, I can try to say it more clearly if you want.


### q2

**Marcus:** Got it, the script that reproduced it, that's the piece that unlocked the whole thing. Okay, let's move to the next one. Tell me about a time you failed.

**Dana:** Oh, a time I failed. Um, okay, so, yeah, I think the big one was, like, my first semester in the sophomore year? I was in this data structures class and there was a project, and I started it really late, like the night before, which, I know, I know, don't do that. And I thought I could just, like, get it done, and I didn't really test it, and it turned in with like half the functions not even working. I got a pretty bad grade on it, and I was kind of embarrassed, and I think my roommate was like, well, you literally knew it was due, so anyway. Sorry, I'm kind of rambling. Do you want me to talk about what I changed after that, or the grade part, or, um, the class itself?

**Marcus:** Okay, so the project came in half-finished and you got a bad grade. What exactly went wrong when you were actually working on it that night?

**Dana:** Um, okay, so what went wrong that night. I think, well, I started around like nine at night? Which, I know, it's not like super late, but I'd already kind of, like, put it off for a week, so by then I was panicking. And the assignment was a linked list thing, and I kept getting stuck on the removal part, like when the node was at the end or the head, and I kept trying to fix one case and breaking another. I think I spent maybe three hours just going back and forth on that. Then I ran out of time and just, like, submitted what I had. Sorry, I think that's the part you wanted? I can also say what I did differently after, if that's helpful.

**Marcus:** Okay, so you kept breaking one case while fixing another, and time ran out. What did you actually change about how you work after that?

**Dana:** Um, okay, what I changed. So, I think, well, the big thing was I started actually writing tests before I touched the code? Like, I didn't really know that was a thing people did until, um, my data structures TA kind of mentioned it in office hours. So for the next project I wrote out all the edge cases first, head, tail, empty list, one node, and then I'd run them after every little change, which, honestly, would have saved me that whole night. Anyway, I also started like, not waiting until the night before, which, yeah, I know that's obvious. Sorry, I think I'm kind of repeating myself. Do you want me to talk about how that worked on the next project, or was that the main thing you were asking?

**Marcus:** Right, writing tests first, edge cases before touching the code. How do you know that change actually held up, did you run into a similar crunch on a later project?

**Dana:** Um, yeah, so, the next project was like, the team one for the database class? And honestly I was kind of worried I'd fall back into the old habits, because we had this group thing and everyone was like, let's just get it going. But I kind of pushed for us to write the test cases first, like a list of what the functions had to do, and I think, well, my teammate Jordan was skeptical at first? But then we caught a bug on like day two, where a query returned duplicate rows, and the test caught it before we built anything on top of it. So that felt, like, pretty good? We did end up getting a little crunch near the end, because the demo was earlier than we thought, and I did not love that, but we didn't have the all-nighter thing again. Anyway, yeah. Sorry, I think that's kind of long. Do you want me to say more about how the group dynamic went, or was that the main part?


### q3

**Marcus:** Got it, the test caught the duplicate-row bug on day two, and the crunch still happened but no all-nighter. Okay, let's move to something a bit different. You mentioned the Campus Food Pantry project earlier, tell me about a time you disagreed with a teammate about a technical approach on that project.

**Dana:** Oh, a disagreement. Um, yeah, so, there was, I think it was around the middle of the semester? We were deciding whether to use like, an ORM for the database stuff, or just write the raw SQL ourselves. And I, well, I was kind of leaning toward raw SQL because I'd already written the inventory table that way, and I didn't really want to redo it? But my teammate Marcus, no, wait, different Marcus, my teammate, uh, Devon, he wanted to use the ORM because he'd used it at his internship. So we went back and forth for like a few days, and honestly I don't think either of us was really listening to the other at first. Sorry, I'm kind of getting lost in the details. Do you want me to get into how we decided, or what the actual tradeoffs were?

**Marcus:** Okay, so you were mid-project, raw SQL already in place, Devon pushing for the ORM. What was the strongest argument Devon was making for his side?

**Dana:** Oh, um, okay, Devon's side. So, I think his big thing was, like, the ORM would handle all the boring stuff for us, like the connection handling and, um, building the queries, so we wouldn't have to write as much SQL by hand? And he kept saying that raw SQL is where you make mistakes, like typos or forgetting a parameter, and he'd seen that happen at his internship, I think it was like a whole thing where someone had a security problem with string-built queries? Anyway, he was kind of right about that part, I think. I just didn't really want to throw away what I'd already done. Sorry, I know that's kind of a side point, but that's what he was pushing on.

**Marcus:** Right, so Devon had a real point about the security angle. What did you actually bring to the conversation to push back, like, was there anything concrete you put in front of him, or was it more just talking it through?

**Dana:** Um, okay, so what I brought to it. Honestly, mostly it was just talking it through, I think? I don't know that I had anything super concrete. I think I said something like, well, the inventory table is already done, so switching now is a lot of work, and that's kind of a bad reason, like, I knew that even while I was saying it. Anyway, I did end up, um, actually going back and looking at the queries I'd written, and I was like, oh, some of these are built with string concatenation, which is exactly the thing Devon was worried about. So that kind of, like, changed my mind a little? Sorry, I'm not sure that's the strongest answer, I can say more about how we actually decided if you want.

**Marcus:** Right, so you looked back at your own queries and found the string concatenation issue. Who actually made the final call on which way to go?

**Dana:** Um, okay, the final call. I think it was kind of, well, we sort of decided together? But I think our TA, or maybe it was our professor, Dr. Alvarez, I want to say he was the one who said something like, pick one and stick with it, because we'd been going back and forth for like a week. So I think we ended up going with the ORM, but then, I'm not totally sure if that was the TA or Devon or the group, honestly. Anyway, I'm sorry, I think I'm kind of fuzzy on the details there. Do you want me to talk about how the ORM went after we switched, or the part where I had to redo the table?


### q4

**Marcus:** Okay, so the TA stepped in, you landed on the ORM, and you had to redo the table. Let's move on. Tell me about a time you had to become productive fast in a technology you'd never used.

**Dana:** Oh, um, okay, a new technology. So, I think the big one was, like, when I started at the library help desk? Well, not a programming language, but the ticketing system they use, it's this old web thing, and I'd never touched it before. My manager just kind of, like, showed me the basics on the first day and then I was on my own with it. Anyway, I spent like the first week just clicking around and sort of guessing, and I think I made a couple tickets close by accident? Which, I felt really bad about. Sorry, I'm kind of going off track. Do you want me to talk about how I got up to speed on it, or the programming side, like, the Python stuff I picked up for the capstone?

**Marcus:** Okay, yeah, let's go with the Python side, the capstone. What was the very first thing you did when you realized you needed to pick it up?

**Dana:** Um, okay, the Python side. So, honestly, I didn't really start with Python? Our capstone was mostly React and Node, and I think I was kind of, like, the one who knew the most Python because of my intro classes. So, um, when we needed a script for the fake entries, that's when it came up. I think my first move was just, like, googling how to send a bunch of requests at once, and I found some stuff about threads, and I was like, oh, okay, I think that's what I need? And then I just tried to copy an example and modify it until it worked. Anyway, it was kind of messy, and I think it took me a few tries. Sorry, I'm going kind of in circles. Is that the kind of thing you wanted, or do you want me to get into the actual script?

**Marcus:** Okay, so you found a threading example and modified it until it ran. How did you figure out which parts of that example to keep and which to change for what you actually needed?

**Dana:** Um, okay, so which parts to keep. Honestly, I think I mostly just ran it and looked at what broke? Like, the example had this thing where it was printing a bunch of stuff from every thread, and I didn't need that, so I took it out. And then it had a sleep in it, which I didn't really understand, so I kind of left it in at first? Anyway, I think I figured out what each part was doing by adding print statements everywhere, which, I know that's not the most elegant way. Sorry, I'm kind of rambling again. Do you want me to talk about what I changed to make the threads actually hit the endpoint at the same time, or the part where I wasn't sure the entries were really overlapping?

**Marcus:** Okay, print statements everywhere, running it to see what broke. So what actually came out of that script, did it do what you needed it to do in the end?

**Dana:** Um, yeah, so, did it do what I needed? I think, mostly? Like, it did send the requests at the same time, which was the main thing, but at first I wasn't totally sure they were actually overlapping, because some of them were kind of, like, spaced out a little? So I added timestamps to the output, and then I could see that a bunch of them were landing within the same few milliseconds, which, um, yeah, that's when we got the duplicate-count thing to show up. Anyway, I think I took the sleep out eventually, which helped. Sorry, I'm not sure that's super clear. Is that what you were asking?


### q5

**Marcus:** Got it, timestamps confirmed the overlap, and pulling the sleep out tightened it up. Okay, let's move to something different. Tell me about a time you had more work than you could finish during your capstone project.

**Dana:** Um, okay, so more work than I could finish. Yeah, so, I think this was like, toward the end of the capstone? We had this list of features the pantry wanted, like the reporting page and the low-stock alerts and this whole barcode thing, and we'd kind of promised all of it at the start. And then around like week eight or nine, we realized, I think, that we just couldn't do all of it. Anyway, I was really stressed about that too, which, I'm noticing I get stressed about pretty much everything. Sorry, I'm kind of going around again. Do you want me to talk about how we decided what to cut, or was it more about how I handled my own piece of it?

**Marcus:** No need to apologize, you're setting the scene well. So, walk me through what was actually on your plate at that point, what were you personally responsible for?

**Dana:** Um, okay, so my plate. I think I had the, well, the reporting page? Like the backend endpoints for it, and then I was supposed to help with the low-stock alerts too, which, I think, was like a query that would look for items under a certain number? And the barcode stuff was Priya's, I think, but I was supposed to do the database side of it. Anyway, I had maybe like three things, but two of them were kind of half-done, and I was honestly not sure which one to finish first. Sorry, is that the kind of thing you wanted? I can say more about how I ended up prioritizing, if that's helpful.

**Marcus:** Okay, three things, two half-done. So how did you decide which one to finish first?

**Dana:** Um, okay, so how I decided. Honestly, I don't think it was like a real decision? I kind of just looked at which one was closest to being done, which was the reporting endpoints, I think, because they were mostly written and I just needed to, like, hook them up to the page. So I did that first. And then the low-stock alerts I wasn't really sure about, because I kept thinking the query was wrong, and I didn't want to, like, rush it and break something else? Anyway, I think I talked to Priya about it, and she was like, just get the reporting done so we have something to show. So, yeah, that's kind of what we did. Sorry, I'm kind of going around again. Do you want me to get into how the alerts turned out, or the barcode database part?

**Marcus:** Okay, so reporting first because it was closest to done, and Priya confirmed that. What happened to the low-stock alerts and the database side of the barcode thing, did either of those actually get finished?

**Dana:** Um, okay, so the low-stock alerts. I think, well, I got the query mostly working? Like it would find items under the threshold, but I kept second-guessing whether it was counting items that were already reordered, and I never really fully resolved that. So I think we shipped it kind of, like, half-done, with a note in the readme saying it might show some extra items. Which, I know, is not ideal. And the barcode database part, I think I got the table set up, but Priya ended up doing most of the actual integration herself near the end, because I was kind of stuck on the alerts. Anyway, so, yeah, neither one was really finished the way I wanted. Sorry, I know that's kind of a bummer answer. Do you want me to say what I'd do differently, or was that what you were asking?


### closing

**Marcus:** Okay. So the alerts shipped with a known gap, and the barcode table got handed off to Priya. That's everything I wanted to cover today. What questions do you have for me?

**Dana:** Oh, um, yeah, sure. I guess, um, I was wondering what a typical first few months look like for someone new on the team? Like, what kind of stuff would I actually be working on, and how much help would I get with the on-call part? Sorry, that's kind of a big question. But yeah, I think that's it for me, I'm all set. Thanks so much for your time, Marcus.

**Marcus:** No need to apologize, that's a fair question. The first few months are usually pretty structured: you'd be ramping up on the codebase, pairing with a more senior engineer on smaller tickets, and getting familiar with how we do code review. On-call typically doesn't kick in until around the six-month mark, and when it does, you'd shadow someone first before you're ever on the hook solo. Anything else you wanted to ask?

**Dana:** Oh, um, no, I think that's really helpful, thanks. I'm all set, I think. Sorry, I know I said that already, I just, yeah, I'm good. Thanks again for your time, Marcus, I really appreciate it.

**Marcus:** No worries, Dana. Thanks for coming in today, I'll write up my feedback, and you'll see it on the next screen. Take care.
