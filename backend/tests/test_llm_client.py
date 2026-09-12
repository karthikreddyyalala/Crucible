import pytest
from pydantic import BaseModel
from llm.client import LLMClient
from llm.json_utils import extract_json


class _Shape(BaseModel):
    name: str
    count: int


class _FakeMessage:
    def __init__(self, text):
        self.content = [type("Block", (), {"text": text})()]


class _FakeClient:
    def __init__(self, text):
        self._text = text
        self.calls = []

    @property
    def messages(self):
        outer = self

        class _M:
            def create(self, **kwargs):
                outer.calls.append(kwargs)
                return _FakeMessage(outer._text)
        return _M()


class _SequenceClient:
    """Returns a different text for each successive call — to exercise retry."""

    def __init__(self, texts):
        self._texts = list(texts)
        self.calls = []

    @property
    def messages(self):
        outer = self

        class _M:
            def create(self, **kwargs):
                idx = len(outer.calls)
                outer.calls.append(kwargs)
                text = outer._texts[min(idx, len(outer._texts) - 1)]
                return _FakeMessage(text)
        return _M()


def test_extract_json_handles_fenced_block():
    raw = 'here you go:\n```json\n{"a": 1}\n```\nthanks'
    assert extract_json(raw) == {"a": 1}


def test_extract_json_ignores_trailing_prose_after_object():
    # The exact production crash: valid object followed by an explanation line.
    raw = '{"action": "advance", "note": "ok"}\n\nI advanced because the answer was complete.'
    assert extract_json(raw) == {"action": "advance", "note": "ok"}


def test_extract_json_ignores_trailing_prose_containing_braces():
    # Trailing prose that itself contains braces — defeats first{..last} slicing.
    raw = '{"action": "advance"}\n\nThe candidate said {this} and {that}.'
    assert extract_json(raw) == {"action": "advance"}


def test_extract_json_takes_first_of_two_objects():
    # Model occasionally emits the object twice / adds a second object.
    raw = '{"action": "follow_up"}\n{"action": "advance"}'
    assert extract_json(raw) == {"action": "follow_up"}


def test_extract_json_handles_leading_prose_before_object():
    raw = 'Sure, here is the decision:\n{"action": "complete"}'
    assert extract_json(raw) == {"action": "complete"}


def test_extract_json_handles_array_with_trailing_data():
    raw = '[1, 2, 3]\nthat is the list'
    assert extract_json(raw) == [1, 2, 3]


def test_extract_json_raises_on_no_json():
    with pytest.raises(ValueError):
        extract_json("there is no json here at all")


def test_structured_validates_into_schema():
    fake = _FakeClient('{"name": "widget", "count": 3}')
    client = LLMClient(client=fake)
    result = client.structured(
        agent="test", model="m", system="s", user="u", schema=_Shape,
    )
    assert result.name == "widget" and result.count == 3
    assert fake.calls[0]["model"] == "m"


def test_structured_retries_on_unparseable_first_response():
    # First response is garbage, second is valid — structured() should retry
    # and succeed rather than crashing the session.
    fake = _SequenceClient([
        "I cannot answer that.",              # unparseable -> triggers retry
        '{"name": "widget", "count": 7}',     # valid on retry
    ])
    client = LLMClient(client=fake)
    result = client.structured(
        agent="test", model="m", system="s", user="u", schema=_Shape)
    assert result.name == "widget" and result.count == 7
    assert len(fake.calls) == 2


def test_structured_retries_on_schema_validation_failure():
    # First response is valid JSON but wrong shape; second is correct.
    fake = _SequenceClient([
        '{"wrong": "field"}',                 # valid JSON, fails schema
        '{"name": "gadget", "count": 2}',     # valid on retry
    ])
    client = LLMClient(client=fake)
    result = client.structured(
        agent="test", model="m", system="s", user="u", schema=_Shape)
    assert result.name == "gadget" and result.count == 2
    assert len(fake.calls) == 2


def test_structured_raises_after_exhausting_retries():
    fake = _SequenceClient(["nonsense", "still nonsense", "more nonsense", "nope"])
    client = LLMClient(client=fake)
    with pytest.raises(Exception):
        client.structured(
            agent="test", model="m", system="s", user="u", schema=_Shape, max_retries=2)
    # 1 initial attempt + 2 retries = 3 calls
    assert len(fake.calls) == 3
