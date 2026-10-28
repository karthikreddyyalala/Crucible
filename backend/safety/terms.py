"""Curated word lists for safety/moderation.py.

Plain lowercase words (a space means "any whitespace"). moderation.py matches each on
word boundaries, tolerates elongated letters and the suffixes s/es/ed/ing, so list the
bare word only. Words that are also ordinary vocabulary are left out on purpose:
"sex" (a dataset column), "gay", "chink" ("a chink in the armour"), "coon", "cum"
(summa cum laude), "cripple", "anal", "vagina".
"""

SLURS: list[str] = [
    "nigger", "nigga", "kike", "spic", "gook", "wetback", "beaner", "towelhead",
    "raghead", "paki", "heeb", "dago", "wop", "darkie", "jigaboo", "zipperhead",
    "faggot", "fag", "dyke", "tranny", "shemale",
    "retard", "mongoloid", "spaz",
    "cunt",
]

SEXUAL: list[str] = [
    "porn", "porno", "blowjob", "handjob", "rimjob", "cumshot", "gangbang", "hentai",
    "jizz", "dildo", "pussy", "cock", "tits", "titties", "penis", "boner", "orgasm",
    "masturbate", "masturbation", "slut", "whore", "wank", "wanker", "horny", "milf",
    "nudes", "rape", "rapist",
    "jerk off", "jack off", "suck my dick", "suck my balls", "eat my ass",
]

# A listed term plus a suffix that is really a different, innocent word.
ALLOWED: list[str] = ["spices", "spiced", "cocked", "retarding"]
