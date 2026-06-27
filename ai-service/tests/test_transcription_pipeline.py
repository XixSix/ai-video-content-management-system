from pathlib import Path

import pytest

from app.provider_contracts.audio_decoder import AudioWaveform
from app.provider_contracts.diarization import DiarizedTurn, OfflineDiarizationAnalysis
from app.provider_contracts.vad import SpeechRegion
from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult
from app.schemas.transcription_request import (
    TranscriptionOptionsInput,
    TranscriptionRequest,
)
from app.workflows.transcription.config import TranscriptionPipelineConfig
from app.workflows.transcription.errors import UnsupportedAsrStrategyError
from app.workflows.transcription.pipeline import (
    ASR_STRATEGY_DIARIZED_TURNS,
    ASR_STRATEGY_VAD_CHUNKED,
    run_transcription_pipeline,
    select_transcription_pipeline,
)
from app.workflows.transcription.pipelines.diarized_turns import (
    run_diarized_turns_pipeline,
)
from app.workflows.transcription.pipelines.vad_chunked import run_vad_chunked_pipeline


def test_selects_diarized_turns_pipeline() -> None:
    assert (
        select_transcription_pipeline(ASR_STRATEGY_DIARIZED_TURNS)
        is run_diarized_turns_pipeline
    )


def test_selects_vad_chunked_pipeline() -> None:
    assert (
        select_transcription_pipeline(ASR_STRATEGY_VAD_CHUNKED)
        is run_vad_chunked_pipeline
    )


def test_rejects_unknown_asr_strategy() -> None:
    with pytest.raises(UnsupportedAsrStrategyError):
        select_transcription_pipeline("unknown")


def test_vad_chunked_pipeline_decides_preprocessing_steps(tmp_path: Path) -> None:
    calls: list[str] = []
    separated_path = tmp_path / "vocals.wav"
    request = _request(
        tmp_path / "audio.wav",
        enable_source_separation=True,
        enable_vad=True,
        enable_diarization=False,
    )

    result = run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_VAD_CHUNKED,
        request=request,
        audio_decoder=_RecordingAudioDecoder(calls),
        audio_preprocessor=_RecordingAudioPreprocessor(calls),
        source_separator=_RecordingSourceSeparator(calls, separated_path),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
        config=_config(),
    )

    assert calls == [
        "source_separation",
        "decode:vocals.wav",
        "preprocess:vocals.wav",
        "vad",
        "asr_audio:4",
        "asr_audio:2",
    ]
    assert result.source_separation_model == "htdemucs"
    assert result.full_text == "placeholder:4 samples placeholder:2 samples"
    assert [
        (segment.start_seconds, segment.end_seconds) for segment in result.segments
    ] == [
        (0.002, 1.002),
        (0.007, 1.007),
    ]


def test_vad_chunked_pipeline_skips_source_separation_when_disabled(
    tmp_path: Path,
) -> None:
    calls: list[str] = []
    original_path = tmp_path / "audio.wav"
    request = _request(
        original_path,
        enable_source_separation=False,
        enable_vad=True,
        enable_diarization=False,
    )

    result = run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_VAD_CHUNKED,
        request=request,
        audio_decoder=_RecordingAudioDecoder(calls),
        audio_preprocessor=_RecordingAudioPreprocessor(calls),
        source_separator=_RecordingSourceSeparator(calls, tmp_path / "vocals.wav"),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
        config=_config(),
    )

    assert calls == [
        "decode:audio.wav",
        "preprocess:audio.wav",
        "vad",
        "asr_audio:4",
        "asr_audio:2",
    ]
    assert result.source_separation_model == ""
    assert result.full_text == "placeholder:4 samples placeholder:2 samples"


def test_diarized_turns_pipeline_decides_preprocessing_steps(tmp_path: Path) -> None:
    calls: list[str] = []
    separated_path = tmp_path / "vocals.wav"
    request = _request(
        tmp_path / "audio.wav",
        enable_source_separation=True,
        enable_vad=True,
        enable_diarization=True,
    )

    result = run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_DIARIZED_TURNS,
        request=request,
        audio_decoder=_RecordingAudioDecoder(calls),
        audio_preprocessor=_RecordingAudioPreprocessor(calls),
        source_separator=_RecordingSourceSeparator(calls, separated_path),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
        config=_config(),
    )

    assert calls == [
        "source_separation",
        "decode:vocals.wav",
        "preprocess:vocals.wav",
        "diarization",
        "asr_audio:4",
        "asr_audio:2",
    ]
    assert result.source_separation_model == "htdemucs"
    assert result.diarization_model == "pyannote"
    assert result.full_text == "placeholder:4 samples placeholder:2 samples"


def test_diarized_turns_pipeline_falls_back_to_vad_chunked_when_no_windows(
    tmp_path: Path,
) -> None:
    calls: list[str] = []
    request = _request(
        tmp_path / "audio.wav",
        enable_source_separation=False,
        enable_vad=True,
        enable_diarization=True,
    )

    result = run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_DIARIZED_TURNS,
        request=request,
        audio_decoder=_RecordingAudioDecoder(calls),
        audio_preprocessor=_RecordingAudioPreprocessor(calls),
        source_separator=_RecordingSourceSeparator(calls, tmp_path / "vocals.wav"),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls, turns=[]),
        asr=_RecordingAsr(calls),
        config=_config(),
    )

    assert calls == [
        "decode:audio.wav",
        "preprocess:audio.wav",
        "diarization",
        "decode:audio.wav",
        "preprocess:audio.wav",
        "vad",
        "asr_audio:4",
        "asr_audio:2",
    ]
    assert result.diarization_model == ""
    assert result.full_text == "placeholder:4 samples placeholder:2 samples"


def _request(
    local_path: Path,
    *,
    enable_source_separation: bool,
    enable_vad: bool,
    enable_diarization: bool,
) -> TranscriptionRequest:
    return TranscriptionRequest(
        request_id="job-1",
        local_path=local_path,
        filename=local_path.name,
        content_type="audio/wav",
        options=TranscriptionOptionsInput(
            language="en",
            enable_source_separation=enable_source_separation,
            enable_vad=enable_vad,
            enable_diarization=enable_diarization,
        ),
    )


def _config() -> TranscriptionPipelineConfig:
    return TranscriptionPipelineConfig(
        vad_sample_rate=1_000,
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
        self._calls.append(f"decode:{local_path.name}")
        return AudioWaveform(
            source_name=local_path.name,
            sample_rate=1_000,
            channels=1,
            samples=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9),
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
        return "htdemucs"

    def __init__(self, calls: list[str], separated_path: Path) -> None:
        self._calls = calls
        self._separated_path = separated_path

    def warm_up(self) -> None:
        return None

    def separate(self, local_path: Path) -> Path:
        _ = local_path
        self._calls.append("source_separation")
        return self._separated_path


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
        return [
            SpeechRegion(start_sample=2, end_sample=6),
            SpeechRegion(start_sample=7, end_sample=9),
        ]


class _RecordingDiarizer:
    @property
    def model_name(self) -> str:
        return "pyannote"

    def __init__(
        self,
        calls: list[str],
        *,
        turns: list[DiarizedTurn] | None = None,
    ) -> None:
        self._calls = calls
        self._turns = (
            [
                DiarizedTurn(start_sample=2, end_sample=6),
                DiarizedTurn(start_sample=7, end_sample=9),
            ]
            if turns is None
            else turns
        )

    def warm_up(self) -> None:
        return None

    def analyze_offline_audio(
        self,
        audio: AudioWaveform,
    ) -> OfflineDiarizationAnalysis:
        _ = audio
        self._calls.append("diarization")
        return OfflineDiarizationAnalysis(
            speech_regions=[
                SpeechRegion(start_sample=turn.start_sample, end_sample=turn.end_sample)
                for turn in self._turns
            ],
            turns=self._turns,
        )


class _RecordingAsr:
    @property
    def model_name(self) -> str:
        return "recording-asr"

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def warm_up(self) -> None:
        return None

    def transcribe(
        self,
        *,
        local_path: Path,
        language: str | None,
    ) -> TranscriptResult:
        self._calls.append("asr")
        return TranscriptResult(
            language=language or "en",
            full_text=f"placeholder:{local_path}",
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
    ) -> TranscriptResult:
        _ = sample_rate
        self._calls.append(f"asr_audio:{len(samples)}")
        text = f"placeholder:{len(samples)} samples"
        return TranscriptResult(
            language=language or "en",
            full_text=text,
            segments=[
                TranscriptSegmentResult(
                    segment_id="seg-0001",
                    start_seconds=0.0,
                    end_seconds=1.0,
                    text=text,
                )
            ],
            asr_model=self.model_name,
        )
