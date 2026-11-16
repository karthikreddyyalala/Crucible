# vague-generalist (behavioral, junior)


### warmup

**Marcus:** Hi Tyler, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Tyler:** Hey Marcus, yeah, I'm doing good, thanks for having me. Pretty excited to chat, it's been a busy week but it's all good.


### background

**Marcus:** Good to hear, busy weeks have a way of making the time fly. So, this is a behavioral loop, junior level, so we'll be talking through real situations you've been in, how you thought about them, what you did. Think out loud as you go, I'll dig in where I'm curious, and it's totally fine to ask me to clarify anything. To kick things off, walk me through your background.

**Tyler:** Yeah, sure. So I'm finishing up my info systems degree at Arizona State, graduating in 2026. Over the last couple years I've done a bunch of coursework and some projects, and I did an internship at Halvorsen Logistics last year where I worked on their internal dashboard. I improved its performance, and it went well. I also do hackathons when I can, which is always fun. Mostly I'm looking to get into a role where I can build stuff and learn from people who know what they're doing.


### q1

**Marcus:** The Halvorsen dashboard work sounds like a good place to dig in. So, tell me about a time you had to push through something technically difficult on a project or in a class.

**Tyler:** Yeah, so there was a point where the dashboard was really slow, and I had to figure out why. I worked through it with the team and we used some best practices, and eventually it got a lot better. The team was happy with it, so I'd say it went well.

**Marcus:** Got it. You mentioned the team worked through it together, what did you personally do to track down why it was slow?

**Tyler:** Yeah, so I looked at the stuff that was loading and figured out what was taking the time. I checked a few things and kind of narrowed it down, and then I made some changes to how it pulled data. It was mostly me working through the code with my mentor, and it went well.

**Marcus:** Okay. What actually changed in how it pulled data, like, what specifically did you modify?

**Tyler:** Um, so basically we added some caching. There was one query that was getting run every time the page loaded, and we changed it so it would store the result and reuse it instead of hitting the database again. It made a pretty big difference, honestly. It was kind of a best-practices thing.

**Marcus:** Okay. How much faster did it get, like, do you have a number for that?

**Tyler:** Yeah, um, I think it went from around nine seconds down to maybe three. It was a noticeable difference, and the team was happy with it.


### q2

**Marcus:** Got it, nine seconds down to three. Okay, let's move to something a bit different. Tell me about a time you disagreed with a teammate about a technical approach.

**Tyler:** Hmm, yeah, so I don't know if I'd call it a real disagreement, more like a difference of opinion. There was a point where someone on the team wanted to do something a bit different with how we structured things, and I had some thoughts on it. We talked it through and we used best practices to figure out what made sense, and it went well. I think everyone was pretty happy with where we landed.

**Marcus:** Okay. What exactly were the two approaches on the table?

**Tyler:** Um, so one option was to keep the logic in the existing module, and the other was to split it out into its own piece. I don't remember every detail of the argument, but we went back and forth on it for a bit and then kind of settled on the approach that made the most sense for the team.

**Marcus:** Right. So what was the strongest argument for keeping it in the existing module?

**Tyler:** Hmm, yeah, I think the main thing was that keeping it where it was meant less moving parts. Like, you don't have to introduce a new piece and wire everything together. It was kind of a simplicity thing, and I think that made sense for where we were at the time.

**Marcus:** Right. So when you were going back and forth, what did you actually bring to the conversation to make the case for one side or the other?

**Tyler:** Honestly, mostly I just pointed out the tradeoffs I could see. Like, splitting it out sounds cleaner on paper, but I felt like we'd be adding more to maintain, so I raised that. We kind of talked through it and it made sense to go the way that felt simpler for us right then. I think it went well.


### q3

**Marcus:** Got it. Okay, let's shift gears. Tell me about a time you failed.

**Tyler:** Hmm, yeah, so I'd say there was a time a few months ago where something I shipped didn't go as planned. Nothing huge, but it was a learning thing. I think the main takeaway was that I need to be more careful about checking things before they go out, and I've been trying to use best practices more consistently since then. It worked out in the end, so it went okay.

**Marcus:** Okay. What exactly went wrong, like, what was the thing that didn't work?

**Tyler:** Yeah, so it was a change I pushed to the dashboard, and after it went out, one of the reports didn't show the right numbers for a particular date range. I didn't catch it because I'd only checked the main view, not the edge cases. Someone on the ops side flagged it, and we rolled it back and fixed it.

**Marcus:** Okay. So you caught it after the fact, what did you actually change about how you work after that?

**Tyler:** Yeah, so after that I started checking the edge cases before I push stuff, like date ranges and empty states, not just the main view. I also tried to be more careful about how I test things. I think it's been pretty helpful, honestly, and I've been trying to use best practices more consistently since then.

**Marcus:** Right. So you've changed what you check, how do you know that change actually stuck, like has there been a moment since then where you caught something you would've missed before?

**Tyler:** Hmm, yeah, I think so. I can't really point to one specific moment off the top of my head, but I've been doing it more consistently, and I feel like I'm catching more stuff before it goes out. It's been pretty helpful overall.


### q4

**Marcus:** Okay. Let's move on. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Tyler:** Hmm, yeah, so the Halvorsen internship was kind of like that. I was pretty new to their dashboard codebase, and I had to get up to speed fairly quickly. I leaned on my mentor a lot and read through the code, and I think after a bit it started making sense. It went well.

**Marcus:** Got it. What was the very first thing you did when you sat down with that codebase?

**Tyler:** Honestly, the first thing I did was get it running locally. I cloned the repo and tried to get the dashboard up on my machine, which took a bit because some of the setup docs were out of date. Once I had it running, I clicked around the main pages to see what was what, and then I started reading through the code that handled the reports.

**Marcus:** Got it. So once you were reading through the reports code, how did you figure out which parts actually mattered, like where to focus first?

**Tyler:** Um, yeah, so I mostly followed the path the reports took. Like, I'd look at what the page was calling, and then trace it back to where the data came from. That's where I found the query that was running every time, so that kind of pointed me in the right direction. My mentor also told me which modules were the important ones, so I leaned on that a lot.

**Marcus:** Right. So after tracing that path and finding the query, what was the first actual change you shipped?

**Tyler:** Hmm, yeah, so the first real change was pretty small. I think it was around the caching stuff, the same query we talked about. I added the cache and made sure it still returned the right data, and then my mentor reviewed it before it went out. It went well, and the team was happy with it.


### q5

**Marcus:** Got it. Okay, let's switch gears. Tell me about a time you had more work than you could finish.

**Tyler:** Yeah, so, um, this happened during the semester, I think it was a midterm stretch where I had a project due and a couple exams close together. I had to kind of juggle things and prioritize. I tried to figure out what was most important and what could wait, and I got through most of it. It was busy, but I think it went okay.

**Marcus:** Right. So what was actually on your plate at that point, what were the specific things competing for your time?

**Tyler:** Yeah, so there was a group project for one of my systems classes, plus two exams in the same week, and I also had a hackathon-style assignment I'd said I'd help with. Honestly it was a lot all at once. I mostly just tried to sort out what had the earliest deadline and what I could do with the least amount of time. I got through most of it, so I'd say it went okay.

**Marcus:** Okay. So you sorted by deadline, how did you actually decide what came first when two things had similar deadlines?

**Tyler:** Um, yeah, so mostly I went with whichever one felt more urgent in the moment, I guess. If two things had close deadlines, I'd kind of look at which one would hurt more if I missed it, and then I'd just start on that one. I think it worked out, and I got through most of it.

**Marcus:** Right. So when you say you got through most of it, what actually got dropped or pushed back?

**Tyler:** Hmm, yeah, so the hackathon-style assignment mostly got pushed back. I did the group project and studied for the exams, and I told the person I was helping that I couldn't really give it the time it needed that week. I think it worked out okay in the end.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Tyler:** Yeah, I do have one. Um, what does the on-call rotation look like for new grads? Like, how long before you're actually on it, and how much support do you get when you first start?

**Marcus:** Good question. So the JD mentions on-call readiness after about six months, which is pretty standard, the idea is you get time to ramp up, learn the codebase, and shadow more senior folks before you're actually carrying a pager. When you do go on-call, you'd typically be paired with someone experienced at first, so you're not flying solo on an incident. The exact rotation cadence varies by team, but it's usually not a heavy burden at the junior level. Anything else you want to ask?

**Tyler:** Nah, I think that covers it for me. Thanks, Marcus, I appreciate you taking the time. It was good talking with you.

**Marcus:** Thanks, Tyler, it was good talking with you too. I'll write up my feedback, and you'll see it on the next screen. Take care.
