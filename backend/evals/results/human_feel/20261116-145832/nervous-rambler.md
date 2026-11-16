# nervous-rambler (behavioral, junior)


### warmup

**Marcus:** Hi Dana, I'm Marcus. I'm one of the engineers on the team. Thanks for making the time today. Before we dive in, how are you doing?

**Dana:** Oh, hi, yeah, thanks for having me. Um, I'm doing okay, I think? I was kind of nervous about the bus, because there was this detour, and I almost didn't, like, make it, so I was running a little late but I'm here now, so, yeah. Sorry, I'm kind of all over the place today. I've been up since like six, anyway, because I kept rereading my notes, which was maybe not the best idea, but yeah. How are you doing?


### background

**Marcus:** Ha, yeah, bus detours are the worst, glad you made it. I'm doing well, thanks for asking. Don't worry about being all over the place, that's what the first few minutes are for. So, today we'll be going through some behavioral questions, things about situations you've been in, decisions you've made, that kind of thing. Think out loud as you go, and feel free to ask me to clarify anything. Okay, so, walk me through your background.

**Dana:** Oh, yeah, sure. Um, so I'm Dana, I graduated, well, I'm graduating, it's 2026, from the University of Houston, computer science. Which, I mean, I always kind of knew I wanted to do something with computers, like since high school, I did this robotics thing, and I think that's kind of where it started? Anyway, so in college I did the usual classes, and then in my last year we had this capstone project, which was for the campus food pantry, so like an inventory app, and I think it was React and Node and Postgres, and there were four of us on the team, and, sorry, I'm kind of going all over. Oh, and I also work part-time at the library helping with IT stuff, like the help desk, printers and passwords mostly. So yeah, that's basically me.


### q1

**Marcus:** The food pantry app, okay. So let's get into it. Walk me through a time you had to figure something out on your own, without much guidance, what was the situation?

**Dana:** Oh, um, yeah, okay. So, I think the one that comes to mind is the capstone, which, I mean, everything kind of runs together with that project. So there was this part where the database queries for the inventory counts were getting really slow, like, the page would take a while to load, and our team lead was kind of out for a couple weeks, I think it was like family stuff, so, um, it was mostly me and one other person looking at it. Sorry, I'm going kind of in circles. Do you want me to start with what the problem was, or, like, what we tried?

**Marcus:** No, that's fine, start wherever it's clearest for you. What was the actual problem with those queries?

**Dana:** Um, okay, so the problem was, like, the inventory count page would just hang, you know? Like you'd click on it and then you'd sort of stare at the spinner for maybe ten seconds, sometimes more. And we had this query that was pulling every single transaction ever and then counting them up in the Node code, which, looking back, yeah, that was not great. I think we had like no indexes on the transactions table either, so Postgres was basically reading the whole thing every time. Anyway, that's kind of what it was. Sorry, do you want me to keep going on what we did about it, or, um, was that the main thing?

**Marcus:** Got it. What did you actually do to fix it?

**Dana:** Um, okay, so, I, well, first I kind of just, like, tried to figure out what was slow? I think I added some logging with timestamps around the query, which, I don't know if that's the right way to do it, but it showed the count part was taking almost all the time. Then I looked up how to do the count in Postgres instead of in Node, so I wrote a query that does a GROUP BY on the item ID and sums the quantity, and I think I added an index on the item ID column, and, yeah, the page got way faster. Like, it went from the spinner for ten seconds to, I want to say under a second? I didn't really measure it super carefully, sorry. Anyway, my teammate was kind of skeptical at first, so we ran it a few times with some test data and it seemed fine. Is that, um, the kind of thing you wanted to hear?


### q2

**Marcus:** Got it. Okay, let's shift gears. Tell me about a time you failed.

**Dana:** Oh, um, failed. Yeah, okay. I mean, there's, like, a few things, but the one that kind of comes to mind is, um, also from the capstone? Sorry, everything is from the capstone, I know. So, early on we had this plan where we'd build the whole backend first and then do the frontend, and I was kind of in charge of the API stuff, and I think I just didn't really talk to the frontend people enough about what the endpoints would look like. So we ended up building stuff that didn't match up, and, like, a couple weeks got kind of wasted on rework. Anyway, I felt really bad about it, and I think it was kind of my fault, but my teammate said it was more the plan, which, I don't know. Do you want me to talk about what I did after that, or, um, is that the kind of failure you meant?

**Marcus:** Okay. When did you first realize something was off?

**Dana:** Um, okay, so I think it was like week three? Or maybe week four, it's kind of blurry now. We had this standup thing, which, I mean, we weren't really doing standups, more like a group chat check-in, and one of the frontend people, I want to say his name was Tyler, posted that he was trying to hit an endpoint and getting a 404, and I kind of just, like, looked at it and went, oh no. Because I had named the route one thing in my head and another thing in the code, and I never wrote it down anywhere. Sorry, that's kind of a lot of detail. Anyway, yeah, that's when I realized, I think.

**Marcus:** Got it. What did you actually change about how you worked after that, like, concretely?

**Dana:** Um, okay, so concretely, yeah. I think the biggest thing was we started writing the endpoints down in a shared doc before anybody coded anything. Like, method, route, what goes in, what comes back. I kind of did that for my part first, and then I asked Tyler to look at it, which was kind of awkward at first because I didn't want to bug him, but he was actually really nice about it.

And then, um, I also started, like, pinging the frontend people when I changed anything, even small stuff. Which, I don't know if that's the right amount, because sometimes it was probably a lot. Sorry, I think I'm repeating myself. Anyway, after that we didn't have another 404 situation, at least not from my side. I think the rework still happened for the first two weeks, so that part was already done, but yeah.


### q3

**Marcus:** Right. So the shared doc and the pings, and no more 404s on your side after that. Okay, let's move to something related. You mentioned the capstone a few times, so I'll stay there. Tell me about a time you disagreed with a teammate about a technical approach on that project.

**Dana:** Oh, um, yeah, okay. So, a disagreement. I mean, we didn't really fight or anything, it was more like, um, a little back and forth? I think it was about whether we should use an ORM or just write raw SQL for the database stuff. My teammate, I think his name was Marcus, no wait, that's you, sorry, um, the other guy on the team, he wanted to use like Sequelize, and I kind of wanted to just write the SQL directly because I felt like I understood what was happening more that way. Anyway, sorry, do you want me to talk about how we decided, or like what the actual tradeoffs were? I don't want to ramble too much.

**Marcus:** Got it. What was the strongest argument he made for going with the ORM?

**Dana:** Oh, um, yeah, so his main thing was, like, we had a pretty tight timeline, and Sequelize would handle the migrations and the model stuff, so we wouldn't have to write all the boilerplate for every table. And I think he also said it'd make it easier for the next people who worked on the project, because they wouldn't have to know raw SQL to change things. Which, I mean, that's a fair point, I guess? Sorry, I kind of wanted to say the thing about the queries too, because the inventory count stuff was kind of the reason I was pushing for raw SQL, and then, well, anyway, that's a whole other thing. Did you want the part about how we ended up deciding, or...?

**Marcus:** Right. So what did you actually bring to the table to push back, like, did you test anything, write something up, or was it more just talking it through?

**Dana:** Um, okay, so, honestly it was mostly just talking it through? Sorry. I didn't really write anything up, which, looking back, I probably should have. But I kind of had the query thing already, from the slow count stuff, so I think I just said, like, look, the ORM might be fine for the boilerplate, but for the inventory counts I'd want to write the GROUP BY myself, so we don't end up pulling every transaction into Node again. Anyway, I think I was kind of worried that I'd sound like I didn't know what I was talking about, so I didn't push super hard. Um, do you want me to say how we ended up deciding? I think we did a little of both, but I'm not totally sure I remember who came up with that.

**Marcus:** Okay. Who actually made that call?

**Dana:** Um, I think it was kind of a group thing? Like, we talked about it in the group chat and then we had a call, and I think the team lead, the one who was out for the family stuff, he had already said earlier that we could use whatever made the timeline work, so maybe that's who made it, or maybe the other guy just kind of decided and we went along? Sorry, I honestly don't remember exactly. I know we ended up using Sequelize for most of the tables, and I wrote the inventory count query as raw SQL, so kind of both. I'm sorry, I know that's not a clean answer.


### q4

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had more work than you could finish.

**Dana:** Oh, um, yeah, okay. So, more work than I could finish. I mean, honestly, that's kind of most of the semester? Sorry. But the one that comes to mind is, um, the last few weeks of the capstone, because we had the final presentation and the report and also the app had to actually work for the demo, and I was like, oh no. So I think I was doing the API stuff and also some of the tests, and, well, the tests were kind of supposed to be somebody else's job but nobody was really doing them, so I kind of just... started doing them? Anyway, I think I was staying up really late. Do you want me to talk about how I figured out what to drop, or, um, was it more about the timeline?

**Marcus:** Okay. What did you actually decide to tackle first?

**Dana:** Um, okay, so first I kind of made a list, well, a messy list on the back of a printout, which, I don't know if that counts. The demo was the thing that had to work no matter what, so I think I put that at the top. So, like, the stuff that the demo actually touched, the inventory page and the login, I did those first. Then the tests, which, I mean, I wanted to do them because I didn't want to just have no tests at all, but I kind of let some of the less important ones go. Sorry, I think I'm going around the same point. Anyway, I think that's what I tackled first, the demo stuff, and then the rest kind of fell into place, or, well, sort of.

**Marcus:** Got it. Who did you tell about that, if anyone?

**Dana:** Um, yeah, so, I think I told my teammate? Like, I posted in the group chat that I was going to focus on the demo stuff first and that I'd probably skip some of the lower priority tests, so nobody would be surprised. Sorry, I'm not sure if that's what you meant, or if you wanted like, my professor, or... I don't think I told the professor directly, I think he just kind of saw it in the standup thing? Anyway, yeah, the teammate, I think. Sorry.

**Marcus:** Right. What actually happened to those, did they stay unfinished, or did someone pick them up later?

**Dana:** Um, yeah, so, I think some of them stayed unfinished? Like, the login tests I did, and the inventory ones I did, but there were maybe three or four of the lower priority ones that just didn't get written. Sorry. And then, I think, after the demo, my teammate, the one who was skeptical about the queries, he kind of went back and wrote a couple of them? I'm not totally sure which ones, because I didn't really look at the repo after that. Anyway, I think that's what happened. Is that, um, what you were asking?


### q5

**Marcus:** Got it. Okay, let's move on. Tell me about a time you had to become productive fast in a codebase or technology you'd never used.

**Dana:** Oh, um, yeah, okay. So, a new codebase. I mean, the library help desk kind of counts? Sorry, that's not really a codebase. But the one that comes to mind is, um, at the start of the capstone, because I'd never really done React before, I'd mostly done like Python stuff in class, and the frontend people were already kind of deep into it. So I think I just, like, watched some videos over a weekend and then kind of started poking around the components, and, yeah, it was a lot of trial and error? Anyway, do you want me to say how I got up to speed, or, um, was it more about the first week?

**Marcus:** Okay. What was the very first thing you actually did when you sat down with that React code?

**Dana:** Um, okay, the very first thing, so, I think I just ran it? Like I cloned the repo and tried to get it running locally, which took, like, way longer than it should have, because I had the wrong Node version, and I didn't really know that was a thing I could check. Sorry. Anyway, once it was running I kind of just clicked around the inventory page and opened the dev tools, the network tab, and watched what requests it was making, because I figured that would show me how the pieces talked to each other. Which, I don't know if that's, like, the normal way to do it? But that's what I did. Sorry, do you want me to talk about the components after that, or was the setup part what you were asking about?

**Marcus:** Right. How did that help you figure out where the important code actually lived?

**Dana:** Oh, um, yeah, so the network tab thing kind of helped because, like, when I saw the inventory page calling a certain endpoint, I could search the frontend code for that URL string, and that would usually take me to the component that made the call. Sorry, I think I was kind of doing that by accident at first. Anyway, it was like, the request shows up, then I grep for the route, then I'm in the component, and then I could follow the props from there. I think that's how I figured out where the inventory data actually came from, but, um, I'm not sure that's the, like, professional way to do it? Sorry, I'm kind of rambling again.

**Marcus:** Got it. When did you actually ask someone for help?

**Dana:** Oh, um, yeah, okay. So asking for help. I mean, I didn't really want to, honestly, which is kind of a problem I know. But I think the main time was with the Node version thing? Like, I spent maybe a whole evening on that, and I finally just posted in the group chat, like, hey, does anyone know why my install is failing, and Tyler responded pretty fast and was like, oh, check your node version, and that was it. Sorry, that's kind of embarrassing, it was such a small thing. Anyway, I think after that I was a little more willing to ask, but, um, I still felt bad about bugging people, so I don't know if I did it as much as I should have. Sorry, is that the kind of answer you were looking for?


### closing

**Marcus:** Okay. That's everything I wanted to cover. What questions do you have for me?

**Dana:** Oh, um, yeah, sure. I think, um, one question I had was, like, what does a typical week look like for someone in the first few months? Like, is it mostly writing code, or is there a lot of meetings and stuff? Sorry, I'm not sure that's a great question. But yeah, that's really the main one. Oh, and I think I'm all set otherwise, thanks so much for your time today.

**Marcus:** No, that's a fair question, don't apologize for it. Honestly, the first few months are pretty code-heavy. You'd be ramping up on the codebase, pairing with someone on the team, and picking up smaller tickets to start. There are some team syncs and maybe a sprint ceremony or two, but it's not meeting-heavy at that stage. Anything else you want to know?

**Dana:** Oh, um, thanks, that helps a lot. Sorry, I think I'm all set though. I don't have anything else I wanted to ask. Thanks again for your time today, I really appreciate it.

**Marcus:** Of course, Dana. I'll write up my feedback, you'll see it on the next screen. Take care.
