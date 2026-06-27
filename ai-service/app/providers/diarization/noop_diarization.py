from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.diarization import OfflineDiarizationAnalysis


class NoopDiarization:
    @property
    def model_name(self) -> str:
        return ""

    def warm_up(self) -> None:
        return None

    def analyze_offline_audio(
        self,
        audio: AudioWaveform,
    ) -> OfflineDiarizationAnalysis:
        _ = audio
        return OfflineDiarizationAnalysis(speech_regions=[], turns=[])
