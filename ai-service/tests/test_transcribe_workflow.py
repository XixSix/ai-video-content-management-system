from pathlib import Path

from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.diarization import OfflineDiarizationAnalysis
from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult
from app.schemas.transcribe import (
    TranscribeOptionsInput,
    TranscribeRequest,
)
from app.provider_contracts.vad import SpeechRegion
from app.workflows.transcribe.config import TranscribePipelineConfig
from app.workflows.transcribe.workflow import TranscribeWorkflow


def test_workflow_runs_audio_preprocessing_inside_pipeline(
    tmp_path: Path,
) -> None:
    calls: list[str] = []
    request = TranscribeRequest(
        request_id="job-1",
        local_path=tmp_path / "audio.wav",
        options=TranscribeOptionsInput(
            language="en",
            enable_vad=True,
            enable_diarization=False,
            enable_source_separation=True,
        ),
    )
    workflow = TranscribeWorkflow(
        audio_decoder=_RecordingAudioDecoder(calls),
        audio_preprocessor=_RecordingAudioPreprocessor(calls),
        source_separator=_RecordingSourceSeparator(calls),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
        config=_config(),
    )

    workflow.execute(request)

    assert calls == [
        "source_separation",
        "decode_audio:audio.wav",
        "preprocess:audio.wav",
        "vad",
        "asr_audio",
    ]


def _config() -> TranscribePipelineConfig:
    return TranscribePipelineConfig(
        vad_sample_rate=16_000,
        vad_min_total_speech_ms=0.0,
        vad_min_speech_ratio=0.0,
        offline_asr_pad_seconds=0.0,
        offline_asr_merge_gap_seconds=0.0,
        offline_asr_max_window_seconds=10.0,
        offline_asr_min_window_seconds=0.0,
    )


class _RecordingAudioDecoder:
    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def decode(self, local_path: Path) -> AudioWaveform:
        self._calls.append(f"decode_audio:{local_path.name}")
        return AudioWaveform(
            source_name=local_path.name,
            sample_rate=16_000,
            channels=1,
            samples=(0.0, 0.1),
        )


class _RecordingAudioPreprocessor:
    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def preprocess(
        self,
        *,
        audio: AudioWaveform,
        target_sample_rate: int | None = None,
    ) -> AudioWaveform:
        _ = target_sample_rate
        self._calls.append(f"preprocess:{audio.source_name}")
        return audio


class _RecordingSourceSeparator:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def warm_up(self) -> None:
        return None

    def separate(self, local_path: Path) -> Path:
        self._calls.append("source_separation")
        return local_path


class _RecordingVad:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def warm_up(self) -> None:
        return None

    def has_speech(self, audio: object) -> bool:
        self._calls.append("vad")
        return False

    def detect_speech_regions(self, audio: object) -> list[SpeechRegion]:
        _ = audio
        self._calls.append("vad")
        return [SpeechRegion(start_sample=0, end_sample=2)]


class _RecordingDiarizer:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def warm_up(self) -> None:
        return None

    def analyze_offline_audio(
        self,
        audio: AudioWaveform,
    ) -> OfflineDiarizationAnalysis:
        _ = audio
        self._calls.append("diarization")
        return OfflineDiarizationAnalysis(speech_regions=[], turns=[])


class _RecordingAsr:
    @property
    def model_name(self) -> str:
        return "recording-asr"

    def warm_up(self) -> None:
        return None

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        _ = enable_word_timestamps
        self._calls.append("asr")
        return TranscriptResult(
            language=language or "en",
            full_text="placeholder",
            segments=[
                TranscriptSegmentResult(
                    segment_id="seg-0001",
                    start_seconds=0.0,
                    end_seconds=1.0,
                    text="placeholder",
                )
            ],
            asr_model=self.model_name,
        )

    def transcribe_audio(
        self,
        *,
        samples: tuple[float, ...],
        sample_rate: int,
        language: str | None,
        enable_word_timestamps: bool = False,
    ) -> TranscriptResult:
        _ = samples, sample_rate, enable_word_timestamps
        self._calls.append("asr_audio")
        return TranscriptResult(
            language=language or "en",
            full_text="placeholder",
            segments=[
                TranscriptSegmentResult(
                    segment_id="seg-0001",
                    start_seconds=0.0,
                    end_seconds=1.0,
                    text="placeholder",
                )
            ],
            asr_model=self.model_name,
        )
