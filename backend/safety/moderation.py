"""Screen a candidate's text before it reaches the model.

block: a slur, graphic sexual slang, or sexual harassment aimed at the interviewer ("send me
nudes"). Topic words ("porn", "rape", "nudity") are fine: candidates meet them in
trust-and-safety questions.  abuse: an insult or threat aimed at the interviewer.
ok: everything else, including swearing aimed at nobody ("damn, I forgot the base case").

Three strikes end an interview, so every pattern errs towards precision: an insult counts
only when the grammar points it at the listener ("you're an idiot", "shut up"), not when it
reports speech ("he said you're an idiot") or describes a thing ("it will screw you over").
A pure function: no I/O, patterns compiled once at import.
"""

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel

from safety.terms import ACCENTED, ALLOWED, NAMES, SEXUAL, SLURS

# Backstop only: routes cap answers at 6,000 characters (422 above), so real input never
# reaches this. Every pass below is linear, but there are dozens of patterns and NFKD can
# multiply the length (one character may expand 18x), so cap before and after it.
MAX_CHARS = 10_000


class Verdict(BaseModel):
    kind: Literal["ok", "abuse", "block"]
    reason: str = ""  # "slur" | "sexual" | "directed_insult" | "threat" | ""


# --------------------------------------------------------------- normalize

_LEET = str.maketrans({"@": "a", "4": "a", "0": "o", "1": "i", "3": "e", "$": "s", "5": "s", "7": "t"})
# Typographic apostrophes, then Cyrillic and Greek letters that pass for Latin ones.
_LOOKALIKES = {
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0441": "c", "\u0440": "p", "\u0445": "x",
    "\u0443": "y", "\u0456": "i", "\u0455": "s", "\u0458": "j", "\u043a": "k",  # Cyrillic
    "\u03bf": "o", "\u03b1": "a", "\u03b5": "e", "\u03b9": "i", "\u03c5": "u", "\u03bd": "v",
    "\u03ba": "k", "\u03c4": "t", "\u03c1": "p", "\u03c7": "x",  # Greek
}
_FOLD = str.maketrans({"\u02bc": "'", "\u2018": "'", "\u2019": "'", "\u00b4": "'"} | _LOOKALIKES)
_TOKEN = re.compile(r"\S+")
_HAS_LETTER = re.compile(r"[a-z]").search
_BANG_IN_WORD = re.compile(r"!(?=[a-z0-9@$])")  # "sh!t", but not "stop!"
_SPACED_LETTERS = re.compile(r"\b[a-z](?:[\s.\-]+[a-z]){3,}\b")  # "f u c k", "f.u.c.k"
_SEPARATORS = re.compile(r"[\s.\-]+")
_REPEATS = re.compile(r"([a-z])\1{2,}")


def _leet(match: re.Match[str]) -> str:
    # Only tokens that already hold a letter, so "5 tests" and "kill -9" stay as written.
    token = match.group()
    if not _HAS_LETTER(token):
        return token
    return _BANG_IN_WORD.sub("i", token).translate(_LEET)


def _keep(char: str) -> bool:
    category = unicodedata.category(char)
    return category not in ("Mn", "Cf") and (category != "Cc" or char in "\t\n\r")


def normalize(text: str) -> str:
    """Undo the usual filter dodges: case, accents, lookalike letters, control and
    zero-width characters, leetspeak, spaced-out letters and stretched letters. Word
    boundaries are kept."""
    text = unicodedata.normalize("NFKD", text[:MAX_CHARS])[:MAX_CHARS].lower()
    text = "".join(filter(_keep, text)).translate(_FOLD)
    text = _TOKEN.sub(_leet, text)
    text = _SPACED_LETTERS.sub(lambda m: _SEPARATORS.sub("", m.group()), text)
    return _REPEATS.sub(r"\1\1", text)


# --------------------------------------------------------------- pattern helpers

_TOKENS = re.compile(r"\\.|[a-z]|.", re.S)
_LAZY_LETTER = re.compile(r"(?<!\\)[a-z][?*+{]")


def _tolerant(template: str) -> re.Pattern[str]:
    """Compile a template where every literal letter may appear twice, because
    normalize() leaves stretched letters at two ("fuuuck" -> "fuuck"), and every literal
    space is any run of whitespace."""
    assert not _LAZY_LETTER.search(template), f"quantifier on a bare letter: {template}"
    parts = (
        r"\s+" if t == " " else t + "{1,2}" if t.isalpha() else t for t in _TOKENS.findall(template)
    )
    return re.compile("".join(parts))


def _term_pattern(terms: list[str]) -> re.Pattern[str]:
    return _tolerant(rf"\b(?:{'|'.join(terms)})(?:s|es|ed|ing)?\b")


_SLUR = _term_pattern(SLURS)
_SEXUAL = _term_pattern(SEXUAL)
# Phrases that contain a listed term but are ordinary English; cut out before matching.
_ALLOWED = _tolerant(rf"\b(?:{'|'.join(re.sub(r'[ -]+', r'[\\s-]+', a) for a in ALLOWED)})\b")
# Surnames that equal a listed term count only as "Firstname Surname"; accented spellings
# that collide once accents are stripped ("Horný") are cut before normalizing.
_NAMES = re.compile(rf"\b[A-Z][a-z]+\s+(?:{'|'.join(NAMES)})\b")
_ACCENTED = re.compile(rf"\b(?:{'|'.join(map(re.escape, ACCENTED))})\b", re.IGNORECASE)

# --------------------------------------------------------------- insults and threats

_FUCKING = r"(?:fucking|fuckin|fcking|f\*+(?:k)?ing)"
_FUCK = r"(?:fuck|fck|fuk|eff|f\*{1,4}(?:ck|k)?|fu\*{1,3}(?:k)?)"
_YOU = r"(?:you|u)"
_ARE = r"(?:you'?re|you are|u r|u are|ur)"
_INTENSIFIER = (
    r"(?:(?:an|a|so|such an|such a|really|totally|completely|just|complete|absolute|total|utter|"
    rf"real|damn|bloody|goddamn|{_FUCKING})\s+)*"
)
_ADJECTIVE = (
    r"(?:stupid|dumb|useless|worthless|pathetic|incompetent|moronic|shitty|"
    r"trash(?!\s+(?:talk|can))|garbage(?!\s+collect))"
)
_NOUN = (
    r"(?:idiot|moron|imbecile|loser|clown|fucker|motherfucker|asshole|bitch|dick|dickhead|prick|"
    r"dumbass|dumbfuck|dipshit|shithead|fuckwit|twat|scumbag|bastard|piece of shit|piece of crap|"
    r"waste of space|disgrace|joke(?=\s*[.!?,;]|\s*$))"
)
_INSULT = rf"(?:{_ADJECTIVE}|{_NOUN})(?![\w-])"  # not "idiot-proof"
_LISTENER = r"(?:bot|ai|machine(?!\s+learning)|marcus|robot|interviewer)"
_ABOUT_LISTENER = (
    rf"(?:stupid|dumb|useless|shitty|worthless|pathetic)\s+(?:{_FUCKING}\s+)?{_LISTENER}"
)

_CLAUSE_START = r"(?:^|[.!?,;:\n]\s*)"
_CLAUSE_END = r"(?=\s*[.!?,;:]|\s*$)"
_AT_LISTENER = rf"(?=\s*[.!?,;:]|\s*$|\s+(?:bot|ai|marcus|robot|interviewer)\b)"
_NOT_OVER = r"(?!\s+(?:over|up)\b)"  # "will screw you over" describes a thing, not Marcus
_I_WILL = r"(?:i'?ll|i will|i am going to|i'?m going to|i'?m gonna|i am gonna|im gonna|imma)"

_HARASSMENT = [
    _tolerant(p)
    for p in (
        r"\b(?:suck|lick|eat) my (?:dick|cock|balls|ass|pussy)\b",
        r"\b(?:sit|get) on my (?:dick|face)\b",
        r"\bsend me (?:your )?(?:nudes|nude pic(?:s)?)\b",
        # a bare "send nudes" is a command only at the start of a clause; "users send nudes" is a topic
        r"(?:^|[.!?,;:]\s*|\b(?:pls|please) )send (?:your )?nudes\b",
        r"\bshow me your (?:tits|boobs|ass|pussy|body(?! of\b))\b",
        r"\bi(?: (?:want to|wanna|would like to|would love to)|'d (?:like|love) to) "
        rf"(?:fuck|bang|screw|f\*+|have sex with|sleep with|make love to) {_YOU}\b",
        r"\btake (?:your|ur) (?:clothes|shirt|pants|top|bra) off\b",
        # "you're hot-reloading" is not a compliment: only a clause-final "hot" / "sexy"
        rf"\b{_ARE} (?:(?:so|really|very|super|too) )?(?:hot|sexy)(?=\s*[.!?,;]|\s*$|\s+af\b)",
    )
]

_INSULTS = [
    _tolerant(p)
    for p in (
        rf"\b{_FUCK}\s*(?:you|u|off|yourself|your)\b{_NOT_OVER}",
        rf"{_CLAUSE_START}f (?:you|u)\b",
        rf"\bf off{_AT_LISTENER}",
        r"\bscrew (?:you|u|off|yourself)\b" + _NOT_OVER,
        rf"\bpiss off{_AT_LISTENER}",
        r"\b(?:stfu|gtfo)\b",
        # "go to hell" opens a sentence or a command; "things go to hell in prod" does not.
        r"(?:^|[.!?,;:]\s*|\b(?:just|please|you can) )go to hell\b(?! in\b)",
        rf"\b{_YOU} (?:(?:stupid|dumb|worthless|useless|pathetic|little|complete|absolute|total|utter|"
        rf"{_FUCKING}) )*{_NOUN}(?![\w-])",
        # "you suck" only at the end of a clause, not "you suck up the output"
        rf"\b{_YOU} suck{_CLAUSE_END}",
        rf"\bhey,? {_NOUN}(?![\w-])",
        # "shut up and ship it" / "wouldn't shut up about X" report speech; "shut up" opening a
        # clause or after an imperative marker is aimed at Marcus
        r"(?:^|[.!?,;:\n]\s*|\b(?:just|please|you|should|better|need to|have to|can you|could you|"
        r"will you|would you) )shut (?:the (?:fuck|hell|f\*+) )?up\b"
        r"(?!\s+(?:the|those|these|that|this|my|our|your|all|shop|about)\b)",
        r"\bshut (?:your|ur) (?:mouth|trap|face|hole)\b",
        rf"\b(?:you|you'?re|ur) (?:(?:so|really|such (?:an|a)|{_FUCKING}) )*{_ABOUT_LISTENER}\b",
        # "the dumb AI baseline" is about some other model: aimed at Marcus only when the clause ends
        rf"(?:^|[.!?,;:]\s*|\b(?:this|what (?:an|a)|such (?:an|a)) ){_ABOUT_LISTENER}{_CLAUSE_END}",
        rf"{_CLAUSE_START}(?:(?:ok|okay|well|so|wow|lol|honestly|hey|man|dude) )?marcus "
        rf"(?:(?:is )?{_INTENSIFIER}{_INSULT}|sucks\b)",
        rf"{_CLAUSE_START}your (?:so |really )?(?:stupid|dumb|useless|pathetic|worthless|incompetent){_CLAUSE_END}",
        r"\bkiss my (?:ass|butt|arse)\b",
        rf"{_CLAUSE_START}blow me{_CLAUSE_END}",
        r"\beat shit\b",
        r"\bdie,? (?:bot|ai|marcus|robot|interviewer)\b",
    )
]

# "you're" + an insult, unless the sentence is reporting or generalising about "you":
# "if you're useless in code review", "they think you're incompetent", "said 'you're an idiot'",
# "told him to fuck off". First person ("I think you're an idiot") is still aimed at Marcus.
_ARE_INSULT = _tolerant(rf"\b(?:{_ARE}|your (?:an|a)) {_INTENSIFIER}{_INSULT}")
_REPORTED = _tolerant(
    r"\b(?:if|when|whenever|unless|whether|like|that|because|since|think|thinks|thought|feel|feels|"
    r"felt|said|says|say|saying|called|calls|named|nicknamed|means|(?:told|tell|tells|asked|ask|asks) "
    r"(?!you\b|u\b)\w+ to)\s*[\"'\u201c]?\s*$"
)
_FIRST_PERSON = _tolerant(r"\bi (?:think|thought|feel|felt|believe)(?: like| that)?\s*$")

_THREATS = [
    _tolerant(p)
    for p in (
        # "I'll shoot you an email" / "beat you to it" are not threats
        rf"\b{_I_WILL} (?:kill|hurt|destroy|murder|stab|shoot|beat|punch|rape) {_YOU}\b"
        r"(?!\s+(?:an|a|the|to|over|some|at|by)\b)",
        # "I'll find you a bug" is fine; "I will find you." and "find you and kill you" are not
        rf"\b{_I_WILL} find {_YOU}(?:\s*[.!?,;]|\s*$|\s+and\b)",
        rf"\b{_I_WILL} (?:beat|kick) (?:the )?(?:shit|crap|hell|living daylights) out of {_YOU}\b",
        rf"\b{_I_WILL} (?:fuck|f\*+) {_YOU} up\b",
        rf"\b{_I_WILL} (?:slit|cut|break|snap) your (?:throat|neck|legs|arms|skull)\b",
        r"\bi know where you (?:live|sleep)\b",
        # "don't kill yourself over 2% latency" and "kill yourself is a phrase" are not commands
        r"(?:^|[.!?,;:\n]\s*|\b(?:just|go|should|please|and|you) )kill yourself\b"
        r"(?!\s+(?:is|was|over|for|to|by|with|trying)\b)",
        r"\bkys\b",
        r"\bi hope you (?:die|rot|burn)\b",
        rf"\bi hope you suffer{_CLAUSE_END}",
    )
]


def _hit(patterns: list[re.Pattern[str]], text: str) -> bool:
    return any(p.search(text) for p in patterns)


def _aimed(patterns: list[re.Pattern[str]], text: str) -> bool:
    """Like _hit, but a match right after a reporting word ("he said fuck you") is skipped."""
    for pattern in patterns:
        for m in pattern.finditer(text):
            before = text[max(0, m.start() - 30) : m.start()]
            if _FIRST_PERSON.search(before) or not _REPORTED.search(before):
                return True
    return False


def moderate(text: str) -> Verdict:
    text = _ACCENTED.sub(" ", _NAMES.sub(" ", unicodedata.normalize("NFC", text[:MAX_CHARS])))
    t = _ALLOWED.sub(" ", normalize(text))
    if _SLUR.search(t):
        return Verdict(kind="block", reason="slur")
    if _SEXUAL.search(t) or _hit(_HARASSMENT, t):
        return Verdict(kind="block", reason="sexual")
    if _hit(_THREATS, t):
        return Verdict(kind="abuse", reason="threat")
    if _aimed(_INSULTS + [_ARE_INSULT], t):
        return Verdict(kind="abuse", reason="directed_insult")
    return Verdict(kind="ok")
