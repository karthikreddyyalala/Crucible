"""ElevenLabs text-to-speech — the interviewer's voice.

The SDK reads ELEVENLABS_API_KEY from the environment; the key never appears
in code and never reaches the browser (it posts text to /api/tts and gets back
MP3 bytes). `client` is injectable so tests never hit the network.
"""
from typing import Any


class ElevenLabsClient:
    def __init__(self, *, voice_id: str, model_id: str, client: Any = None) -> None:
        self._voice_id = voice_id
        self._model_id = model_id
        self._client = client

    def _ensure_client(self):
        if self._client is None:
            from elevenlabs import ElevenLabs

            self._client = ElevenLabs()
        return self._client

    def synthesize(self, text: str) -> bytes:
        audio = self._ensure_client().text_to_speech.convert(
            text=text,
            voice_id=self._voice_id,
            model_id=self._model_id,
            output_format="mp3_44100_128",
            # "on" so numbers like "p99" or "900ms" are spoken the way a person says them.
            apply_text_normalization="on",
            # Slightly lower stability = more natural variation in delivery, which is
            # what makes it sound like a person. Eleven v4 rejects `style`.
            voice_settings={"stability": 0.45, "similarity_boost": 0.8}
            | ({} if self._model_id.startswith("eleven_v4") else {"style": 0.15}),
        )
        return b"".join(audio)
