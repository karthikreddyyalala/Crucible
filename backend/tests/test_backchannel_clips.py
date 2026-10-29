from pathlib import Path

import pytest

from cli import make_backchannel_clips as mod


class _FakeTTS:
    def synthesize(self, text: str) -> bytes:
        return text.encode()


def test_writes_every_clip(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(mod, "_build_tts", lambda settings: _FakeTTS())
    monkeypatch.setattr(mod, "OUT", tmp_path)
    mod.main()
    for name, text in mod.CLIPS.items():
        assert (tmp_path / f"{name}.mp3").read_bytes() == text.encode()


def test_exits_when_tts_not_configured(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(mod, "_build_tts", lambda settings: None)
    monkeypatch.setattr(mod, "OUT", tmp_path)
    with pytest.raises(SystemExit):
        mod.main()
