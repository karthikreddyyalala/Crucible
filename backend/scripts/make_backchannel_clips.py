"""One-time: render the interviewer's short "Mm-hm" clips in his ElevenLabs voice.

Costs ElevenLabs credits (about 20 characters in total), so run it only when the
clips need remaking. From backend/:  python -m scripts.make_backchannel_clips
Writes public/backchannel/*.mp3, which the browser plays while Marcus thinks.
"""
from pathlib import Path

from app import _build_tts  # importing app loads the repo-root .env.local
from config.settings import Settings

CLIPS: dict[str, str] = {"mm-hm": "Mm-hm.", "mm": "Mm.", "right": "Right."}
OUT = Path(__file__).resolve().parents[2] / "public" / "backchannel"


def main() -> None:
    tts = _build_tts(Settings())
    if tts is None:
        raise SystemExit("ElevenLabs isn't configured (ELEVENLABS_API_KEY).")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in CLIPS.items():
        (OUT / f"{name}.mp3").write_bytes(tts.synthesize(text))
        print(f"wrote {name}.mp3")


if __name__ == "__main__":
    main()
