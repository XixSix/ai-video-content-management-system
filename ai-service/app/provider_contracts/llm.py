from typing import Any, Protocol


class JsonChatClientPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
    ) -> Any: ...
