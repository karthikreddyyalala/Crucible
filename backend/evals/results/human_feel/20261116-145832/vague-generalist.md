# vague-generalist (behavioral, junior)


### warmup

**Marcus:** Hi Tyler, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Tyler:** Hi Marcus, yeah, I'm doing good, thanks for having me. Pretty good day so far.


### background

**Marcus:** Good to hear. So, today we'll be going through some behavioral questions, I'll dig in where I'm curious, and it's totally fine to ask me to clarify anything. Think out loud as you go. Okay, to kick things off, walk me through your background.

**Tyler:** So, I'm finishing up my B.S. in Information Systems at Arizona State, graduating in 2026. Over the last couple of years I've done a bunch of coursework and some projects, and I did an internship at Halvorsen Logistics last year where I worked on their internal dashboard. I also do hackathons when I can. I'm pretty excited to get into software engineering full time, especially on the backend side.


### q1

**Marcus:** The Halvorsen internship sounds like a good place to start. So, tell me about a time you had to push through something technically challenging, a project, a class assignment, anything, where you hit a real wall and had to figure it out.

**Tyler:** Yeah, so at Halvorsen I worked on the internal dashboard, and it was pretty slow. I worked on improving performance and made things faster. We used best practices and the team was happy with it. It went well overall.

**Marcus:** Got it. You mentioned things got faster, faster by how much?

**Tyler:** Honestly, it was a noticeable difference. I don't remember the exact figures off the top of my head, but the dashboard was definitely a lot quicker after I was done.

**Marcus:** Right. So when you say the dashboard got quicker, what was actually causing the slowness in the first place?

**Tyler:** Um, yeah, so I think it was a few things, but mostly it was one main query that was doing a lot of work every time someone loaded the page. I looked into it and kind of tightened things up, and that helped a lot.

**Marcus:** Okay. So when you say you tightened up that query, what did you actually change?

**Tyler:** Yeah, so I added some caching around it, so it wasn't hitting the database every single time someone loaded the page. Like, we stored the result for a bit and reused it. That was the main thing, and it made a pretty big difference.


### q2

**Marcus:** Okay. Let's switch gears, tell me about a time you failed.

**Tyler:** Um, yeah, so a failure... I think one time in a class project we had a group thing, and our part didn't really come together the way we wanted. It was kind of a rough week, but we got it turned in, and I think we learned a lot from it about communication and planning. It went okay overall.

**Marcus:** Okay. What exactly went wrong with that project?

**Tyler:** Um, yeah, so we had a group project and a couple of people were kind of behind on their parts, and we didn't really check in on it until pretty late. So some of the integration stuff was messy at the end. We got it working, though, more or less.

**Marcus:** Right. What was your part in it specifically?

**Tyler:** Um, so I was kind of handling the front-facing piece and some of the coordination stuff. I was doing my part, I guess, but I didn't push the check-ins as hard as I probably should have. So when things started slipping, I wasn't really the one who caught it early.

**Marcus:** Right. So when did you first realize things were actually going sideways?

**Tyler:** Um, I think it was maybe a few days before the deadline, when we were all supposed to merge our stuff and it just wasn't lining up. Like, it wasn't a huge surprise, but it was kind of a "oh no" moment. We ended up staying up pretty late to get it sorted.


### q3

**Marcus:** Got it. Okay, let's move on. Tell me about a time you disagreed with a teammate about a technical approach.

**Tyler:** Yeah, so, um, I think that happened on the hackathon team. We had a couple of different ideas for how to structure the app, and we talked it through. I think we ended up going with a version that the group was more comfortable with, and it worked out pretty well for the demo.

**Marcus:** Okay. What were the two approaches you were each pushing for?

**Tyler:** Um, yeah, so one idea was kind of a more structured setup, like separating the backend into a few services, and the other was just keeping everything in one app to move faster. I was leaning toward, I think, the simpler one, but honestly I don't remember every detail of the back and forth.

**Marcus:** Right. What was the strongest argument for the monolith side, like, what made that option genuinely appealing?

**Tyler:** Um, yeah, so the main thing was speed. With a hackathon you've got like a day or two, and one app means you don't have to worry about how the pieces talk to each other. You can just build and see if it works. I think that was the big argument, that we could get something running for the demo without spending the whole time on setup.

**Marcus:** Right. Who actually made that call in the end?

**Tyler:** Um, I think the group made it together. Like, we kind of talked it through and sort of landed on going with one app. I don't think it was one person deciding, it was more like everybody was kind of nodding along by the end.


### q4

**Marcus:** Got it. Okay, let's move on. Tell me about the most useful critical feedback you've received on your work.

**Tyler:** Um, yeah, so the feedback I remember most was from my manager at Halvorsen. I think she said my code was fine but I should document things better, and that kind of stuck with me. I try to take that to heart now. It was useful, I think.

**Marcus:** Okay. What exactly did she say, like, what was it about your code specifically that she pointed to?

**Tyler:** Um, yeah, so it was kind of a general thing. She said the code itself was fine, but I wasn't really writing enough comments or docs around some of the stuff I built, so someone else would have a harder time picking it up. I don't remember the exact wording, but that was the gist of it.

**Marcus:** Right. So when you heard that, what was your reaction in the moment?

**Tyler:** Honestly, I was kind of surprised at first, because I thought the code was pretty solid. But then I thought about it and realized she was probably right, since I'd been moving fast and didn't always leave notes. So I just started writing more docs as I went, and it's been better since.

**Marcus:** Right. So what did you actually change the following week, like, concretely, what did your docs or comments look like after that?

**Tyler:** Um, yeah, so mostly I started adding short docstrings to the functions I wrote, and leaving a README note for the dashboard piece about how the caching works. Nothing super fancy, just enough that someone could follow it. I don't really have a specific before and after to show you, though. It was more of a general habit thing.


### q5

**Marcus:** Got it. Okay, let's move to something different. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Tyler:** Yeah, so at Halvorsen that was kind of the whole internship, honestly. The dashboard was built on stuff I hadn't really worked with before, so I just dug into it and figured out how things were laid out. I read through the code, asked people questions when I got stuck, and kind of learned as I went. It took a little while to get comfortable, but after a few weeks I was able to start making changes. It went pretty well.

**Marcus:** Okay. What was the very first thing you actually did when you sat down with that codebase?

**Tyler:** Um, yeah, so the first thing I did was kind of just clone the repo and try to get it running locally. That took a bit longer than I expected because of some setup stuff. Once it was up, I clicked around the dashboard to see what pages were slow and what loaded fine, and then I went looking through the code from there.

**Marcus:** Right. How did you actually figure out where in the code to look?

**Tyler:** Um, yeah, so I looked at the page that was slowest and followed the request from there. Like, I'd search for the route or the endpoint name and then trace it down to whatever function was getting called. Once I found the main query, that's where I spent most of my time. I think I also used the logs a little, but honestly it was mostly just clicking through and reading code until something made sense.

**Marcus:** Got it. What was the first actual change you shipped after that?

**Tyler:** Um, yeah, so the first real change was pretty small. I think it was tweaking a filter in that main query so it wasn't pulling back as much data. Nothing huge, but it was my first thing going out, so that was kind of exciting. It went through review and got merged, and I think it helped a little.


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Tyler:** Yeah, I actually do have one. What does the first few months look like for a new grad on the team, especially around the on-call rotation? I'm curious how much shadowing happens before you're handling pages on your own.

**Marcus:** Yeah, that's a common concern for new grads. So the on-call piece, from what I've seen in roles like this, there's usually a ramp period, often around six months, before you're carrying a pager solo. During that time you'd typically shadow someone more senior, maybe co-own an alert or two with them so you're seeing real incidents without being the last line of defense. The expectation is that by the time you're on rotation independently, you've got enough context on the services you own to handle the common failure modes. Anything else you want to ask about?

**Tyler:** Oh, that makes sense, thanks for explaining that. I think that's really helpful to know. No, I think I'm all set, I really appreciate you taking the time today.

**Marcus:** Of course, Tyler, glad it was useful. I'll write up my feedback, and you'll see it on the next screen. Take care.
