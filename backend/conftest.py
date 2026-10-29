import pytest


@pytest.fixture(autouse=True)
def _isolate_env(monkeypatch):
    # Tests must never depend on a developer's real AWS creds.
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    # ...nor a developer's real ElevenLabs key (app.py loads .env.local).
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
