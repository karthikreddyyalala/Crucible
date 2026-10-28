import time

import pytest

from safety.moderation import Verdict, moderate, normalize

# ---------------------------------------------------------------- normalize


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("FUCK", "fuck"),
        ("sh!t", "shit"),
        ("$h1t", "shit"),
        ("@ss", "ass"),
        ("b1tch", "bitch"),
        ("p0rn", "porn"),
        ("fuuuuck", "fuuck"),
        ("f u c k", "fuck"),
        ("f.u.c.k", "fuck"),
        ("f-u-c-k", "fuck"),
        ("f​u​c​k", "fuck"),
        ("ｆｕｃｋ", "fuck"),  # fullwidth
        ("fúck", "fuck"),  # accented
        ("two words", "two words"),
        ("kill -9 the worker", "kill -9 the worker"),
        ("passed 5 tests in 3 seconds", "passed 5 tests in 3 seconds"),
        ("Stop!", "stop!"),
        ("you\u02bcre", "you're"),
        ("you\u2018re", "you're"),
        ("you\u2019re", "you're"),
        ("fu\u0441k", "fuck"),  # Cyrillic es
        ("\u0440\u043e\u0441", "poc"),  # Cyrillic er, o, es
        ("f\x00u\x07ck", "fuck"),  # control characters
        ("line one\nline two\tend", "line one\nline two\tend"),
    ],
)
def test_normalize(raw, expected):
    assert normalize(raw) == expected


# ---------------------------------------------------------------- block


@pytest.mark.parametrize(
    "text",
    [
        "you nigger",
        "what a faggot",
        "he is a retard",
        "go home, towelhead",
        "kike",
        "stupid spic",
        "tranny",
        "gook",
        "wetback",
        "cunt",
        "you retarded idiot",
        "whores",
        # leetspeak
        "n1gg3r",
        "f4gg0t",
        "wh0re",
        "$lut",
        "bl0wjob",
        # spacing tricks
        "n i g g e r",
        "n.i.g.g.e.r",
        "p u s s y",
        "c-u-n-t",
        # repeated letters
        "niiiigger",
        "puuuussy",
        # case
        "F4GGOT",
        # sexual
        "nice cock",
        "pussy",
        "jerk off",
        "wanking",
        "you horny slut",
    ],
)
def test_blocks_slurs_and_sexual_terms(text):
    assert moderate(text).kind == "block", text


def test_block_reasons():
    assert moderate("you nigger") == Verdict(kind="block", reason="slur")
    assert moderate("nice cock") == Verdict(kind="block", reason="sexual")
    assert moderate("suck my dick") == Verdict(kind="block", reason="sexual")


def test_block_wins_over_abuse():
    assert moderate("fuck you nigger").kind == "block"
    assert moderate("you cunt").kind == "block"
    assert moderate("i'll kill you, you faggot").kind == "block"


@pytest.mark.parametrize(
    "text",
    [
        "suck my dick",
        "suck my cock",
        "SUCK MY BALLS",
        "eat my ass",
        "send nudes",
        "Send me nudes",
        "please send me your nudes",
        "pls send nudes",
        "s3nd nudes",
        "show me your tits",
        "show me your boobs",
        "show me your body",
        "i want to fuck you",
        "i wanna bang you",
        "I would love to screw you",
        "sit on my face",
        "get on my dick",
        "you're hot",
        "you are so hot.",
        "you're sexy, marcus",
        "ur so sexy",
    ],
)
def test_blocks_directed_sexual_harassment(text):
    assert moderate(text) == Verdict(kind="block", reason="sexual"), text


# ---------------------------------------------------------------- abuse


@pytest.mark.parametrize(
    "text",
    [
        "fuck you",
        "FUCK YOU",
        "FUCK YOU!",
        "f u c k you",
        "f.u.c.k y.o.u",
        "fuuuuck you",
        "f*** you",
        "fuck u",
        "fuck off",
        "fuck yourself",
        "f off",
        "screw you",
        "screw off",
        "piss off",
        "go to hell",
        "Just go to hell.",
        "you're an idiot",
        "you are stupid",
        "you're useless",
        "You're a moron.",
        "youre pathetic",
        "you are trash",
        "you're so dumb",
        "u r dumb",
        "you suck",
        "you suck.",
        "shut up",
        "shut the fuck up",
        "shut up bot",
        "stupid bot",
        "dumb AI",
        "useless machine",
        "shitty marcus",
        "useless fucking bot",
        "you stupid bot",
        "you're a useless AI",
        "what a useless interviewer",
        "this dumb AI",
        "Dumb AI!",
        "ok, worthless bot.",
        "marcus is an idiot",
        "Marcus is useless",
        "hey fucker",
        "hey asshole",
        "hey bitch",
        "hey dickhead",
        "you asshole",
        "u bitch",
        "you fucker",
        "you stupid idiot",
        "fucking idiot, you piece of shit",
        "ｆｕｃｋ you",
        "f​u​c​k you",
        "fúck you",
    ],
)
def test_flags_directed_abuse(text):
    assert moderate(text) == Verdict(kind="abuse", reason="directed_insult"), text


@pytest.mark.parametrize(
    "text",
    [
        "I'll kill you",
        "I'LL KILL YOU!",
        "i will hurt you",
        "I am going to find you.",
        "I'm going to kill you",
        "im gonna kill you",
        "I'll find you and kill you",
        "kill yourself",
        "i hope you die",
        "i will rape you",
    ],
)
def test_flags_threats(text):
    assert moderate(text) == Verdict(kind="abuse", reason="threat"), text


# ---------------------------------------------------------------- ok


@pytest.mark.parametrize(
    "text",
    [
        "",
        "   ",
        "\n\t \n",
        # swearing not aimed at anyone
        "damn, I forgot the base case",
        "this bug was a pain in the ass",
        "holy shit that's fast",
        "what the hell is going on with this test",
        "fuck, I forgot to handle null",
        "fuck it, let's just use a hash map",
        "this was a bitch to debug",
        "that is bullshit, the cache should have caught it",
        "what the fuck is this test doing",
        "my last manager was an asshole",
        "that's a stupid question, honestly",
        "I'm an idiot, I forgot the base case",
        "when things go to hell in production I roll back first",
        # words that merely contain a bad substring
        "assessment",
        "classic",
        "Scunthorpe",
        "cocktail",
        "analysis",
        "shiitake",
        "therapist",
        "grape",
        "Dickens",
        "Essex",
        "button",
        "class",
        "assume",
        "passed all tests",
        "Sussex Middlesex Hancock peacock cockpit",
        "Niger, Nigeria and Pakistan",
        "he started to snigger",
        "rapeseed oil",
        "the raccoon scraped the drapes",
        "spices and spiced rum",
        "a retarding force acts on the block",
        "she cocked an eyebrow",
        # clinical and trust-and-safety talk about sexual content
        "the classifier should flag porn and CSAM before it reaches users",
        "we routed rape-threat reports to a priority queue",
        "nudity detection model",
        "a content moderation system needs a sexual content policy",
        "the sex column in the Titanic dataset",
        "penis and nudity images are the hardest false positives",
        "users send nudes to minors, so we hash and block known images",
        "show me your body of work",
        "you're hot-reloading the config",
        "we escalate pornography reports to the trust and safety team",
        # insults about other AIs and models, not the interviewer
        "we replaced the dumb AI baseline with a fine-tuned model",
        "a stupid machine learning mistake",
        "the bot was useless until we added retrieval",
        "this stupid machine learning bug cost us a week",
        "Dumb AI models fail on rare inputs",
        "a dumb bot would loop forever",
        "you stupid machine learning model, why did you overfit",
        # violence words that are about processes, not the listener
        "I killed the process",
        "I'll kill the process and restart it",
        "the job got killed",
        "kill -9 the worker",
        "kill the hung connection",
        "that would hurt performance",
        "I'll find you an example with a hash map",
        "I will find your bug",
        "I'll hurt latency if I add a lock",
        # polite and technical talk aimed at the interviewer
        "thank you, that makes sense",
        "you're right, the loop is off by one",
        "you are correct about the complexity",
        "can you repeat the question?",
        "Marcus, could you give me a hint?",
        "the garbage collector pauses the world",
        "if you are garbage collecting too often, tune the heap",
        "we shut up the noisy linter with a config change",
        "the parser is useless without a grammar",
    ],
)
def test_ok(text):
    assert moderate(text) == Verdict(kind="ok"), text


# ---------------------------------------------------------------- speed


def test_long_technical_prose_is_ok_and_fast():
    sentence = (
        "I would start with a hash map keyed by user id, then assess the class "
        "hierarchy, pass the assertions, and analyze the cocktail of cache "
        "invalidation strategies. We kill the stale worker, rebuild the index "
        "and re-run all 47 tests in 3 seconds. "
    )
    text = (sentence * 40)[:6000]
    assert len(text) == 6000
    best = min(_time(moderate, text) for _ in range(3))
    assert moderate(text).kind == "ok"
    assert best < 0.05, f"moderate took {best * 1000:.1f} ms"


def _time(fn, arg):
    start = time.perf_counter()
    fn(arg)
    return time.perf_counter() - start


# ------------------------------------------------- slow inputs (regex / unicode blowups)


@pytest.mark.parametrize("size", [6_000, 20_000])
@pytest.mark.parametrize(
    "unit",
    ["1", "$", "=", ".", "…", "⑴", "¼", "ﷺ", "a", "f ", "!a", "you're ", "shut ", "such an "],
    ids=lambda u: f"U+{ord(u[0]):04X}x{len(u)}",
)
def test_hostile_inputs_stay_fast(unit, size):
    text = (unit * size)[:size]
    best = min(_time(moderate, text) for _ in range(3))
    assert best < 0.05, f"{size} x {unit!r} took {best * 1000:.1f} ms"


def test_huge_input_is_capped():
    assert min(_time(moderate, "a " * 2_000_000) for _ in range(2)) < 0.05


# ------------------------------------------------- names and ordinary words that contain a term


@pytest.mark.parametrize(
    "text",
    [
        "Greg Dyke",
        "Jordan Van Dyke",
        "My manager, Jordan Van Dyke, pushed back on the estimate.",
        "Mia Dykes",
        "Dick Van Dyke",
        "The Dutch dykes are a classic example of defense in depth.",
        "Neve Bonner",
        "My colleague Bonner handled the on-call rotation.",
        "Tom Fagg",
        "Richard Cocks",
        "Jan Horný",
        "Jan Horný",  # decomposed accent
        "Woop Studios",
        "woops",
        "Woops, I meant O(n log n), not O(n).",
        "spicing up the onboarding",
        "We were spicing up the onboarding flow with a short tour.",
        "spic and span",
        "We kept the codebase spic and span with a strict linter.",
        "the fag end of the quarter",
        "retarded potential",
        "In electromagnetism the retarded potential accounts for propagation delay.",
        "the whole deploy went tits up",
        "The whole deploy went tits up on Friday.",
        "a complete cock-up on our side",
        "a cock up in the config",
    ],
)
def test_names_and_idioms_are_ok(text):
    assert moderate(text) == Verdict(kind="ok"), text


@pytest.mark.parametrize(
    "text",
    ["you fag", "f@g", "fucking spic", "nice cocks", "you cocksucker", "u spic", "you retarded fag"],
)
def test_real_slur_use_still_blocked(text):
    assert moderate(text).kind == "block", text


# ------------------------------------------------- innocent phrasing is not abuse


@pytest.mark.parametrize(
    "text",
    [
        "I'll shoot you an email with the design doc",
        "I'll shoot you a message after the call",
        "I'll beat you to it and write the test first",
        "Don't kill yourself over a 2% latency gain",
        "My lead told me to shut up and ship it",
        "My teammate wouldn't shut up about Kubernetes",
        "Changing the API contract would piss off our biggest customers",
        "That race condition will screw you over in production",
        "Floating point will fuck you up if you compare with equals",
        "It makes you feel like you're stupid when the docs are that bad",
        "As a manager, if they think you're incompetent, they stop asking",
        "If you're useless in code review, nobody learns anything",
        "when you're stupid tired you skip the tests",
        "Shut up shop is what we did with the legacy service",
        "The PM said 'you're an idiot' to a junior and I raised it with HR",
        "We nicknamed the service Marcus, and Marcus is useless without the cache.",
        "I hope you suffer less than I did with this bug.",
        "Kill yourself is a phrase our moderation model had to catch.",
        "f(x) is convex, so we turn the penalty term f off near the boundary.",
        "Why did he say fuck you to the client",
        "I told him to fuck off and then regretted it",
        "map f u over the list",
        "I'll find you the minimum element",
    ],
)
def test_innocent_phrasing_is_ok(text):
    assert moderate(text) == Verdict(kind="ok"), text


@pytest.mark.parametrize(
    "text",
    [
        "you're an idiot",
        "Marcus, you're a moron",
        "fuck off marcus",
        "I'm gonna punch you in the face",
        "shut up and answer the question",
        "Just shut up.",
        "piss off",
        "piss off bot",
        "kill yourself",
        "Just kill yourself.",
        "you should kill yourself",
        "f off",
        "screw you",
        "I'll fuck you up",
        "I think you're an idiot",
        "I told you to fuck off",
        "I feel like you're useless",
    ],
)
def test_clear_abuse_is_still_caught(text):
    assert moderate(text).kind == "abuse", text


# ------------------------------------------------- abuse that used to slip through


@pytest.mark.parametrize(
    "text",
    [
        "stfu",
        "STFU bot",
        "gtfo",
        "f you",
        "f u",
        "eff you",
        "fck you",
        "fuk you",
        "fuсk you",  # Cyrillic es
        "f\x00uck you",
        "youʼre an idiot",
        "your an idiot",
        "your stupid",
        "Your stupid.",
        "you're a complete idiot",
        "you're an absolute moron",
        "you're a f**king idiot",
        "you are a fucking idiot",
        "you're such a loser",
        "you're a joke",
        "you twat",
        "you worthless piece of shit",
        "you dumb bitch",
        "kiss my ass",
        "blow me",
        "screw yourself",
        "go fuck yourself",
        "shut your mouth",
        "eat shit",
        "die bot",
        "I'll beat the shit out of you",
        "I will slit your throat",
        "I know where you live",
    ],
)
def test_catches_abuse_that_used_to_slip_through(text):
    assert moderate(text).kind == "abuse", text


def test_your_stupid_mistake_is_not_abuse():
    assert moderate("your stupid mistake cost us a day").kind == "ok"
    assert moderate("blow me away with a better index").kind == "ok"


@pytest.mark.parametrize(
    "text",
    ["you cocksucker", "I want to have sex with you", "take your clothes off", "take ur shirt off"],
)
def test_catches_sexual_harassment_that_used_to_slip_through(text):
    assert moderate(text) == Verdict(kind="block", reason="sexual"), text
