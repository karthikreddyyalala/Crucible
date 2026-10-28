"""Curated word lists for safety/moderation.py.

Policy, in one place:

* Slurs are blocked wherever they appear (SLURS), including leetspeak, spacing and stretched
  letters. Graphic sexual slang is blocked too (SEXUAL). Sexual harassment aimed at the
  interviewer ("suck my dick", "send me nudes", "take your clothes off") is matched as
  phrases in moderation.py, because the same words can be a topic.
* Topic and clinical words are never blocked, so candidates can answer trust-and-safety
  questions ("flag porn and CSAM", "rape-threat reports", "nudity detection", "sexual
  content"): porn, rape, sex, penis, vagina, nudes, orgasm, masturbation, hentai.
* Words with everyday or professional senses stay off the lists: gay, chink ("a chink in the
  armour"), coon, cum (summa cum laude), cripple, anal, and dyke (a levee, and the surname
  of Dick Van Dyke and Greg Dyke), for the same reason.
* Names never block. A listed term inside a real name or ordinary idiom is exempted below
  (ALLOWED, NAMES, ACCENTED); "you fag" and "fucking spic" still block.

SLURS and SEXUAL hold plain lowercase words, matched on word boundaries with stretched
letters and the suffixes s/es/ed/ing tolerated, so list the bare word only.
"""

SLURS: list[str] = [
    "nigger", "nigga", "kike", "spic", "gook", "wetback", "beaner", "towelhead",
    "raghead", "paki", "heeb", "dago", "wop", "darkie", "jigaboo", "zipperhead",
    "faggot", "fag", "tranny", "shemale",
    "retard", "mongoloid", "spaz",
    "cunt",
]

SEXUAL: list[str] = [
    "blowjob", "handjob", "rimjob", "cumshot", "gangbang", "jizz", "pussy", "cock",
    "tits", "titties", "boner", "slut", "whore", "wank", "wanker", "horny", "milf",
    "cocksucker", "jerk off", "jack off",
]

# Phrases and words that contain a listed term (plus a suffix, or in an idiom) but are
# ordinary English. Cut out of the text before matching.
ALLOWED: list[str] = [
    "spices", "spiced", "spicing", "spic and span", "cocked", "cock-up", "cock up",
    "retarding", "retarded potential", "woop", "woops", "bonner", "bonners",
    "fag end", "tits up",
]

# Surnames equal to a listed term, exempt only as "Firstname Surname" (capitalised).
NAMES: list[str] = ["Cocks", "Fagg"]

# Accented spellings that collide with a listed term once accents are stripped (Horny).
ACCENTED: list[str] = ["horn\u00fd"]
