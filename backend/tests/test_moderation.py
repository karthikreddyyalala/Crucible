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
        "dyke",
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
        "p0rn",
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
        "PORN",
        # sexual
        "send nudes",
        "nice cock",
        "porn",
        "pornos",
        "dildo",
        "pussy",
        "suck my dick",
        "jerk off",
        "wanking",
        "i will rape you",
    ],
)
def test_blocks_slurs_and_sexual_terms(text):
    assert moderate(text).kind == "block", text


def test_block_reasons():
    assert moderate("you nigger") == Verdict(kind="block", reason="slur")
    assert moderate("send nudes") == Verdict(kind="block", reason="sexual")


def test_block_wins_over_abuse():
    assert moderate("fuck you nigger").kind == "block"
    assert moderate("you cunt").kind == "block"
    assert moderate("i'll kill you, you faggot").kind == "block"


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
