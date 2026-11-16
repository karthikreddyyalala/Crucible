from pathlib import Path

_P = Path(__file__).parent.parent / "prompts"


def _load(name: str) -> str:
    return " ".join((_P / f"{name}.md").read_text().split())


def test_no_recap_examples_left() -> None:
    t = _load("interviewer")
    assert "CDN in front, counter-based IDs" not in t
    assert "Two flows, day nineteen" not in t


def test_recap_is_banned() -> None:
    assert "Never recap their answer back" in _load("interviewer")


def test_wrong_claim_is_named_after_counter_case() -> None:
    assert "If they still hold the wrong claim after your counter-case" in _load("interviewer")


def test_affirming_words_banned() -> None:
    t = _load("interviewer")
    assert '"right instinct"' in t and '"makes sense"' in t


def test_vague_result_gets_a_number() -> None:
    assert "Faster by how much?" in _load("interviewer")


def test_survival_reasoning_names_one_fix() -> None:
    assert "To hold up:" in _load("evaluator")
