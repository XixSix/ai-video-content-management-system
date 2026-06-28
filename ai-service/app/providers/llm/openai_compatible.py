import json
import re
from typing import Any

import httpx


class OpenAICompatibleChatClientError(RuntimeError):
    """Raised when an OpenAI-compatible chat endpoint cannot return JSON."""


class OpenAICompatibleChatClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        model_name: str,
        timeout_seconds: float,
        temperature: float,
        max_tokens: int,
        http_client: Any | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key.strip()
        self._model_name = model_name
        self._timeout_seconds = timeout_seconds
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._http_client = http_client or httpx.Client(timeout=timeout_seconds)

        if not self._base_url:
            raise ValueError("LLM base URL must not be empty")

    @property
    def model_name(self) -> str:
        return self._model_name

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
    ) -> Any:
        """Call chat completions and parse the assistant content as JSON.

        The client intentionally keeps the wire shape OpenAI-compatible so the
        same provider can point at vLLM, SGLang, local tunnels, or hosted
        endpoints. The model is prompted to return JSON only; any non-JSON
        content is rejected instead of repaired here.
        """
        payload = {
            "model": self._model_name,
            "messages": [
                {"role": "system", "content": system_prompt.strip()},
                {
                    "role": "user",
                    "content": json.dumps(
                        user_payload,
                        ensure_ascii=False,
                        sort_keys=True,
                    ),
                },
            ],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "response_format": {"type": "json_object"},
        }
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        try:
            response = self._http_client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=self._timeout_seconds,
            )
            response.raise_for_status()
            response_payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise OpenAICompatibleChatClientError(
                "OpenAI-compatible chat request failed"
            ) from exc

        content = _extract_message_content(response_payload)
        return _parse_json_content(content)


def _extract_message_content(response_payload: Any) -> str:
    """Return the first assistant message content from a chat response."""
    try:
        content = response_payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenAICompatibleChatClientError(
            "OpenAI-compatible chat response missing message content"
        ) from exc

    if not isinstance(content, str):
        raise OpenAICompatibleChatClientError(
            "OpenAI-compatible chat message content must be a string"
        )

    return content.strip()


def _parse_json_content(content: str) -> Any:
    """Parse JSON content, tolerating common markdown wrappers."""
    candidates = [
        content,
        _strip_markdown_json_fence(content),
        _extract_json_object(content),
    ]

    for candidate in candidates:
        if not candidate:
            continue

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    raise OpenAICompatibleChatClientError(
        "OpenAI-compatible chat response was not valid JSON"
    )


def _strip_markdown_json_fence(content: str) -> str | None:
    match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", content, flags=re.DOTALL)
    return match.group(1).strip() if match else None


def _extract_json_object(content: str) -> str | None:
    start = content.find("{")
    end = content.rfind("}")
    if start < 0 or end <= start:
        return None

    return content[start : end + 1].strip()
