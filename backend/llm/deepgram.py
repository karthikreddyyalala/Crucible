"""Short-lived Deepgram tokens for the browser's live transcription.

The Deepgram API key stays here (server-side). The browser asks /api/stt/token
for a 30-second token and opens its own streaming connection with it; the
connection stays open after the token expires. The key needs the Member role
to mint tokens. `http_post` is injectable so tests never hit the network.
"""
from typing import Any, Callable

HttpPost = Callable[[str, dict, dict], dict[str, Any]]
TTL_SECONDS = 30


def _default_http_post(url: str, headers: dict, json_body: dict) -> dict[str, Any]:
    import json
    import urllib.error
    import urllib.request

    req = urllib.request.Request(
        url, data=json.dumps(json_body).encode(), headers={**headers, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 — fixed deepgram host
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as error:
        # e.g. 403 "Insufficient permissions" when the key isn't a Member key.
        raise RuntimeError(f"Deepgram {error.code}: {error.read().decode(errors='replace')[:300]}") from error


class DeepgramTokens:
    def __init__(self, *, api_key: str, http_post: HttpPost | None = None) -> None:
        self._api_key = api_key
        self._http_post = http_post or _default_http_post

    def grant(self) -> tuple[str, int]:
        data = self._http_post(
            "https://api.deepgram.com/v1/auth/grant",
            {"Authorization": f"Token {self._api_key}"},
            {"ttl_seconds": TTL_SECONDS},
        )
        return data["access_token"], int(data.get("expires_in", TTL_SECONDS))
