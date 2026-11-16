# vague-generalist (behavioral, junior)


### warmup

**Marcus:** Hi Tyler, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Tyler:** Hi Marcus, yeah, I'm doing good, thanks for having me. Pretty good day so far.


### background

**Marcus:** Good to hear. So, today we'll be going through some behavioral questions, I'll ask about real situations you've been in, and I'll dig in where I'm curious. Think out loud, and feel free to ask me to clarify anything. Okay, to kick things off, walk me through your background.

**Tyler:** Sure, so I just finished my B.S. in Information Systems at Arizona State, graduating in 2026. During school I did an internship at Halvorsen Logistics last year, mostly working on their internal dashboard. I worked on improving performance and made things faster, and it went well. I also got into a few hackathons, which were fun. Mostly I've been trying to get better at building backend stuff and writing solid code.


### q1

**Marcus:** Halvorsen dashboard, okay. Let's get into the behavioral side of things. Tell me about a time you had to debug a tricky problem in code you didn't write.

**Tyler:** Yeah, so there was a time at Halvorsen where the dashboard was super slow and I had to figure out why. It wasn't code I wrote, it was older stuff. I looked into it and we used some best practices to get it sorted out, and the team was happy with how it turned out.

**Marcus:** Got it. You mentioned 'best practices', what specifically did you change in the code to make it faster?

**Tyler:** Yeah, so it was mostly one query that was running every time the page loaded. I ended up caching the results so it wasn't hitting the database each time, and that made a big difference.

**Marcus:** Okay. How much faster did it get, like, what did you actually measure?

**Tyler:** Um, yeah, it got a lot faster. I think it went from pretty slow to way better, so that was good.

**Marcus:** Right. 'A lot faster', do you have a number there, like a load time before and after?

**Tyler:** Yeah, so it was about nine seconds before, and after the caching it came down to around three.


### q2

**Marcus:** Got it, nine seconds to three. Okay, let's move to something different. Tell me about a time you failed.

**Tyler:** Hmm, yeah, so there was a time during the hackathon where we didn't quite finish what we set out to do. We had a lot going on and I think we tried to do too much at once. It was a learning thing, I guess. We kind of pivoted near the end and the team was pretty understanding about it.

**Marcus:** Okay. What exactly went wrong, like, what was the specific thing that didn't get finished?

**Tyler:** Um, so we were building a small web app for the hackathon, like a scheduling tool, and we had the front end and the back end both planned out. We got the front end mostly done, but the back end didn't really get finished. We kind of ran out of time and had to cut some stuff down at the end.

**Marcus:** Got it. What was your part in that specifically?

**Tyler:** Um, I was mostly on the back end, so I was working on the API and the database part. I had some of the endpoints written but not all of them, and I kind of ran out of time on the rest.

**Marcus:** Right. What did you actually change afterwards, like, how do you work differently now because of that?

**Tyler:** Honestly, I think I've gotten better about not overcommitting. Like, I try to scope things down earlier and be realistic about what I can get done in the time I have. I also try to flag it sooner if I'm falling behind, instead of waiting until the last minute. It's more of a general habit thing, I guess.


### q3

**Marcus:** Right. Okay, let's move on. Tell me about a time you disagreed with a teammate about a technical approach.

**Tyler:** Yeah, so, um, this was also during the hackathon, I think. We had a couple of different ideas on how to set up the data stuff, and we kind of talked it through. I think we ended up going with a approach that made sense for the time we had, and everybody was pretty much on board by the end. It was a good discussion, I think.

**Marcus:** Okay. What exactly were the two approaches on the table?

**Tyler:** Um, so one person wanted to use a relational database, like Postgres, and I was kind of leaning toward just storing things in a simpler JSON file setup, since we were on a tight timeline. We talked through the tradeoffs for a bit, and we ended up going with the database, mostly because it would be easier to work with later on.

**Marcus:** Okay. What was the strongest argument for going with Postgres, like, what was the best case for their side?

**Tyler:** Hmm, yeah, I think the main thing was that it would be easier to scale later and keep the data organized. Like, if we wanted to add more features after the hackathon, having an actual schema would make that less of a headache. The other person kind of made a good point that JSON files can get messy fast, so I kind of came around to it.

**Marcus:** Got it. So who actually made the final call to go with Postgres?

**Tyler:** Hmm, I think we kind of landed on it together? Like, nobody really pulled rank or anything. The other person had made the case pretty well, so when we talked it through, we just agreed that Postgres made more sense. I don't think it was one person's call, it was more of a group thing.


### q4

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had more work than you could finish.

**Tyler:** Yeah, so, um, this was pretty much the hackathon again, honestly. We had a bunch of stuff on the list and I was trying to get through it all over the weekend. I think I just kind of prioritized the stuff that seemed important and worked through it as best I could. Some things got pushed to the end, and we ended up cutting a few things. It was a lot, but I think I managed it okay.

**Marcus:** Okay. What was actually on your plate that weekend, like, what were the specific things competing for your time?

**Tyler:** Um, yeah, so I was on the back end, so it was mostly the API endpoints and the database setup. There were like five or six endpoints I needed, plus getting the Postgres schema set up, and then some auth stuff that kind of came up late. I think I got through the schema and a couple endpoints first, and then the rest just kind of piled up.

**Marcus:** Got it. How did you actually decide what to tackle first?

**Tyler:** Um, yeah, so I kind of went with what seemed most important. The schema had to be done first, because everything else depended on it, so that was the first thing. After that I think I just went with the endpoints that the front end was waiting on the most. I didn't really write it down or anything, it was more of a gut feeling in the moment, I guess.

**Marcus:** Right. What actually got dropped or pushed?

**Tyler:** So the stuff that got dropped was mostly the auth piece, and then a couple of the endpoints that were lower on the list. Auth came up late, and by then I was kind of out of runway. We ended up doing a basic version with less going on than we originally wanted, and the front end just had to work around the missing pieces.


### q5

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Tyler:** Yeah, so, um, the Halvorsen internship was kind of like that at the start. I hadn't really worked with their setup before, so there was a lot to get up to speed on. I spent the first week or so just reading through the code and asking people questions, and then I started picking up smaller tickets. It got easier after that, I think.

**Marcus:** Okay. What was the very first thing you did when you sat down with that codebase?

**Tyler:** Um, yeah, so the first thing I did was just get the project running on my machine. I think I cloned the repo and tried to get the dev environment set up, which took a bit longer than I expected because some of the dependencies were out of date. After that I kind of just poked around the folders to see how things were laid out.

**Marcus:** Got it. How did you figure out where the important code actually lived?

**Tyler:** Um, yeah, so mostly I just followed the dashboard page. I'd look at what the page was calling, then trace it back to the route or the view, and from there find the query or the service it was using. Some of the folder names were kind of confusing at first, so I'd ask my mentor when I got stuck. It was a lot of clicking around, honestly, but after a few days it started to make sense.

**Marcus:** Right. So after all that, what was the first actual change you shipped?

**Tyler:** Um, yeah, so the first real change was a small ticket on the dashboard. I think it was fixing a filter that wasn't showing the right results for one of the date ranges. It was pretty small, but I got it through review and it got merged, so that felt good.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Tyler:** Yeah, I do have one. What does the first few months look like for a new grad on the team, like how soon would I be on call, and is there a mentor assigned?

**Marcus:** Good questions. So, on-call, the JD mentions around six months before you'd be expected to join the rotation, which is pretty standard. That gives you time to get comfortable with the systems first. As for mentorship, most teams at this level pair new grads with a more senior engineer, at least informally, though the structure varies. You'd likely have someone to go to with questions day-to-day. Anything else you want to know?

**Tyler:** Nah, I think that covers it for me. Thanks, Marcus, I appreciate you taking the time. I'm all set.

**Marcus:** Alright, Tyler, thanks for coming in. I'll write up my feedback, and you'll see it on the next screen. Take care.
