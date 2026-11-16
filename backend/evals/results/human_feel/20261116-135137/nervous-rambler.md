# nervous-rambler (behavioral, junior)


### warmup

**Marcus:** Hi Dana, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Dana:** Oh, hi, yeah, um, thanks, I'm doing okay, I think? I'm a little nervous, sorry, I always get like kind of jittery at these things. My cat was, like, yelling at me this morning for breakfast, so that was a whole thing, and then I almost missed the bus, which, anyway, I'm here now, so that's good. Thanks for having me, Marcus. Sorry, I'm rambling already.


### background

**Marcus:** Hey, no need to apologize, a cat alarm and a close call with the bus is a rough start, I get it. You made it, that's what counts. So, this'll be a behavioral interview, mostly questions about things you've actually done or been through, at whatever level, school projects, jobs, side stuff. Think out loud as you go, and if anything I ask is unclear, just say so and I'll rephrase. Okay, so, walk me through your background.

**Dana:** Um, yeah, okay, so my background. I'm, like, a computer science major at the University of Houston, I graduate this past spring, so, um, 2026. Well, I guess I'm about to graduate, I mean I finished the classes, there's just the paperwork and stuff. Anyway, the big thing was our capstone, which was this inventory app for the campus food pantry? And I think it started in like, second year? No, wait, it was senior year, the fall. There were four of us on the team, and we used React for the front end, Node on the back, and Postgres for the database. And then, I also work part-time on the IT help desk at the library, which is mostly resetting passwords and fixing printers, so, yeah. Sorry, I'm going kind of all over the place. Was there a specific part you wanted me to start with?


### q1

**Marcus:** Got it, the food pantry app. Okay, let's get into the actual questions. Tell me about a time you had to figure something out on your own, no one to ask, no clear answer in the docs, and walk me through how you handled it.

**Dana:** Oh, um, yeah, okay. So, a time I had to figure something out on my own. Hmm. I think, like, the capstone had a bunch of those? Um, there was this one thing with the database, I think? Or maybe it was the login stuff, sorry, let me think. Okay, so, the pantry had this thing where volunteers would check out items, and sometimes the counts would be like, off by a few, and, anyway, we weren't sure why. Our professor, he was kind of hands off, like, he said figure it out, which, honestly, same. Sorry, I'm going all over the place. Was there a specific kind of situation you wanted me to talk about?

**Marcus:** No worries, the inventory counts being off is a good place to start. Stick with that one. What did you actually do to track down why the numbers were off?

**Dana:** Oh, okay, yeah, so the counts. Um, so at first we just kind of assumed it was like a user thing, you know, volunteers typing the wrong number? And I think I spent like a whole evening just, like, reading the checkout code, which, honestly, I didn't really know what I was looking for, I was just kind of staring at it. Then, um, my teammate Priya, she was like, let's just check the logs, and we didn't really have logs, so we added some, like, console stuff, which, anyway, was kind of messy. And then I think we noticed that when two people hit checkout at almost the same time, sometimes both of them would read the same count and then write back, so one update would just, like, get overwritten? Sorry, I think that's right? I'm not totally sure I'm explaining it well.

**Marcus:** Okay. So you noticed two checkouts hitting at the same time and one write overwriting the other, what did you actually do to fix it once you'd spotted that?

**Dana:** Um, okay, so the fix. Yeah. So, I think at first we, like, wanted to just put a lock on the whole inventory table? But Priya was like, that's gonna make everything super slow, which, she was right, she's usually right, honestly. And then I think we looked up something online, there was like a Stack Overflow thing, and it talked about doing the update in one statement instead of reading the number first in the code and then writing it back? So instead of, like, read the count, subtract one, write it, we did it as one update in Postgres, where the database does the subtraction itself. Anyway, I think there was also a row lock thing, like SELECT FOR UPDATE, but I'm honestly not sure which one we actually ended up using. Sorry, I think it was the single update? I'd have to double check my notes, I'm kind of blanking on the exact details right now.

**Marcus:** Okay. You mentioned you're not sure if it was the single-statement update or the SELECT FOR UPDATE, what's your best guess at why one of those would be better than the other in that situation?

**Dana:** Um, okay, so, I think the single update is better because, like, the database does the math itself, right? So there's no gap where another checkout can sneak in between reading the number and writing it back. Wait, is that right? I think SELECT FOR UPDATE would also work because it locks the row while you read it, so nobody else can change it until you're done. Sorry, I think the difference is the single update is, like, quicker? Because you're not holding a lock across multiple steps in the code? I'm honestly not totally sure, I'd want to double check that part. Sorry, I'm going around in circles.


### q2

**Marcus:** Right. So the single-statement update avoids the read-modify-write gap entirely, and SELECT FOR UPDATE holds a lock across that gap, either works, but the atomic update is generally cleaner. Okay, let's move on. Tell me about a time you failed.

**Dana:** Oh, um, a time I failed. Okay. Hmm, yeah, so, I think, like, the biggest one was probably in my first semester? I was in this intro class and we had a project, and I kind of waited until the last like three nights to start it, which, anyway, was not great. Sorry, I'm, um, trying to remember the details. I think I got a C on it? Or maybe it was a C plus, I don't remember exactly. Was there a specific kind of failure you wanted me to talk about, or just any one?

**Marcus:** Okay. So, the project you waited on, what exactly went wrong when you finally sat down to work on it?

**Dana:** Um, okay, so when I finally sat down with it, I think it was like, the assignment was a small program that read in a bunch of grades from a file and then, um, calculated averages? And I thought I could just, like, do it in one sitting, and I got stuck on the file reading part, because I didn't really understand how the file was formatted. Like, there were these commas and some lines had extra spaces, and my program kept crashing, and I was just, like, kind of panicking, to be honest. Sorry, I'm, um, going a little fast. I think I ended up asking a friend who had taken the class before, and she showed me a thing with splitting the lines, and then it mostly worked, but it was like, really late, and I think I missed some of the edge cases? Anyway, yeah, that's kind of what went wrong.

**Marcus:** Got it. So you missed some edge cases and turned it in late, what did you actually change about how you work after that?

**Dana:** Oh, um, yeah, okay. So, what I changed. I think, like, I started starting things earlier? Which sounds dumb when I say it out loud, but, um, like, I'd break the assignment into smaller pieces, and I'd try to get one piece working before I moved on. And I also started, I don't know, testing stuff with weird inputs, like the extra spaces and blank lines, because that's what got me last time. Anyway, I think that helped, mostly. Sorry, I'm not sure that's really a clear answer. Was there like a specific part of that you wanted me to get into more?

**Marcus:** Right. So you started earlier and tested with weird inputs after that, how do you know that actually stuck? Like, did a similar situation come up where you can point to it making a difference?

**Dana:** Um, yeah, so, how do I know it stuck? Hmm. I think, like, the capstone was kind of the test for that? Because we had a lot of stuff to do, and, anyway, there was this part where we had to import the pantry's donation spreadsheet into the database, and it was like a CSV, which, oh no, sorry, it's kind of the same problem as the grades thing, with the commas and the extra spaces. So I actually wrote a few test files with blank lines and weird spacing before I even touched the import code. And, um, I think that's the part that didn't break when we demoed it? Well, mostly didn't break. Sorry, I'm not totally sure how to say whether that was because of the testing or just luck.


### q3

**Marcus:** Okay. The CSV import holding up during the demo, that's a real data point. Alright, let's move on. You mentioned the Campus Food Pantry project, tell me about a time you disagreed with a teammate about a technical approach on that project.

**Dana:** Oh, um, yeah, a disagreement. Okay. So, I think, like, the one that comes to mind is with Priya again? Sorry, she's kind of my go-to example, she's the one who did the locking thing. Um, so we were deciding how to handle the checkout logic, and I think I wanted to, like, put a bunch of the validation in the front end, because it felt quicker to see the error right away? And she was like, no, we need it on the server too, or else anybody can just send a request and skip it. Anyway, I think she was right, but at the time I was kind of, um, defensive about it? Sorry, I'm not sure if that's the kind of disagreement you meant. Do you want me to talk about how we actually resolved it?

**Marcus:** Got it. So you came around to her side on the server-side validation, what was it that actually convinced you?

**Dana:** Um, yeah, so, what convinced me. I think, like, she didn't just say it's insecure, she kind of showed me? She pulled up the request in, um, I think it was Postman, and sent a checkout with a negative quantity, and it went right through, because the front end was the only thing checking. And I was like, oh. Oh no. Anyway, that was kind of embarrassing, because I'd thought the front end check was enough, and it really wasn't. Sorry, I'm, um, not sure I'm explaining it super clearly. I guess the moment that made it click was seeing it actually work in the database, like, the bad number just sitting there. Is that the kind of thing you were asking about?

**Marcus:** Right. So seeing the bad data actually land in the database, that's what flipped it. What happened after that, like, how did you two actually decide to move forward?

**Dana:** Um, yeah, so after that we kind of just, like, sat down together? I think it was like the next day, at the library, because that's where we both were anyway. And, um, Priya had this whiteboard thing, or I guess it was just a notebook page, and we basically wrote out which checks had to live on the server, like no negative counts, no checkouts for items that were already at zero, and stuff like that. And I kind of, um, offered to take the front end messages and make them match the server errors, so the user would see the same thing either way? Anyway, we agreed that the server was the source of truth, and the front end would just, like, mirror it. Sorry, I'm kind of going around again. I think that's basically how we decided? Was there a specific part of how we split the work you wanted me to get into?


### q4

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had more work than you could finish.

**Dana:** Oh, um, yeah, more work than I could finish. Okay. So, I think, like, the one that comes to mind is, um, the end of the capstone? Right before the demo? Sorry, let me think. So we had a bunch of stuff still open, like the export feature, and the email reminders for volunteers, and I think the admin page, and, anyway, we had maybe like a week and a half left. And I was kind of, like, panicking a little, to be honest, because I was also still, um, finishing my other classes, and the library shifts, and, yeah. Sorry, I'm going a little fast. I think what we ended up doing was, um, talking to our advisor and figuring out what we actually had to have for the demo? Was there a specific part of that you wanted me to get into?

**Marcus:** Okay. So you talked to your advisor and figured out what had to be there for the demo, how did you actually decide what came first once you had that list?

**Dana:** Um, okay, so, deciding what came first. I think, like, we kind of sorted things into, um, must have and nice to have? Sorry, I'm trying to remember. So the CSV import was obviously a must, because the pantry needed the donation data in there, and the checkout stuff, because that was the whole point of the app. And the export feature, I think we pushed that back? Because, honestly, the pantry coordinator said she could just copy and paste from the screen if she had to. And the email reminders, I think we cut those down to just one reminder instead of, like, a whole schedule. Anyway, I think that's how we did it, but, um, I'm not totally sure if that's the kind of answer you wanted? Sorry, I'm kind of going all over the place again.

**Marcus:** Got it. So you cut the export and trimmed the reminders, who did you actually tell that those things were getting pushed or cut?

**Dana:** Oh, um, who did we tell? Okay, so, I think, like, we told the pantry coordinator first, because she was kind of the main person who'd be using it? Her name's Denise, I think, or, wait, Denise is maybe the one from the food bank side? Sorry, I'm mixing those up. Anyway, we sent her an email, and I think Priya wrote most of it, and then our advisor, Dr. Hale, he sort of signed off on the plan. And I think we also put a note in the README, which, I don't know if anyone actually reads those, but, yeah. Sorry, I'm not sure if that's the kind of communication you meant? Was there like a specific person you wanted me to talk about?

**Marcus:** Right. So Denise got the email, how did she actually react when she heard the export was getting pushed?

**Dana:** Oh, um, Denise. Okay, so, I think she was actually fine about it? Well, I didn't talk to her directly, Priya did most of that, so I'm kind of going off what Priya told me. Um, I think Denise wrote back and said something like, that's okay, she'd rather have the import working right than have a bunch of stuff half done? And then, anyway, she asked if we could do the export later, after the semester, which, I don't know if that ever happened. Sorry, I'm not totally sure I'm answering what you asked. I can tell you more about the email if that's useful?


### q5

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Dana:** Oh, um, a codebase I'd never used. Okay. So, I think, like, the library help desk? Sorry, that's not really a codebase. Um, but the capstone kind of was, because, anyway, I'd never really used Postgres before, I'd mostly done MySQL in a class? And, um, I think Priya was the one who set up the schema, so I was kind of, like, reading her migration files and trying to figure out how everything connected. Sorry, I'm going a little fast. I think I spent like a couple days just, you know, poking around the tables and running queries to see what came back. Was there a specific part of that you wanted me to get into?

**Marcus:** Okay. What was the very first thing you did when you sat down with those migration files?

**Dana:** Um, the very first thing? Okay. I think I just opened all the migration files in, like, tabs? And I started reading them in order, kind of, from the first one, which I guess was the users table, and then the items table, and then the checkouts one. Sorry, I'm not sure that was the smartest way to do it, but that's what I did. And then I wrote down the table names on a sticky note, like, on my monitor, because I kept forgetting which one had the foreign keys. Anyway, I think that's when I started running the little SELECT queries, just to see what the data looked like. Sorry, is that the kind of first step you meant?

**Marcus:** Got it. So after you had the table names on the sticky note and started running those SELECT queries, what was the first actual change you made to the code?

**Dana:** Oh, um, the first change to the code? Okay, so, let me think. I think it was like a small thing, I added a query to the checkout endpoint, or, wait, maybe it was the items list page? Sorry, I'm mixing those up. Anyway, I think I was trying to show the current count next to each item, because the volunteers kept asking what was left, and, yeah, that felt like a safe place to start. Sorry, I'm going kind of around again. I think that's the one, but I'd have to look at the commit history to be sure of the exact order.


### closing

**Marcus:** Right. So you got a working query in there for the item count, that's a real change. Okay, that's everything I wanted to cover today. What questions do you have for me?

**Dana:** Oh, um, yeah, questions. Okay, so, I think, like, one thing I'd really want to know is, um, what the on-call thing looks like for someone in their first six months? Like, is it something you get thrown into right away, or is there kind of a ramp-up? Sorry, I think that's the main one. I'm honestly good after that, I think I'm all set. Thanks so much, Marcus, really. Sorry again for all the rambling.

**Marcus:** No need to apologize, it's a fair question. So for the first six months, you're not on-call at all. The expectation in the JD is that on-call readiness kicks in around that six-month mark, and typically that means you'd shadow someone more senior first, then get added to the rotation gradually. You wouldn't be thrown in cold. Anything else you want to know?

**Dana:** Oh, okay, great, that's really helpful, thanks. Um, no, I think that's it for me, I'm all set. Thanks so much for your time, Marcus, I really appreciate it. Sorry again for all the rambling.

**Marcus:** No need to apologize at all, Dana, it was a good conversation. I'll write up my feedback, and you'll see it on the next screen. Take care.
