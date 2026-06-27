from typing import Protocol

from app.provider_contracts.audio_decoder import AudioWaveform


class AudioPreprocessorPort(Protocol):
    def preprocess(
        self,
        *,
        audio: AudioWaveform,
        target_sample_rate: int | None = None,
    ) -> AudioWaveform: ...
