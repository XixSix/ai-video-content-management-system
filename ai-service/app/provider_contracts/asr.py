from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.schemas.transcript import TranscriptResult


class AsrPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def warm_up(self) -> None: ...

    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
    ) -> TranscriptResult: ...
