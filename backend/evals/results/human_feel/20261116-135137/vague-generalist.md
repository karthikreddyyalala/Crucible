# vague-generalist (behavioral, junior)


### warmup

**Marcus:** Hi Tyler, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Tyler:** Hey Marcus, yeah, I'm doing good, thanks for having me. It's been a busy week, but I'm glad to be here.


### background

**Marcus:** Busy week, I get that. Glad you could make it. So, today we'll be going through some behavioral questions, junior level, and I'll dig in where I'm curious, feel free to ask me to clarify anything. Think out loud as you go. Okay, to kick things off, walk me through your background.

**Tyler:** Sure, so I studied Information Systems at Arizona State, graduating in 2026. During school I did an internship at Halvorsen Logistics in 2025, where I worked on their internal dashboard. I worked on improving performance and made things faster, and it went well. I've also done a few hackathons, which were fun. I'm pretty excited about moving into a software engineering role now.


### q1

**Marcus:** Okay, the Halvorsen dashboard work is a good place to start. Tell me about a time you had to push through a difficult technical problem on your own.

**Tyler:** Yeah, so there was a point where the dashboard was really slow and people kept complaining about it. I looked into it and used some best practices to get it sped up. It took a bit of trial and error, but I got there and the team was happy with it.

**Marcus:** Got it. What did you actually change to speed it up?

**Tyler:** Yeah, I mostly cached some stuff so it wasn't running the same thing over and over. It helped a lot, honestly.

**Marcus:** Okay. How much faster did it get, like, do you have a number?

**Tyler:** Yeah, so the page was pretty slow before, and after the caching change it got a lot better. I think it went from around nine seconds down to about three, so, roughly two-thirds faster.


### q2

**Marcus:** Got it. Okay, let's shift gears. Tell me about a time you failed.

**Tyler:** Yeah, so, um, I'd say the biggest one was during the hackathon. We were trying to get a whole prototype working in one weekend and we didn't really finish what we set out to do. We ran out of time and the demo was kind of rough. I think we learned a lot about scoping, you know, not trying to do too much at once.

**Marcus:** Okay. What exactly went wrong, like, what was the specific thing that caused you to run out of time?

**Tyler:** Um, I think it was mostly that we tried to build too many features at once. We spent a lot of the first day going back and forth on the design, and then the integration stuff took longer than we thought. By Sunday night we were just trying to get something to run.

**Marcus:** Right. So out of all that, the design debates, the integration running long, what was your part specifically?

**Tyler:** Um, I was mostly doing the backend part, like the API stuff and connecting it to the database. I'd say I helped a lot with getting things wired together, and when we hit issues I tried to jump in wherever it was needed.

**Marcus:** Got it. So what did you actually change after that, like, did anything about how you work shift going into the next project?

**Tyler:** Yeah, I think so. I got more careful about scoping things up front, so we don't try to build everything at once. I also try to get the integration stuff going earlier, so we're not finding out at the end that things don't line up. It's kind of become a habit, honestly.


### q3

**Marcus:** Got it. Okay, let's shift to something a bit different. Tell me about a time you disagreed with a teammate about a technical approach.

**Tyler:** Yeah, sure. So, I'd say this happened on the hackathon team too. One of my teammates wanted to build the whole frontend in a framework he'd been using, and I was thinking we should keep it simpler. We talked it through and, um, I think we ended up going with a middle option. It was a good discussion, and I think everyone felt heard.

**Marcus:** Okay. What exactly was their approach, like, what framework did they want to use?

**Tyler:** Um, I think it was React, or maybe Next.js, I don't remember exactly which. He'd used it on a project before, so he wanted to go with that. I was more in favor of just plain HTML and a little bit of vanilla JavaScript, since we only had the weekend. We kind of met in the middle and used something lightweight. It worked out, I think.

**Marcus:** Right. So what was the strongest argument for his side, like, why did React or Next.js actually make sense for what you were building?

**Tyler:** Um, I think his main point was that he already knew it, so we'd move faster, and it would look more polished for the demo. I'd say that was a fair argument. I don't remember all the details of what he said, but he was pretty confident about it.

**Marcus:** Right. So you said you met in the middle, what evidence did you actually bring to that conversation to push for the simpler option?

**Tyler:** Um, I mean, mostly I just said that with only a weekend, the simpler stuff would be less risky. Like, fewer moving parts, so less that could break. I didn't really have like a specific example or anything, it was more of a gut thing, honestly. I think he got that, and we landed on something in between.


### q4

**Marcus:** Got it. Okay, let's move to something else. Tell me about a time you had more work than you could finish.

**Tyler:** Yeah, sure. So, I'd say the busiest stretch was during school, when I had the internship and a couple of classes at the same time. I kind of just tried to keep everything moving and prioritize what was due first. It was a lot, but I got through it, and I think it went pretty well overall.

**Marcus:** Got it. So what was actually on your plate at that point, what were the specific things competing for your time?

**Tyler:** Yeah, so it was mostly the internship at Halvorsen, plus a couple of classes that had projects due around the same time. I'd say the internship was the bigger chunk, since that had the dashboard work. The classes were more like assignments and a group project, and I was juggling deadlines. I kind of just made a list and went down it, honestly.

**Marcus:** Right. So you made a list and went down it, how did you actually decide what came first on that list?

**Tyler:** Honestly, mostly by whatever was due soonest, I guess. If something had a deadline that week, it went to the top. The internship stuff was kind of ongoing, so I'd fit that in around the class deadlines. I didn't have like a formal system or anything, it was more of a gut call each day.

**Marcus:** Right. So with the internship being ongoing and the class deadlines driving the order, what actually got dropped or pushed back?

**Tyler:** Hmm, honestly I don't think anything really got dropped, like, I got everything in on time. Maybe a couple of things got pushed back a little bit, like some of the internship tickets slid to the next week sometimes. But nothing major, I think I managed it pretty well.


### q5

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Tyler:** Yeah, sure. So, I'd say the main time was at Halvorsen when I started on the dashboard. I didn't know their setup at first, so I spent the first week or so just kind of reading through the code and asking people questions. It was a lot to take in, but I got the hang of it pretty quickly, and I think I was able to contribute pretty well after that.

**Marcus:** Okay. What was the very first thing you actually did when you sat down with that codebase?

**Tyler:** Um, the very first thing, I think I just got the app running locally. I pulled the repo and tried to get it to start up, and there were some setup issues, so I asked my manager which environment variables I needed. After that I kind of just clicked around the dashboard to see how the pages worked, and then I started looking at the code behind the page that was slow.

**Marcus:** Right. So once you found the slow page, how did you figure out where in the code the actual problem was?

**Tyler:** Um, so I looked at the page's network calls first, I think in the browser dev tools, and I saw it was hitting the same endpoint a bunch of times. Then I followed that endpoint back to the code, and there was a query that was running over and over for the same data. That's kind of where I found the problem, and that's what I ended up caching.

**Marcus:** Got it. And what actually changed after you added the caching, like, did you measure any difference?

**Tyler:** Yeah, so I checked the page load again after the change, and it went from around nine seconds down to about three. I measured it in the browser, just reloading the page a few times and watching the timing in the dev tools.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Tyler:** Yeah, um, I guess one thing I'm curious about is what the on-call setup looks like for new grads. Like, how much support you get when you first start rotating. That's really it for me, I think I'm all set.

**Marcus:** Yeah, so the JD does mention on-call starting around six months in. In practice for a new grad, you'd typically shadow someone more senior for a while before you're actually on the hook, you're not thrown in alone on day one. The expectation is that you're building familiarity with the systems first, and there's usually a buddy or a rotation lead you can ping. Anything else you wanted to ask?

**Tyler:** Oh, um, no, I think that covers it. That's helpful to know about the shadowing. I'm all set, thanks Marcus.

**Marcus:** Alright, Tyler, thanks for coming in. I'll write up my feedback, and you'll see it on the next screen. Take care.
