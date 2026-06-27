from __future__ import annotations

from pathlib import Path
from collections.abc import Sequence
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

    def transcribe_audio(
        self,
        *,
        samples: Sequence[float],
        sample_rate: int,
        language: str | None,
    ) -> TranscriptResult: ...
