from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.vad import SpeechRegion


class NoopVad:
    @property
    def model_name(self) -> str:
        return ""

    def warm_up(self) -> None:
        return None

    def has_speech(self, audio: AudioWaveform) -> bool:
        return False

    def detect_speech_regions(self, audio: AudioWaveform) -> list[SpeechRegion]:
        return []
