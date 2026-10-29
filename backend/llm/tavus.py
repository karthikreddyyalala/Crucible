"""Thin Tavus client for creating a Conversational Video Interface session.

The Tavus API key is a paid credential and lives only here (server-side). The
route hands the browser just the ephemeral `conversation_url` (a Daily room),
never the key. `http_post` is injectable so tests never hit the network.
"""
from typing import Any, Callable, Protocol


class TavusSession(Protocol):
    conversation_id: str
    conversation_url: str


class TavusResult:
    def __init__(self, conversation_id: str, conversation_url: str) -> None:
        self.conversation_id = conversation_id
        self.conversation_url = conversation_url


# (url, headers, json_body) -> parsed json dict
HttpPost = Callable[[str, dict, dict], dict[str, Any]]


def _default_http_post(url: str, headers: dict, json_body: dict) -> dict[str, Any]:
    import urllib.error
    import urllib.request
    import json

    data = json.dumps(json_body).encode()
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310 — fixed tavus host
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as error:
        # Tavus explains a 400 in the body (e.g. too many open conversations); keep it in the logs.
        raise RuntimeError(f"Tavus {error.code}: {error.read().decode(errors='replace')[:300]}") from error


class TavusClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://tavusapi.com",
        http_post: HttpPost | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._http_post = http_post or _default_http_post

    def create_conversation(
        self, *, replica_id: str, persona_id: str = "", conversation_name: str = "Crucible interview"
    ) -> TavusResult:
        body: dict[str, Any] = {"replica_id": replica_id, "conversation_name": conversation_name}
        if persona_id:
            body["persona_id"] = persona_id
        data = self._http_post(
            f"{self._base_url}/v2/conversations",
            {"x-api-key": self._api_key},
            body,
        )
        return TavusResult(
            conversation_id=data["conversation_id"],
            conversation_url=data["conversation_url"],
        )

    def end_conversation(self, conversation_id: str) -> None:
        # Ending the conversation stops the billed video session. Best-effort:
        # callers swallow failures so cleanup never breaks the user's exit.
        self._http_post(
            f"{self._base_url}/v2/conversations/{conversation_id}/end",
            {"x-api-key": self._api_key},
            {},
        )
