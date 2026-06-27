from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.vad import SpeechRegion


@dataclass(frozen=True, slots=True)
class DiarizedTurn:
    start_sample: int
    end_sample: int

    @property
    def duration_samples(self) -> int:
        return max(0, self.end_sample - self.start_sample)


@dataclass(frozen=True, slots=True)
class OfflineDiarizationAnalysis:
    speech_regions: list[SpeechRegion]
    turns: list[DiarizedTurn]


class DiarizationPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def warm_up(self) -> None: ...

    def analyze_offline_audio(
        self,
        audio: AudioWaveform,
    ) -> OfflineDiarizationAnalysis: ...
