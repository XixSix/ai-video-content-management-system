from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from app.provider_contracts.audio_decoder import AudioWaveform


@dataclass(frozen=True, slots=True)
class SpeechRegion:
    start_sample: int
    end_sample: int

    @property
    def duration_samples(self) -> int:
        return max(0, self.end_sample - self.start_sample)


@runtime_checkable
class VadPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def warm_up(self) -> None: ...

    def has_speech(self, audio: AudioWaveform) -> bool: ...

    def detect_speech_regions(self, audio: AudioWaveform) -> list[SpeechRegion]:
        """Detect speech regions in a mono float32 waveform."""
        ...
