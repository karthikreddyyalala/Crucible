"""Marcus doesn't read the candidate's answer back to them before a probe (human-feel eval,
2026-11-16: "Right. So you cut the export and trimmed the reminders, who did you tell?" on
nearly every turn). The recap is cut in code, like the second ask in one_ask."""
from pathlib import Path

import pytest

from agents.interviewer import no_recap

PROMPT = " ".join((Path(__file__).parent.parent / "prompts" / "interviewer.md").read_text().split())


@pytest.mark.parametrize("said, kept", [
    ("Right. So you cut the export and trimmed the reminders, who did you actually tell?",
     "Right. Who did you actually tell?"),
    ("Okay. You mentioned hash indexes being fast, what kind of index do most databases use?",
     "Okay. What kind of index do most databases use?"),
    ("Got it. So you said you met in the middle, what evidence did you bring?",
     "Got it. What evidence did you bring?"),
])
def test_recap_before_the_probe_is_cut(said, kept):
    assert no_recap(said) == kept


@pytest.mark.parametrize("said", [
    "Okay. What was your part in that?",
    "Okay. You said 'we', what did you personally do?",   # quoting their word IS the probe
    "Right. You mentioned Redis, why there?",             # a short pointer, not a summary
    "So you cut the export and trimmed reminders, who did you tell?",  # no acknowledgment first: leave it
    "Got it. Okay, let's switch to something more technical. How does a hash map work?",
])
def test_everything_else_is_left_alone(said):
    assert no_recap(said) == said


def test_prompt_no_longer_asks_for_the_listening_in_the_question():
    assert "in the question itself" not in PROMPT
    assert "never a summary of their answer" in PROMPT


def test_wrong_claims_are_checked_before_any_other_probe():
    assert "check the candidate's latest reply for any technically false claim" in PROMPT
