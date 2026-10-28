"""Screen a candidate's text before it reaches the model.

block: a slur, graphic sexual slang, or sexual harassment aimed at the interviewer ("send me
nudes"). Topic words ("porn", "rape", "nudity") are fine: candidates meet them in
trust-and-safety questions.  abuse: an insult or threat aimed at the interviewer.
ok: everything else, including swearing aimed at nobody ("damn, I forgot the base case").
A pure function: no I/O, patterns compiled once at import.
"""

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel

from safety.terms import ALLOWED, SEXUAL, SLURS


class Verdict(BaseModel):
    kind: Literal["ok", "abuse", "block"]
    reason: str = ""  # "slur" | "sexual" | "directed_insult" | "threat" | ""


# --------------------------------------------------------------- normalize

_LEET = str.maketrans({"@": "a", "4": "a", "0": "o", "1": "i", "3": "e", "$": "s", "5": "s", "7": "t"})
_TOKEN_WITH_LETTER = re.compile(r"\S*[a-z]\S*")
_BANG_IN_WORD = re.compile(r"!(?=[a-z0-9@$])")  # "sh!t", but not "stop!"
_SPACED_LETTERS = re.compile(r"\b[a-z](?:[\s.\-]+[a-z]){3,}\b")  # "f u c k", "f.u.c.k"
_SEPARATORS = re.compile(r"[\s.\-]+")
_REPEATS = re.compile(r"([a-z])\1{2,}")


def normalize(text: str) -> str:
    """Undo the usual filter dodges: case, accents, zero-width characters, leetspeak,
    spaced-out letters and stretched letters. Word boundaries are kept."""
    text = unicodedata.normalize("NFKD", text).lower().replace("’", "'")
    text = "".join(c for c in text if unicodedata.category(c) not in ("Mn", "Cf"))
    # Leetspeak only inside tokens that already hold a letter, so "5 tests" stays "5 tests".
    text = _TOKEN_WITH_LETTER.sub(lambda m: _BANG_IN_WORD.sub("i", m.group()).translate(_LEET), text)
    text = _SPACED_LETTERS.sub(lambda m: _SEPARATORS.sub("", m.group()), text)
    return _REPEATS.sub(r"\1\1", text)


# --------------------------------------------------------------- patterns

_TOKENS = re.compile(r"\\.|[a-z]|.", re.S)
_LAZY_LETTER = re.compile(r"(?<!\\)[a-z][?*+{]")


def _tolerant(template: str) -> re.Pattern[str]:
    """Compile a template where every literal letter may appear twice, because
    normalize() leaves stretched letters at two ("fuuuck" -> "fuuck")."""
    assert not _LAZY_LETTER.search(template), f"quantifier on a bare letter: {template}"
    return re.compile("".join(t + "{1,2}" if t.isalpha() else t for t in _TOKENS.findall(template)))


def _term_pattern(terms: list[str]) -> re.Pattern[str]:
    words = "|".join(t.replace(" ", r"\s+") for t in terms)
    return _tolerant(rf"\b(?:{words})(?:s|es|ed|ing)?\b")


_SLUR = _term_pattern(SLURS)
_SEXUAL = _term_pattern(SEXUAL)

_FUCK = r"(?:fuck|f\*{1,4}(?:ck|k)?|fu\*{1,3}(?:k)?)"
_YOU = r"(?:you|u)"
_ARE = r"(?:you'?re|you are|u r|u are|ur)"
_INTENSIFIER = r"(?:(?:an|a|so|such an|such a|really|fucking|f\*+ing|totally|completely|just)\s+)*"
_ADJECTIVE = (
    r"(?:stupid|dumb|useless|worthless|pathetic|incompetent|moronic|shitty|"
    r"trash(?!\s+(?:talk|can))|garbage(?!\s+collect))"
)
_NOUN = (
    r"(?:idiot|moron|imbecile|loser|clown|fucker|motherfucker|asshole|bitch|dick|dickhead|"
    r"prick|dumbass|dipshit|shithead|bastard|piece of shit|piece of crap|waste of space)"
)
_INSULT = rf"(?:{_ADJECTIVE}|{_NOUN})"
_LISTENER = r"(?:bot|ai|machine(?!\s+learning)|marcus|robot|interviewer)"
_ABOUT_LISTENER = (
    rf"(?:stupid|dumb|useless|shitty|worthless|pathetic)\s+(?:(?:fucking|f\*+ing)\s+)?{_LISTENER}"
)

_HARASSMENT = [
    _tolerant(p)
    for p in (
        r"\b(?:suck|lick|eat)\s+my\s+(?:dick|cock|balls|ass|pussy)\b",
        r"\b(?:sit|get)\s+on\s+my\s+(?:dick|face)\b",
        r"\bsend\s+me\s+(?:your\s+)?(?:nudes|nude\s+pic(?:s)?)\b",
        # a bare "send nudes" is a command only at the start of a clause; "users send nudes" is a topic
        r"(?:^|[.!?,;:]\s*|\b(?:pls|please)\s+)send\s+(?:your\s+)?nudes\b",
        r"\bshow\s+me\s+your\s+(?:tits|boobs|ass|pussy|body(?!\s+of\b))\b",
        rf"\bi(?:\s+(?:want to|wanna|would like to|would love to)|'d\s+(?:like|love) to)\s+"
        rf"(?:fuck|bang|screw|f\*+)\s+{_YOU}\b",
        # "you're hot-reloading" is not a compliment: only a clause-final "hot" / "sexy"
        rf"\b{_ARE}\s+(?:(?:so|really|very|super|too)\s+)?(?:hot|sexy)(?=\s*[.!?,;]|\s*$|\s+af\b)",
    )
]

_INSULTS = [
    _tolerant(p)
    for p in (
        rf"\b{_FUCK}\s*(?:you|u|off|yourself|your)\b",
        r"\bf\s+off\b",
        r"\bscrew\s+(?:you|u|off)\b",
        r"\bpiss\s+off\b",
        # "go to hell" opens a sentence or a command; "things go to hell in prod" does not.
        r"(?:^|[.!?,;:]\s*|\b(?:just|please|you can)\s+)go\s+to\s+hell\b(?!\s+in\b)",
        rf"\b{_ARE}\s+{_INTENSIFIER}{_INSULT}\b",
        rf"\b{_YOU}\s+(?:(?:stupid|dumb|fucking|f\*+ing|little)\s+)?{_NOUN}\b",
        # "you suck" only at the end of a clause, not "you suck up the output"
        rf"\b{_YOU}\s+suck\s*(?:[.!?,]|$)",
        rf"\bhey,?\s+{_NOUN}\b",
        # "shut up the linter" is about a tool; "shut up" / "shut up, bot" is aimed at Marcus
        r"\bshut\s+(?:the\s+(?:fuck|hell|f\*+)\s+)?up\b(?!\s+(?:the|those|these|that|this|my|our|your|all)\b)",
        rf"\b(?:you|you'?re|ur)\s+(?:(?:so|really|such (?:an|a)|fucking|f\*+ing)\s+)*{_ABOUT_LISTENER}\b",
        # "the dumb AI baseline" is about some other model: aimed at Marcus only when the clause ends
        rf"(?:^|[.!?,;:]\s*|\b(?:this|what (?:an|a)|such (?:an|a))\s+){_ABOUT_LISTENER}(?=\s*[.!?,;:]|\s*$)",
        rf"\bmarcus\s+(?:is\s+)?{_INTENSIFIER}{_INSULT}\b",
        r"\bmarcus\s+sucks\b",
    )
]

_THREATS = [
    _tolerant(p)
    for p in (
        r"\b(?:i'?ll|i will|i am going to|i'?m going to|i'?m gonna|i am gonna|im gonna|imma)\s+"
        rf"(?:kill|hurt|destroy|murder|stab|shoot|beat|punch|rape)\s+{_YOU}\b",
        # "I'll find you a bug" is fine; "I will find you." and "find you and kill you" are not
        r"\b(?:i'?ll|i will|i am going to|i'?m going to|i'?m gonna|im gonna|imma)\s+"
        rf"find\s+{_YOU}(?:\s*[.!?,;]|\s*$|\s+and\b)",
        r"\bkill\s+yourself\b",
        r"\bkys\b",
        r"\bi\s+hope\s+you\s+(?:die|rot|burn|suffer)\b",
    )
]


def _hit(patterns: list[re.Pattern[str]], text: str) -> bool:
    return any(p.search(text) for p in patterns)


def _blocked(pattern: re.Pattern[str], text: str) -> bool:
    return any(m.group() not in ALLOWED for m in pattern.finditer(text))


def moderate(text: str) -> Verdict:
    t = normalize(text)
    if _blocked(_SLUR, t):
        return Verdict(kind="block", reason="slur")
    if _blocked(_SEXUAL, t) or _hit(_HARASSMENT, t):
        return Verdict(kind="block", reason="sexual")
    if _hit(_THREATS, t):
        return Verdict(kind="abuse", reason="threat")
    if _hit(_INSULTS, t):
        return Verdict(kind="abuse", reason="directed_insult")
    return Verdict(kind="ok")
