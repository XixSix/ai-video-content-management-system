from __future__ import annotations

from typing import Protocol

from app.provider_contracts.audio_decoder import AudioWaveform
from app.schemas.transcript import TranscriptResult


class AsrPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def warm_up(self) -> None: ...

    def transcribe(self, audio: AudioWaveform, language: str | None) -> TranscriptResult: ...
