# nervous-rambler (behavioral, junior)


### warmup

**Marcus:** Hi Dana, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Dana:** Oh, hi, yeah, um, thanks, I'm good, I think. Sorry, I'm a little nervous, like, I had coffee and then I think it was too much coffee? Anyway, yeah, I'm doing okay, thanks for asking, Marcus. It's nice to meet you. Sorry, I'm going on, where was I?


### background

**Marcus:** Ha, no need to apologize, a little coffee nerves are pretty normal. You're doing fine. So, today we'll go through some behavioral questions, things like situations you've been in, decisions you've made, how you've worked through problems. I'll dig in where I'm curious, and it's totally fine to ask me to clarify anything. Okay, so, walk me through your background.

**Dana:** Um, okay, yeah, background. So I'm, I guess, I'm finishing my CS degree at University of Houston, I graduate this year, 2026, which is like, weirdly soon? Anyway, I, um, started out as like a pre-something major, I don't even remember, and then I took like an intro programming class and I was like, oh, this is actually fun, so I switched. And then there was the capstone, which is like the big senior project thing, and, well, first our team had to pick a project, and I think the first idea was like a whole social app which, no, that was not gonna happen, so we ended up doing an inventory thing for the campus food pantry. Sorry, I'm going on. Oh, and I also work part-time at the library help desk, which is mostly resetting passwords, honestly, so, yeah. Sorry, that was kind of all over the place.


### q1

**Marcus:** The food pantry project, okay. So, walk me through a time you had to figure out something technical on your own, without much guidance from anyone else.

**Dana:** Um, okay, yeah, figuring stuff out on my own. So, I think, like, the big one was on the pantry project, and it was, well, we had this thing where the volunteers would log donations, and the counts were just wrong all the time? Like, off by a bunch. And nobody on the team really knew why, and our TA was kind of like, figure it out, you guys are the engineers, which, sure? Anyway, so I started looking at, I think it was the Postgres queries, and then I also remembered that the React form was sending stuff twice sometimes, maybe, I'm not totally sure, sorry, I'm going on. Where was I? Oh, the counts. Yeah, so I kind of just started adding console logs everywhere, which is probably not the most professional thing, but it worked, kind of.

**Marcus:** Okay. So you started digging into the queries and noticed the form was maybe sending twice, what did you actually find when you looked?

**Dana:** Um, okay, so, yeah, what I found. So, I think, like, the form had this submit button, and if you clicked it and it was kind of slow, like on the library wifi, which is terrible, you could click it again? And then it would just, like, add the donation twice. Sorry, I'm going on. And I think the console logs showed the same request going out two times, like, within a second or so? And then, well, the backend just inserted both, because there wasn't anything checking for duplicates. Anyway, that was kind of the main thing, but I'm honestly not sure if that was all of it, because some of the counts were off in other ways too, like, I think it was a rounding thing? Or maybe the query was joining something wrong? I didn't totally finish that part, sorry.

**Marcus:** Got it. So the double-submit was the main thing you pinned down. What actually happened after you found it, did you fix it?

**Dana:** Um, yeah, so, after I found the double submit thing, I, I think I, like, disabled the button after you clicked it? So it would grey out and you couldn't click it again. Sorry, is that what you meant by fix? Anyway, I think that helped with most of it, but, um, my teammate Priya said we should also check on the backend, like, add some kind of request ID or something so the server could tell it's the same donation, and I kind of didn't get to that part before the deadline? Sorry, I'm going on. I think we just, we kind of crossed our fingers on the backend, honestly. Which I know is not ideal.


### q2

**Marcus:** Got it. So you disabled the button on the front end, and the backend piece didn't get done before the deadline. Okay, let's move to something different. Tell me about a time you failed.

**Dana:** Um, okay, a time I failed. Yeah, so, I think, like, the one that comes to mind is actually in my library job? Well, not really a failure exactly, but, um, I once reset somebody's password, and I think I reset the wrong account, because there were two people with really similar names, like, Jessica Brown and Jessica Browne? Anyway, so she got locked out of her own account, and she was really upset, and I had to, like, go fix it with my supervisor, and it was kind of embarrassing. Sorry, I'm going on. Oh, and I think that's when I started double checking the student ID before I do anything, which, yeah, I guess is a good lesson? Sorry, that was kind of a weird example, I'm not sure if that's what you were looking for.

**Marcus:** Okay. So she got locked out and you had to go fix it with your supervisor, what exactly was your part in that? Like, how did the mix-up happen on your end?

**Dana:** Um, okay, so, my part. I think I just, like, searched her name in the system and there were two results that looked almost the same, and I was kind of in a hurry because the line was long? So I clicked the first one that came up, and I didn't really look at the email or the student ID, which, yeah, I should have. Sorry, I'm going on. And then I hit reset and it was done, and I didn't realize it was the wrong one until she came back to the desk, like, twenty minutes later? Anyway, my supervisor helped me fix it and we, I think we had to verify her identity again, and yeah, it was just a whole thing. Sorry, I think I got a little lost there.

**Marcus:** Right. So you started double-checking the student ID after that, how do you know that change actually stuck? Like, did a similar situation come up again where you caught it?

**Dana:** Um, yeah, so, I think so? I mean, I haven't had like a huge situation since, but there was one time, I think a couple weeks after, where two people had the same last name and the same first initial, and, um, I actually stopped and checked the email before I hit reset. Sorry, I'm going on. And my supervisor kind of noticed and said something nice about it, which was, yeah, nice? Anyway, I guess that's how I know it stuck, maybe? I don't know if that's a real answer, sorry.


### q3

**Marcus:** Got it. Okay, you mentioned the Campus Food Pantry earlier, and Priya suggested adding a backend check that you two disagreed on. Tell me about a time you disagreed with a teammate about a technical approach on that project.

**Dana:** Um, okay, yeah, disagreeing with a teammate. So, I think, like, the closest one was with Priya, but I wouldn't say we really disagreed? Well, maybe a little. So, um, when we were talking about the backend check, she wanted to add a request ID to every donation, and I was kind of like, can't we just disable the button and be done? Which, looking back, is not a great answer. Sorry, I'm going on. And I think the TA was kind of, like, both of you have a point? Anyway, we ended up just not doing it because of the deadline, so I don't know if I really won or lost, honestly. Sorry, that's kind of a weird answer, I'm not sure if that's what you were looking for.

**Marcus:** Okay. So you mentioned Priya's idea, adding a request ID on the backend, what was the strongest argument for her side, as you saw it?

**Dana:** Um, okay, the strongest argument for Priya's side. So, I think, like, the button thing only works if the person clicks it once and waits, right? But if the page reloads, or somebody has two tabs open, or the request just gets retried by the browser, the button doesn't help at all. And the server is the one that actually writes to the database, so if it could tell that two requests were the same donation, it would catch all of those cases. Sorry, I'm going on. I think she was basically saying the check should live where the data actually gets saved, not just on the screen. Which, yeah, now that I say it out loud, she was kind of right. I just didn't really want to deal with it at the time, honestly.

**Marcus:** Right. So you two never actually resolved it before the deadline, what did you personally bring to that conversation to try to move it forward?

**Dana:** Um, okay, what I brought to it. So, honestly, not a lot? I think I mostly just said the button thing was good enough, which, yeah, is what I said before. Sorry, I'm going on. I guess I didn't really, like, propose anything or suggest we test it or anything, I just kind of wanted to be done with it because we had like three other things due that week. Anyway, looking back I should have maybe said, let's just try both and see what's easier, or asked the TA to weigh in sooner? Sorry, I think I'm just kind of rambling now. I know that's not a great answer.


### q4

**Marcus:** Got it. So the deadline made the call for you both, in the end. Okay, let's move to something different. Tell me about a time you had to become productive fast in a codebase or technology you'd never used before.

**Dana:** Um, okay, yeah, getting productive fast in something new. So, I think, like, the one that comes to mind is, well, the React part of the pantry project? Because I'd really only done like, a little bit of it in class, and our team lead, I mean, Priya kind of, like, took the front end, and then at some point she was out for a few days and I had to, like, touch the form stuff. Sorry, I'm going on. And I remember just opening the files and kind of, I don't know, clicking around and console logging everything, which, yeah, I already said that. Anyway, I think it took me a while, maybe like two days? Honestly I don't know if that's fast, sorry.

**Marcus:** Okay. What was the very first thing you actually did when you opened those files?

**Dana:** Um, okay, the very first thing. So, I think I opened the main form component, the one with the submit button? And I kind of scrolled through it, and I didn't really understand the state stuff at first, like, there was a bunch of useState and useEffect and I was like, what is even happening here? Sorry, I'm going on. So I think I just started putting console logs in the submit handler, because that was the part I actually understood, which, yeah, is maybe why I kept coming back to the console logs. Anyway, that's the first thing, I think.

**Marcus:** Got it. So you were working through the state hooks by tracing the submit handler. How did you figure out which parts of the code actually mattered for what you needed to change?

**Dana:** Um, okay, which parts mattered. So, I think, like, I mostly just followed the submit handler, because that's where the button was, and then whatever it called, I kind of followed that too? Sorry, I'm going on. Like, there was a function that built the donation object, and then a fetch call, and I figured if I could see what got sent, I'd know what was wrong. Anyway, I didn't really understand the useEffect stuff until later, honestly, like, I think Priya explained it to me when she got back? Sorry, I think I'm kind of rambling. Was that the kind of thing you were asking about?

**Marcus:** Right. So after all that tracing, what was the actual change you ended up making to those files?

**Dana:** Um, okay, the actual change. So, I think, like, the main one was the button thing? Like, I added a disabled state, so when you click submit it sets it to true, and then it goes back to false after the request finishes. Sorry, I'm going on. I think I also added a little loading text on the button, so people would know something was happening, which, honestly, was kind of my favorite part? Anyway, I didn't touch the backend at all, so the server could still get the same request twice if it really wanted to. Sorry, I think that's the answer, I'm not sure if that's specific enough.


### q5

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had more work than you could finish.

**Dana:** Um, okay, more work than I could finish. So, yeah, I think the one that comes to mind is like the last week of the capstone? Because we had, I think, three things due that week, like the final report, the demo, and then a code review thing for the TA? Sorry, I'm going on. And I kind of, like, panicked a little, and I think I spent most of Monday just making a list, which, I know, is not really doing the work. Anyway, I think I ended up focusing on the demo because it was the thing people would actually see, and I kind of let the report get a little rushed. Sorry, is that what you were asking? I feel like I'm not really answering it.

**Marcus:** Okay. So you decided to focus on the demo, how did you actually decide that was the right call over the report?

**Dana:** Um, okay, how I decided. So, I think, like, I kind of just looked at which one would be worse to lose? Because the demo was like, the whole team was going to be standing there, and if it broke in front of the TA it would be really bad, and the report, I mean, you can kind of fix a report later, right? Sorry, I'm going on. I think Priya said something similar, that we should do the demo first, so maybe that was just like, we agreed on it? Anyway, I'm not sure if that was a super good reason, honestly. Sorry, is that what you were asking?

**Marcus:** Got it. So the demo got the focus, what actually happened to the report?

**Dana:** Um, okay, the report. So, yeah, it kind of got rushed, like, I think I finished the main sections on Wednesday night? And then the part about the testing and the database design was, well, pretty thin, honestly. Sorry, I'm going on. I think we got a decent grade on it, but my teammate Priya was not thrilled about the testing section, and I don't blame her? Anyway, I think that was kind of the cost of the whole thing, the report just wasn't as good as it could have been. Sorry, was that the kind of answer you wanted?

**Marcus:** Right. So Priya wasn't thrilled, did you actually tell her ahead of time that the testing section was going to be thin, or did she find out when she read it?

**Dana:** Um, okay, so, did I tell her ahead of time? I, I don't think I really did, no? I mean, I think I said something like, the report's kind of coming together, in like a group chat, which, looking back, is not really telling her anything. Sorry, I'm going on. So I think she kind of found out when she read the draft Wednesday night, and she was like, Dana, the testing section is basically empty, and I was like, yeah, I know, sorry. Anyway, I should have just said it straight out earlier, I think, so she could have, like, helped or split it up differently? Sorry, that's probably what you were asking, right?


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Dana:** Oh, um, yeah, sure. So, I guess, I was wondering, like, what does the first few months look like for a new grad on the team? Like, is there someone who kind of checks in with you, or is it more, you know, figure it out? Sorry, I'm going on. Um, but yeah, that's really it, I think I'm all set. Thanks so much for your time, Marcus.

**Marcus:** No need to apologize, it's a fair question. So, the first few months are usually pretty structured: you'd have a buddy or a more senior engineer who checks in with you regularly, helps you get oriented in the codebase, and reviews your early PRs. It's not sink-or-swim. You'd be picking up smaller, well-scoped tasks at first, and the expectation is that you're asking questions, not already knowing everything. Anything else you wanted to ask?

**Dana:** Oh, um, yeah, that's really helpful, thanks. No, I think that's, um, that answers it? Sorry, I think I'm all set. Thanks so much for your time, Marcus. I really appreciate it.

**Marcus:** Of course, Dana. I'll write up my feedback, you'll see it on the next screen. Take care.
