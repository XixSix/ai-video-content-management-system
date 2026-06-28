import httpx
import pytest

from app.providers.llm.openai_compatible import (
    OpenAICompatibleChatClient,
    OpenAICompatibleChatClientError,
)


def test_client_posts_chat_completion_and_parses_json_without_auth_header() -> None:
    http_client = _FakeHttpClient(
        _FakeResponse({"choices": [{"message": {"content": '{"ok": true}'}}]})
    )
    client = OpenAICompatibleChatClient(
        base_url="https://llm.example.test/v1/",
        api_key="",
        model_name="Qwen/Qwen3-8B",
        timeout_seconds=12,
        temperature=0,
        max_tokens=256,
        http_client=http_client,
    )

    result = client.complete_json(
        system_prompt="Return JSON only.",
        user_payload={"input": "hello"},
    )

    assert result == {"ok": True}
    assert http_client.url == "https://llm.example.test/v1/chat/completions"
    assert "Authorization" not in http_client.headers
    assert http_client.json["model"] == "Qwen/Qwen3-8B"
    assert http_client.json["temperature"] == 0
    assert http_client.json["max_tokens"] == 256
    assert http_client.json["messages"][1]["content"] == '{"input": "hello"}'


def test_client_sends_auth_header_when_api_key_is_configured() -> None:
    http_client = _FakeHttpClient(
        _FakeResponse({"choices": [{"message": {"content": '{"ok": true}'}}]})
    )
    client = OpenAICompatibleChatClient(
        base_url="https://llm.example.test/v1",
        api_key=" token ",
        model_name="Qwen/Qwen3-8B",
        timeout_seconds=12,
        temperature=0,
        max_tokens=256,
        http_client=http_client,
    )

    client.complete_json(system_prompt="Return JSON only.", user_payload={})

    assert http_client.headers["Authorization"] == "Bearer token"


def test_client_raises_for_http_failure() -> None:
    client = OpenAICompatibleChatClient(
        base_url="https://llm.example.test/v1",
        api_key="",
        model_name="Qwen/Qwen3-8B",
        timeout_seconds=12,
        temperature=0,
        max_tokens=256,
        http_client=_FailingHttpClient(),
    )

    with pytest.raises(OpenAICompatibleChatClientError):
        client.complete_json(system_prompt="Return JSON only.", user_payload={})


def test_client_raises_for_malformed_json_content() -> None:
    client = OpenAICompatibleChatClient(
        base_url="https://llm.example.test/v1",
        api_key="",
        model_name="Qwen/Qwen3-8B",
        timeout_seconds=12,
        temperature=0,
        max_tokens=256,
        http_client=_FakeHttpClient(
            _FakeResponse({"choices": [{"message": {"content": "not-json"}}]})
        ),
    )

    with pytest.raises(OpenAICompatibleChatClientError):
        client.complete_json(system_prompt="Return JSON only.", user_payload={})


class _FakeHttpClient:
    def __init__(self, response: "_FakeResponse") -> None:
        self._response = response
        self.url = ""
        self.json: dict[str, object] = {}
        self.headers: dict[str, str] = {}

    def post(
        self,
        url: str,
        *,
        json: dict[str, object],
        headers: dict[str, str],
        timeout: float,
    ) -> "_FakeResponse":
        _ = timeout
        self.url = url
        self.json = json
        self.headers = headers
        return self._response


class _FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


class _FailingHttpClient:
    def post(
        self,
        url: str,
        *,
        json: dict[str, object],
        headers: dict[str, str],
        timeout: float,
    ) -> "_FakeResponse":
        _ = url, json, headers, timeout
        raise httpx.TimeoutException("timeout")
