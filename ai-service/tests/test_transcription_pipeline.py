from pathlib import Path

import pytest

from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult
from app.schemas.transcription_request import (
    TranscriptionOptionsInput,
    TranscriptionRequest,
)
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
    request = _request(
        tmp_path / "audio.wav",
        enable_source_separation=True,
        enable_vad=True,
        enable_diarization=False,
    )

    run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_VAD_CHUNKED,
        request=request,
        normalizer=_RecordingNormalizer(calls),
        source_separator=_RecordingSourceSeparator(calls),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
    )

    assert calls == ["normalize", "source_separation", "vad", "asr"]


def test_diarized_turns_pipeline_decides_preprocessing_steps(tmp_path: Path) -> None:
    calls: list[str] = []
    request = _request(
        tmp_path / "audio.wav",
        enable_source_separation=True,
        enable_vad=True,
        enable_diarization=True,
    )

    run_transcription_pipeline(
        asr_strategy=ASR_STRATEGY_DIARIZED_TURNS,
        request=request,
        normalizer=_RecordingNormalizer(calls),
        source_separator=_RecordingSourceSeparator(calls),
        vad=_RecordingVad(calls),
        diarizer=_RecordingDiarizer(calls),
        asr=_RecordingAsr(calls),
    )

    assert calls == ["normalize", "source_separation", "diarization", "asr"]


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
            language="vi",
            enable_source_separation=enable_source_separation,
            enable_vad=enable_vad,
            enable_diarization=enable_diarization,
        ),
    )


class _RecordingNormalizer:
    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def normalize(self, local_path: Path) -> Path:
        self._calls.append("normalize")
        return local_path


class _RecordingSourceSeparator:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def separate(self, local_path: Path) -> Path:
        self._calls.append("source_separation")
        return local_path


class _RecordingVad:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def apply(self, local_path: Path) -> Path:
        self._calls.append("vad")
        return local_path


class _RecordingDiarizer:
    @property
    def model_name(self) -> str:
        return ""

    def __init__(self, calls: list[str]) -> None:
        self._calls = calls

    def diarize(self, local_path: Path) -> Path:
        self._calls.append("diarization")
        return local_path


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
            language=language or "vi",
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
