# nervous-rambler (behavioral, junior)


### warmup

**Marcus:** Hi Dana, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Dana:** Oh, hi Marcus, thanks, yeah, I'm doing okay, I think? Um, I'm a little nervous, sorry, I always get like this in interviews. I had a whole coffee thing before, which, probably not the best idea, but anyway, I'm good. Thanks for having me, and sorry if I ramble, I kind of do that.


### background

**Marcus:** Hey, no need to apologize, nerves are totally normal, and the coffee thing, I get it. We'll just talk through some things together. So this is a behavioral loop, junior level, and I'll mostly be asking about situations you've been in, what you did, how you thought about it. Think out loud as you go, and if anything I ask is unclear, just say so. Okay, to get us started, can you walk me through your background?

**Dana:** Um, yeah, sure, so, my background. Okay so I'm Dana, I graduated from University of Houston, that was like, this past spring, computer science. Well, technically I think the degree is dated 2026? Anyway, it's computer science, a B.S. And, um, I did a lot of, like, classes, there was this one data structures class that was kind of brutal, honestly, but I liked it? And then, oh, my capstone, which was kind of the big thing, so my team of four, we built this inventory app for the campus food pantry. It was React on the front, and Node, and Postgres for the database. I did a lot of the backend stuff, I think, or, well, we all kind of did everything, but I was the one who kept touching the database schema, so, yeah.

Oh and I also work part time at the library, on the IT help desk, which is, like, mostly password resets, honestly, but it's been good, I've learned a lot about how people get frustrated with computers. Sorry, I'm going on. Was there a specific part you wanted me to focus on?


### q1

**Marcus:** The food pantry app, okay. So let's get into some specific situations. Tell me about a time you had to work through a disagreement with a teammate or someone you were collaborating with.

**Dana:** Oh, um, yeah, a disagreement. Okay, so, there was, I think it was like, mid-semester? Maybe a little after midterms, I don't know. So we were deciding how to do the inventory counts, like, whether we should track each item as its own row or just keep a quantity column. And, well, one of my teammates, Jordan, really wanted the quantity thing because it was simpler for the front end, and I was like, hmm, but what happens when the same item comes in from two different donation drives? Anyway, I kind of got stuck on that, and I think I got a little too into it in the group chat, which, yeah, not my best moment.

Sorry, I'm going on. Where was I? Oh, the database part. So I wrote this long message about it, and I think I kind of went around in circles, and then honestly we ended up talking on a call, and I think we sort of landed on a mix? Like a quantity column but with a separate table for the donation batches? I'm not totally sure who came up with that part, probably both of us, I don't really remember.

Sorry, that's kind of a vague answer, I know.

**Marcus:** Okay. You mentioned you're not sure who came up with the final schema, what was the specific call you made in that conversation?

**Dana:** Um, okay, so, the call I made... I think I was the one who pushed for the batches table? Or, well, I suggested we keep the quantity column for the total, because Jordan had a point that the front end needed it, and then I said we should have a donations table with, like, each drive and the count it brought in. So the total is kind of a sum of the batches? I think that's right. Sorry, I'm not totally sure I'm explaining it well. Did you want me to say more about how we handled it after the call, or the part about the group chat?

**Marcus:** Got it. Did the schema hold up once you started building?

**Dana:** Um, yeah, mostly? So, I think it held up pretty well for the basic stuff, like adding donations and showing totals on the front end. But then there was this one part where, uh, we had to handle when a donation got edited or deleted, and the quantity column could get out of sync with the batches if you didn't update both. So, like, we ended up writing a function in Node that did both in one transaction, which I think was the right call? Anyway, I kind of wish we'd thought about that earlier, but I also don't really know if there was a cleaner way. Sorry, is that the kind of thing you wanted, or did you want the part about testing it?


### q2

**Marcus:** Got it, the transaction wrapper. Okay, let's shift gears. Tell me about a time you failed.

**Dana:** Um, a time I failed. Okay, so, yeah, there's, uh, there's kind of a few, honestly. I think the one that comes to mind first was like, during the capstone, we had a demo coming up for the pantry staff, and I was supposed to have the donation import working, like a CSV upload, and I kind of told the team it was basically done. But it wasn't, it really wasn't. I had it working with my own test file, which was like, perfectly formatted, and I didn't try it with the messy spreadsheets the pantry actually uses. Anyway, two days before the demo I found out the dates were in like three different formats and it just crashed.

So, um, yeah, we ended up staying up pretty late, and I think Jordan ended up fixing a lot of the parsing, which, I felt kind of bad about. Sorry, I'm going on. Do you want me to say what I changed after that, or the part about how I told the team?

**Marcus:** Okay. So Jordan ended up doing a lot of the fixing, what was your part in getting it to that point, like, what did you actually do those two days?

**Dana:** Um, okay, so, those two days. Honestly, the first day I kind of panicked a little? I spent like, most of it trying to figure out the date thing, I was looking at the CSVs and I think I wrote a regex for the dates, but it was, like, really messy, and it broke on one of the formats, so I kind of went in circles on that. Then I think it was like the second night, I was really tired, and I, um, I ended up sending Jordan the sample files and saying hey, can you look at the parser? Which, yeah, I know that's not great. He's the one who actually restructured it so it tried each date format in order, and he wrote the tests for it. I did the front end error message, I think, so when an upload failed it would say which row was the problem, and I also wrote down the list of formats we'd seen so we'd know what to support. Sorry, that's kind of a lot of side stuff. I think the main thing I did was the error message and the list, and I wish I'd just asked for help on day one instead of trying to fix it alone.

**Marcus:** Right. So you mentioned you wish you'd asked for help on day one instead of going in circles, what did you actually change after this, like, in how you work?

**Dana:** Um, yeah, so, after that... I think I changed a couple things? Like, the big one was I started, um, testing stuff with real data earlier. Like, I don't just use my own perfect test files anymore, I try to find the messiest version of whatever I'm building first. And I think I also told my team, like, a little earlier when I'm stuck? Not like, hey I'm drowning, but more like, hey, I've been on this for like an hour and it's not clicking, can someone look at it with me.

Sorry, is that the kind of answer you wanted? I feel like I'm kind of all over the place. I think the testing one is the real one, though. I actually wrote a little checklist for myself, but honestly I don't know if I'd call that a change so much as just, like, a note on my phone.

**Marcus:** Right. So you mentioned testing with real data earlier and flagging when you're stuck, how do you know either of those actually stuck?

**Dana:** Um, that's a good question, I think? So, honestly, I don't really have a great way of knowing, like, a rule. I guess the feeling is when I've been staring at the same thing for like an hour and I'm just kind of rereading the same lines and not getting anywhere. Anyway, I've been trying to notice that feeling earlier. The problem is I'm not always great at noticing it, which is probably why it took the demo thing to make me realize. Sorry, is that what you were getting at, or did you mean more like how I decide what counts as real data?


### q3

**Marcus:** Got it. Okay, let's shift to something a bit different. Tell me about a time you disagreed with a teammate about a technical approach.

**Dana:** Um, yeah, okay, so a disagreement about a technical approach... I feel like I already kind of told you one, with Jordan and the schema? But I guess that was more of a, like, a back and forth. Hmm. Okay, so there was also, like, the question of whether to use an ORM or just write the raw SQL queries for the backend. I think I wanted to use an ORM because I'd seen it in a tutorial and it looked really clean, and one of the other teammates, I think his name was Kevin, or no, sorry, Kevin was on a different project, it was Marcus, no, that's you, sorry, um, it was Ryan, I think, he said raw SQL was better because we'd learn more about Postgres. Anyway, we kind of went back and forth for a while, and I think we ended up doing raw SQL for most things and the ORM for, like, the migrations? I'm not totally sure that's how it was decided, honestly. Sorry, I'm going on. Did you want me to say more about how it played out, or should I keep going with the other example?

**Marcus:** Okay. So you went back and forth on ORM versus raw SQL, what was the strongest argument Ryan made for doing it raw?

**Dana:** Um, okay, so Ryan's main thing, I think, was that if we used the ORM for everything, we'd never really see what the database was actually doing? Like, we'd just be calling functions and not know why a query was slow or why we needed an index. And he said that for a class project, learning Postgres was kind of the point, which, yeah, I didn't really have an answer to that. Anyway, I think he also said something about the joins for the inventory totals, that the ORM would make them kind of hard to read? I'm not totally sure I remember that one right, sorry. Um, do you want me to say more about how we split it up after that, or is that enough on Ryan?

**Marcus:** Right. So you heard Ryan out and it sounds like his reasoning landed with you. What did you actually bring to that conversation, was there anything you put in front of the team to make the case for the ORM?

**Dana:** Um, yeah, so, what did I bring... I mean, I didn't really have like a formal case? I just said I'd seen it in a tutorial and it looked clean, which, honestly, is not a great argument. I think I was kind of hoping it would be easier to write, like less boilerplate, and I maybe didn't think about the debugging side at all until Ryan said it. Anyway, I did end up going and reading a bit about how the ORM generates queries, and that's kind of when I got why he was worried. Sorry, that's a little embarrassing. Is that what you were asking, or did you want the part about how we split up the queries?

**Marcus:** Right. So you went and read up on how the ORM generates queries, and that shifted your thinking. Who actually made the final call on splitting it the way you did?

**Dana:** Um, so, the final call... I don't think there was one person, honestly? I think it kind of just happened on a call, like, Ryan said raw for the queries, I said okay, and then someone, maybe me, maybe Jordan, said we could just use the ORM for migrations since that part was kind of boilerplate anyway. And everyone was like, yeah, sure. I don't really remember who said it first. Sorry, I know that's not a super clear answer.


### q4

**Marcus:** Got it. Okay, let's move to something different. Tell me about the most useful critical feedback you've received on your work.

**Dana:** Um, okay, the most useful feedback... so, there's, um, there was this one from my professor, Dr. Hensley? For the data structures class, no, wait, that was a different one. Sorry. I think it was in the capstone, after the demo, actually. Ryan, or maybe Jordan, I don't really remember which of them said it, but basically they said my commit messages were, like, just "fix stuff" and "more changes," and that when they came back to the code later they couldn't figure out why I'd changed the transaction thing. Anyway, that kind of stuck with me, because I did not think about that at all. Sorry, I'm going on. Do you want me to say what I did about it, or is that not really the kind of feedback you meant?

**Marcus:** Okay?

**Dana:** Oh, sorry, um, yeah, I think I kind of went off on a tangent there. So, the feedback thing, yeah, I think what I did about it was I started writing actual commit messages? Like, it's a line for what changed and then a line for why, if it's not obvious. Which sounds really basic, I know. And I think I went back and cleaned up the transaction function's commit history too, but honestly I'm not sure that helped anyone. Sorry, is that what you were looking for, or did you want the part about the professor? I can never remember which feedback is which.

**Marcus:** Okay. So you changed how you write commit messages, how do you know that change actually stuck?

**Dana:** Um, that's a good question, I think? So, honestly, I don't really have a super clear way of knowing. I guess the best sign is, like, I look back at my last few commits and they actually say why, and I haven't gotten that "fix stuff" feeling when I look at my own history. Anyway, I did look at the repo for the capstone the other day, just to see, and the recent stuff from me was better, I think? But that's only like a couple weeks of commits, so I don't know if it's really stuck or if I'm just still being careful because I know someone's going to look. Sorry, is that what you meant, or did you want me to talk about how I'd check with a teammate?


### q5

**Marcus:** Right. So you're not totally sure yet whether it's a real habit or just being careful while it's fresh, that's an honest read. Okay, let's move to something different. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Dana:** Um, okay, yeah, a time I had to get up to speed fast... so, I think the big one was when I joined the library help desk? Well, that's not really a codebase, it's more like the ticketing system and all the, like, the account stuff. But I guess that's kind of close? Hmm. Actually no, wait, I think the better one is the capstone, because the team had picked Postgres and I'd only used SQLite before, in like one class. So I had to figure out things like, um, the differences in how types work and how the connection pooling was set up. Anyway, I think it took me like a week to feel okay with it? Sorry, I'm going on. Do you want me to say more about the Postgres part, or the help desk one?

**Marcus:** Got it, the Postgres one. What was the very first thing you did when you realized you needed to get up to speed on it?

**Dana:** Um, the very first thing... honestly I think I just opened the Postgres docs? Like, I went to the page on data types, because I'd already kind of noticed that some of the stuff I'd written for SQLite wasn't working, like the way it handled dates and booleans was different. So I was kind of reading and then trying things in the psql shell, just like, running little queries to see what happened. Anyway, I think I spent a whole evening just doing that. Sorry, is that the kind of thing you meant, or did you want the part about the connection pooling?

**Marcus:** Okay. So you were reading and experimenting in the shell, what was the first actual change you shipped to the project after that?

**Dana:** Um, the first actual change I shipped... okay, so I think it was like a fix to the date handling? Because the SQLite stuff I'd written was storing dates as strings, and in Postgres that just, like, didn't behave the same way when we filtered by them. So I changed the column to a proper timestamp type and updated the queries that were comparing dates. I think it was a pretty small PR, honestly, but Ryan had to review it, and I think he asked me why I hadn't caught that earlier? Which, yeah, fair. Sorry, I'm going on. Did you want me to say more about the review, or was that the kind of change you meant?


### closing

**Marcus:** Got it. Okay, that's everything I wanted to cover today. What questions do you have for me?

**Dana:** Oh, um, yeah, sure, I do have one. Like, what does the first few months look like for someone starting on the team? Like, is there a lot of pairing, or do you kind of get thrown into tickets on your own? Sorry, that's kind of a generic question. But yeah, that's it for me, I think I'm all set. Thanks so much for your time, Marcus.

**Marcus:** No need to apologize, it's a fair thing to want to know. Honestly, the first few months are usually a mix of both. You'd pair with someone on the team for the early tickets, get familiar with the codebase and the review process, and then gradually take on more independently as you find your footing. On-call and bigger design work come later, once you've got some context. Anything else you want to ask?

**Dana:** Oh, um, great, that actually helps, thanks. No, I think that's it for me. I'm all set. Thanks so much for your time today, Marcus, and sorry again for all the rambling.

**Marcus:** No need to apologize at all, Dana, it was a good conversation. I'll write up my feedback, and you'll see it on the next screen. Take care.
