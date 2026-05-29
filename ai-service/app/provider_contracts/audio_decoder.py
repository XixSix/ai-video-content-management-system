from __future__ import annotations

from pathlib import Path
from typing import Protocol

from pydantic import BaseModel, ConfigDict


class AudioWaveform(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    source_name: str
    sample_rate: int
    channels: int
    duration_seconds: float | None = None
    samples: tuple[float, ...] = ()


class AudioDecoderPort(Protocol):
    def decode(self, local_path: Path) -> AudioWaveform: ...

