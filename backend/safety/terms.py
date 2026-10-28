"""Curated word lists for safety/moderation.py.

Plain lowercase words (a space means "any whitespace"). moderation.py matches each on
word boundaries, tolerates elongated letters and the suffixes s/es/ed/ing, so list the
bare word only.

Only slurs and graphic sexual slang belong here. Topic and clinical words stay out so
candidates can answer trust-and-safety questions ("flag porn and CSAM", "rape-threat
reports", "nudity detection", "sexual content"): porn, rape, sex, penis, vagina, nudes,
orgasm, masturbation, hentai. So do words with everyday senses: gay, chink ("a chink in
the armour"), coon, cum (summa cum laude), cripple, anal. Sexual harassment aimed at the
interviewer ("suck my dick", "send me nudes") is matched as phrases in moderation.py.
"""

SLURS: list[str] = [
    "nigger", "nigga", "kike", "spic", "gook", "wetback", "beaner", "towelhead",
    "raghead", "paki", "heeb", "dago", "wop", "darkie", "jigaboo", "zipperhead",
    "faggot", "fag", "dyke", "tranny", "shemale",
    "retard", "mongoloid", "spaz",
    "cunt",
]

SEXUAL: list[str] = [
    "blowjob", "handjob", "rimjob", "cumshot", "gangbang", "jizz", "pussy", "cock",
    "tits", "titties", "boner", "slut", "whore", "wank", "wanker", "horny", "milf",
    "jerk off", "jack off",
]

# A listed term plus a suffix that is really a different, innocent word.
ALLOWED: list[str] = ["spices", "spiced", "cocked", "retarding"]
