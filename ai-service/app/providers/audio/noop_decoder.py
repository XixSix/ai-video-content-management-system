from pathlib import Path

from app.provider_contracts.audio_decoder import AudioWaveform


class NoopAudioDecoder:
    def decode(self, local_path: Path) -> AudioWaveform:
        return AudioWaveform(
            source_name=local_path.name,
            sample_rate=0,
            channels=0,
            duration_seconds=None,
        )
