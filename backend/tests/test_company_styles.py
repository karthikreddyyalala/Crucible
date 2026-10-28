import re

import pytest

from models.company_style import find_style, load_company_styles

IDS = {"general", "amazon", "google", "meta", "microsoft", "startup"}
NAMES = {
    "general": "General",
    "amazon": "Amazon-style",
    "google": "Google-style",
    "meta": "Meta-style",
    "microsoft": "Microsoft-style",
    "startup": "Startup",
}
FORBIDDEN = ("official", "affiliated", "guarantee")


def _texts(style):
    return [style.name, style.description, style.interviewer_note, *style.behavioral_themes]


def test_all_six_styles_present_keyed_by_id():
    styles = load_company_styles()
    assert set(styles) == IDS
    assert all(k == s.id for k, s in styles.items())


@pytest.mark.parametrize("sid", sorted(IDS))
def test_style_fields(sid):
    s = load_company_styles()[sid]
    assert s.name == NAMES[sid]
    assert 0 < len(s.description) <= 120
    assert set(s.question_mix) == {"behavioral", "technical", "system_design", "coding"}
    assert all(w >= 0 for w in s.question_mix.values()) and sum(s.question_mix.values()) > 0
    assert 3 <= len(s.behavioral_themes) <= 8
    sentences = [p for p in re.split(r"(?<=[.!?])\s+", s.interviewer_note.strip()) if p]
    assert 2 <= len(sentences) <= 3


@pytest.mark.parametrize("sid", sorted(IDS))
def test_no_affiliation_claims(sid):
    blob = " ".join(_texts(load_company_styles()[sid])).lower()
    assert not [w for w in FORBIDDEN if w in blob]


def test_amazon_uses_public_leadership_principle_names():
    themes = load_company_styles()["amazon"].behavioral_themes
    assert "Ownership" in themes and "Customer Obsession" in themes


def test_find_style_falls_back_to_general():
    assert find_style("nope").id == "general"
    assert find_style("google").id == "google"


def test_json_is_camel_case_and_styles_are_frozen():
    s = find_style("meta")
    assert s.model_dump(by_alias=True).keys() >= {"questionMix", "behavioralThemes", "interviewerNote"}
    with pytest.raises(Exception):
        s.name = "x"
