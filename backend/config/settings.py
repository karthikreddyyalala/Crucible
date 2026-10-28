import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="INTERVIEWAI_", env_file=".env", extra="ignore")

    aws_region: str = "us-west-2"

    # Per-agent models, all verified available in this account/region.
    # Cheap structured work runs on Haiku; the agents that carry the product
    # (question plan, push-back, survival verdict) run on Sonnet 4.6. Opus is
    # intentionally avoided — ~5x the cost for marginal gain here. Override
    # any of these via INTERVIEWAI_<NAME> in .env.
    haiku_model: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    sonnet_model: str = "us.anthropic.claude-sonnet-4-6"

    intake_model: str = haiku_model
    planner_model: str = sonnet_model
    interviewer_model: str = sonnet_model
    evaluator_model: str = sonnet_model
    memory_model: str = haiku_model
    coach_model: str = sonnet_model

    # Sampling temperature per agent. Scoring/planning agents run at 0 so the same
    # input gives the same verdict; the interviewer gets a little variety so its
    # phrasing doesn't sound canned. Override via INTERVIEWAI_<NAME>_TEMPERATURE.
    intake_temperature: float = Field(0.0, ge=0, le=1)
    planner_temperature: float = Field(0.0, ge=0, le=1)
    interviewer_temperature: float = Field(0.3, ge=0, le=1)
    evaluator_temperature: float = Field(0.0, ge=0, le=1)
    memory_temperature: float = Field(0.0, ge=0, le=1)
    coach_temperature: float = Field(0.0, ge=0, le=1)

    # Persistence. "memory" keeps everything in-process (tests, local dev with
    # no AWS tables). "dynamodb" persists MemoryProfile across sessions/devices.
    persistence: str = "memory"
    memory_table: str = "crucible-memory"

    # Comma-separated allowed browser origins for CORS. Localhost for dev; add
    # the deployed frontend origin (CloudFront domain) via INTERVIEWAI_CORS_ORIGINS.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Auth. When auth_required is true, every /api call (except /health) must
    # carry a valid Cognito ID token; the candidate id is taken from its `sub`
    # claim, not the request. Off by default so tests/local dev stay anonymous.
    auth_required: bool = False
    cognito_region: str = "us-west-2"
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""

    run_llm_evals: bool = False

    # Tavus video avatar (optional, off by default). The API key is a paid
    # credential and stays server-side — the browser only ever receives the
    # ephemeral conversation URL. Leave tavus_api_key empty to disable; the
    # avatar endpoint then reports disabled and the UI keeps the stylized avatar.
    tavus_api_key: str = ""
    tavus_replica_id: str = ""
    tavus_persona_id: str = ""
    tavus_base_url: str = "https://tavusapi.com"

    # ElevenLabs voice for the interviewer (optional). The SDK reads the key
    # from ELEVENLABS_API_KEY itself (stored in the repo-root .env.local by the
    # ElevenLabs CLI; never in code). Unset → the browser's built-in voice.
    # Default voice "Chris" (charming, down-to-earth American male) matches the
    # on-screen avatar. Flash v2.5 because a conversation can't wait: measured
    # ~0.5s per line vs ~2.8s on eleven_v4 (Lambda can't stream the response).
    elevenlabs_voice_id: str = "iP95p4xoKVk53GoZ742B"
    elevenlabs_model_id: str = "eleven_flash_v2_5"

    @property
    def elevenlabs_enabled(self) -> bool:
        return bool(os.environ.get("ELEVENLABS_API_KEY"))

    # Deepgram live transcription for the candidate (optional). Read like the
    # ElevenLabs key: DEEPGRAM_API_KEY in the environment (repo-root .env.local
    # locally). Unset → the browser's built-in speech recognition.
    @property
    def deepgram_enabled(self) -> bool:
        return bool(os.environ.get("DEEPGRAM_API_KEY"))

    @property
    def tavus_enabled(self) -> bool:
        return bool(self.tavus_api_key and self.tavus_replica_id)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
