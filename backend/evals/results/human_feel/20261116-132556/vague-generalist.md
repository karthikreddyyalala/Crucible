# vague-generalist (behavioral, junior)


### warmup

**Marcus:** Hi Tyler, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Tyler:** Hi Marcus, yeah, I'm doing good, thanks for having me. Pretty excited about the opportunity. It's been a busy week, but I'm good.


### background

**Marcus:** Glad to hear it, busy weeks are kind of the norm around here, so you'll fit right in. We'll be going through some behavioral questions today, junior level, so think out loud as you go, I'll dig in where I'm curious, and it's totally fine to ask me to clarify anything. To kick things off, walk me through your background.

**Tyler:** So yeah, I'm finishing my B.S. in Information Systems at Arizona State, graduating in 2026. During school I got into software stuff pretty seriously. I did an internship last year at Halvorsen Logistics where I worked on their internal dashboard. I mostly improved its performance and made things faster, and it went well. I also do hackathons when I can, which is a lot of fun. I'm really interested in backend work, so this role seemed like a good fit.


### q1

**Marcus:** The dashboard performance work at Halvorsen, okay. Let's get into some behavioral questions. Walk me through a time you had to debug a tricky problem in a project or codebase, what was going on, and how did you work through it?

**Tyler:** Yeah, so there was a time at Halvorsen where the dashboard was pretty slow, and we had to figure out why. I looked into it and we used some best practices, and eventually it got a lot better. The team was happy with the result, so it went well.

**Marcus:** Okay, so the dashboard was slow. Walk me through what you personally did to figure out where the slowness was coming from.

**Tyler:** Um, yeah, so I looked at the page and kind of saw what was taking a while to load. I checked some of the queries and tried a few things, and I ended up caching one of them, which helped a lot. I mostly just went through it step by step until it was better.

**Marcus:** Okay, you cached one of the queries. What made you land on that specific query to cache, versus the others you looked at?

**Tyler:** Umm, yeah, so I mean it was kind of the one that seemed like the biggest problem. It was getting hit a lot, and it was pretty slow, so caching it seemed like the obvious thing to try. I think I just went with what made the most sense at the time.


### q2

**Marcus:** Okay, hit a lot, slow query, caching it. Got it. Let's move to something different. Tell me about a time you failed.

**Tyler:** Hmm, yeah, so there was a time during a hackathon where things didn't go the way we planned. We were trying to get a lot done in a short window, and we ran into some issues near the end. We didn't finish everything we wanted, but I think we learned a lot from it, and it was still a good experience overall.

**Marcus:** Okay, hackathon, ran out of time. What exactly went wrong there?

**Tyler:** Um, yeah, so we had a few parts we wanted to build and we kind of underestimated how long things would take. Near the end we were trying to get everything to connect and it just didn't work the way we expected, so we had to cut some stuff. It was more of a time management thing, I think.

**Marcus:** Okay, time management, things didn't connect. What was your part in that specifically, separate from the rest of the team?

**Tyler:** Um, yeah, so I was mostly working on the front end and some of the API calls, and I think I was the one who was supposed to wire those up to the backend. I didn't really set up the integration early, so I kind of waited until the end to test it, and that's where things got messy. I mean, I was trying to help where I could, but I could have probably flagged the risk sooner.

**Marcus:** Okay, waited until the end to test the integration. What did you actually change after that, in how you work?

**Tyler:** Honestly, I think I've gotten a bit better about testing earlier. Like, I try to not leave everything for the end, and I'm more careful about checking in with the team when something's uncertain. It's been a good lesson.


### q3

**Marcus:** Okay, so you flagged the risk late, tested integration at the end. Let's move to something a bit different. Tell me about a time you disagreed with a teammate about a technical approach.

**Tyler:** Yeah, so there was a situation at Halvorsen where a teammate and I saw the problem differently. I think we just kind of talked it through and we used best practices to figure out the better option. It was a good conversation, and in the end we went with a solution that worked for everyone, so it went well.

**Marcus:** Okay. What exactly were the two approaches on the table, what were you each proposing?

**Tyler:** Umm, yeah, so I think one option was to handle it more on the client side, and the other was to do more of it in the backend query. My teammate was leaning toward the backend approach, and I was kind of more into the client side, just because it seemed simpler at the time. We talked through it and eventually we went with the backend approach, I think it was the better call.

**Marcus:** Okay, so you ended up going with the backend approach. What was the strongest argument your teammate made for that side?

**Tyler:** Umm, yeah, so I think their main point was that doing it in the backend query would keep the data handling in one place, so the client wouldn't have to deal with all the extra logic. I think they also mentioned it would be easier to keep consistent if more than one screen used the same data. I didn't push back too hard on it, honestly. It made sense.

**Marcus:** Okay. So you both talked it through and landed on the backend approach, who actually made the final call on that?

**Tyler:** Umm, I think it was kind of a group decision, but my teammate was the one who really pushed for it. Our lead was kind of in the loop too, I think. I didn't really make the final call myself, I just went along with it.


### q4

**Marcus:** Got it, you went along with it, didn't push the final call yourself. Okay, let's move to something different. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Tyler:** Umm, yeah, so the one that comes to mind is at Halvorsen. The dashboard codebase was pretty new to me, and I had to get up to speed on it fairly quickly. I read through some of the code, asked a few people questions, and kind of just dug in until I understood how things were put together. It took a little while, but I got there and was able to start making changes, so it went okay.

**Marcus:** Okay. What was the very first thing you did when you sat down with that codebase?

**Tyler:** Umm, yeah, so the first thing I did was kind of look at the overall structure, like the folders and how things were laid out. Then I tried to run it locally so I could see the dashboard working. I think after that I just started poking around the parts I'd been assigned, and it kind of went from there.

**Marcus:** Okay, so you ran it locally, then started poking at the parts you'd been assigned. How did you figure out where the important code actually lived in those folders?

**Tyler:** Umm, yeah, so I mostly just followed the trail from the dashboard page. I'd click through the UI and kind of see which component was rendering what, and then I'd search the repo for the names I was seeing. That usually led me to the right files, and then I'd read through them and ask my mentor when something didn't make sense.

**Marcus:** Okay, following the UI trail to find the files, then asking your mentor when something didn't make sense. What was the first actual change you shipped in that codebase?

**Tyler:** Umm, yeah, so the first real change I made was pretty small, I think it was tweaking one of the components so it displayed some data a bit differently. Nothing huge. It got reviewed and merged, and it went fine.


### q5

**Marcus:** Okay, tweaked a component, got it reviewed and merged. Let's move to something different. Tell me about a time you had more work than you could finish.

**Tyler:** Umm, yeah, so the one that comes to mind is during finals last semester. I had a couple of projects due in the same week, plus a bit of the dashboard work still going on at the internship, so things piled up pretty fast. I tried to just stay on top of it and kind of prioritize, and I got most of it done, I think. It was a lot, but I managed it.

**Marcus:** Okay, finals plus the dashboard work at the same time. How did you decide what to tackle first?

**Tyler:** Umm, yeah, so I mostly went with whichever thing had the closest deadline. If something was due sooner, I did that first. Like, I'd look at what was due tomorrow and handle that, and then kind of work down the list. I think it was more about the deadlines than anything else.

**Marcus:** Okay, deadline order. So when you were working down that list, was there anything you actually had to drop or push back, or did everything make it?

**Tyler:** Umm, yeah, so I think I did end up dropping something, kind of. There was one of the smaller class assignments that I didn't really finish all the way. I turned in a partial version and just hoped it would be enough. I didn't really talk to the professor about it beforehand, I just kind of let it be what it was.

**Marcus:** Okay, turned in a partial and left it there. Did you let anyone know ahead of time that it wasn't going to be complete, or did you just submit and see what happened?

**Tyler:** Umm, yeah, so I didn't really let anyone know ahead of time. I just submitted what I had and kind of hoped it would be okay. I probably should have reached out to the professor, but I didn't.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Tyler:** Yeah, I do have one question. What does a typical week look like for someone on the team, like how much of it is new feature work versus maintenance or on-call stuff?

**Marcus:** Yeah, that's a fair thing to want to know. Honestly, it shifts week to week, but in a typical week I'd say a good chunk is feature work, probably more than half, and then there's a mix of bug fixes, code review, and some maintenance. On-call ramps up after about six months, and when you're on rotation it can pull focus, but it's not constant. The team tries to keep it manageable. Anything else you want to ask about?

**Tyler:** Nah, I think that covers it for me. Thanks, Marcus, I appreciate you walking me through that. I'm all set.

**Marcus:** Okay, Tyler, thanks for coming in. I'll write up my feedback, and you'll see it on the next screen. Take care.
