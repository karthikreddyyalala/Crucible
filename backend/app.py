"""FastAPI application factory for the Crucible interview pipeline.

Run locally (from backend/ with venv active and AWS creds in .env):
    uvicorn app:app --reload --port 8000

Tests inject a fake LLM via create_app(llm=...), so importing this module
never touches AWS. The real app builds an LLMClient that lazily connects to
Bedrock only on the first agent call.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config.settings import Settings
from llm.client import LLMClient
from routes.session import build_session_router
from store.base import MemoryStore
from store.in_memory import InMemoryStore

logger = logging.getLogger("crucible")

# Local dev: the ElevenLabs CLI stores ELEVENLABS_API_KEY in the repo-root
# .env.local (gitignored). Server-side only; never overrides a real env var,
# and on Lambda the file doesn't exist so this is a no-op.
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local", override=False)


def _build_store(settings: Settings) -> MemoryStore:
    if settings.persistence == "dynamodb":
        from store.dynamo import DynamoMemoryStore

        return DynamoMemoryStore(table_name=settings.memory_table, region=settings.aws_region)
    return InMemoryStore()


def _build_tavus(settings: Settings):
    if not settings.tavus_enabled:
        return None
    from llm.tavus import TavusClient

    return TavusClient(api_key=settings.tavus_api_key, base_url=settings.tavus_base_url)


def _build_tts(settings: Settings):
    if not settings.elevenlabs_enabled:
        return None
    from llm.elevenlabs import ElevenLabsClient

    return ElevenLabsClient(
        voice_id=settings.elevenlabs_voice_id,
        model_id=settings.elevenlabs_model_id,
    )


def _build_stt(settings: Settings):
    if not settings.deepgram_enabled:
        return None
    from llm.deepgram import DeepgramTokens

    return DeepgramTokens(api_key=os.environ["DEEPGRAM_API_KEY"])


def create_app(
    *, llm=None, settings: Settings | None = None, store: MemoryStore | None = None,
    tavus_client=None, tts_client=None, stt_client=None,
) -> FastAPI:
    settings = settings or Settings()
    llm = llm if llm is not None else LLMClient(region=settings.aws_region)
    store = store if store is not None else _build_store(settings)
    tavus_client = tavus_client if tavus_client is not None else _build_tavus(settings)
    tts_client = tts_client if tts_client is not None else _build_tts(settings)
    stt_client = stt_client if stt_client is not None else _build_stt(settings)

    app = FastAPI(title="Crucible API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        # Vercel serves the app on the project domain plus a unique per-commit
        # preview URL, so match the whole *.vercel.app space rather than pinning
        # one host. The explicit allow_origins list still covers CloudFront/local.
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Any unhandled error from an agent call (Bedrock throttle, exhausted JSON
    # retries, transient network fault) must reach the browser as a clean,
    # readable, retryable error — never an opaque 500 or a hung request. The
    # frontend shows this detail in its retry banner. HTTPExceptions raised
    # intentionally (e.g. 401 from auth) are left untouched.
    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, StarletteHTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=503,
            content={
                "detail": "The interviewer hit a temporary snag. Please try again."
            },
        )

    app.include_router(
        build_session_router(
            llm=llm, settings=settings, store=store, tavus_client=tavus_client, tts_client=tts_client, stt_client=stt_client,
        )
    )
    return app


app = create_app()
