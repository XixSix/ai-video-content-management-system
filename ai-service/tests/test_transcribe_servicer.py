from pathlib import Path
from types import SimpleNamespace

import grpc
import pytest
import torch

from app.core.config import Settings
from app.grpc.transcribe_servicer import TranscribeServicer
from app.providers.audio import torchaudio_decoder
from app.runtime.container import build_transcribe_workflow
from app.schemas.transcript import (
    TranscriptResult,
    TranscriptSegmentResult,
    TranscriptWordResult,
)
from transcribe.v1 import transcribe_pb2


class AbortError(Exception):
    def __init__(self, code: grpc.StatusCode, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(details)


class FakeContext:
    def abort(self, code: grpc.StatusCode, details: str) -> None:
        raise AbortError(code, details)


class FailingWorkflow:
    def execute(self, request: object) -> TranscriptResult:
        _ = request
        raise RuntimeError("asr unavailable")


def _request(audio_path: Path) -> transcribe_pb2.TranscribeRequest:
    return transcribe_pb2.TranscribeRequest(
        job_id="job-1",
        audio=transcribe_pb2.AudioSource(local_path=str(audio_path)),
        options=transcribe_pb2.TranscribeOptions(
            language="en",
            vad=transcribe_pb2.VADOptions(enabled=True),
            diarization=transcribe_pb2.DiarizationOptions(enabled=False),
            source_separation=transcribe_pb2.SourceSeparationOptions(enabled=False),
        ),
    )


def test_transcribe_returns_noop_response(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "info",
        lambda path: SimpleNamespace(
            sample_rate=16_000,
            num_channels=1,
            num_frames=2,
        ),
        raising=False,
    )
    monkeypatch.setattr(
        torchaudio_decoder.torchaudio,
        "load",
        lambda path: (torch.tensor([[0.0, 0.1]], dtype=torch.float32), 16_000),
    )

    workflow = build_transcribe_workflow(
        Settings(
            asr_provider="noop",
            asr_language="en",
            audio_decoder_provider="torchaudio",
        )
    )
    request = _request(audio_path)
    request.options.vad.enabled = False
    response = TranscribeServicer(workflow).Transcribe(request, FakeContext())

    assert response.job_id == "job-1"
    assert response.status == transcribe_pb2.TRANSCRIBE_STATUS_COMPLETED
    assert response.language == "en"
    assert response.asr_model == ""
    assert len(response.segments) == 1
    assert response.segments[0].start_seconds == 0.0


def test_transcribe_option_defaults_word_timestamps_to_false(
    tmp_path: Path,
) -> None:
    request = _request(tmp_path / "audio.wav")

    mapped = TranscribeServicer()._map_request(request)

    assert mapped.options.enable_word_timestamps is False


def test_maps_enabled_word_timestamp_option(tmp_path: Path) -> None:
    request = _request(tmp_path / "audio.wav")
    request.options.word_timestamps.enabled = True

    mapped = TranscribeServicer()._map_request(request)

    assert mapped.options.enable_word_timestamps is True


def test_maps_word_timestamps_to_grpc_response() -> None:
    result = TranscriptResult(
        language="en",
        full_text="hello",
        segments=[
            TranscriptSegmentResult(
                segment_id="seg-0001",
                start_seconds=1.0,
                end_seconds=2.0,
                text="hello",
                words=[
                    TranscriptWordResult(
                        word_id="word-000001",
                        start_seconds=1.1,
                        end_seconds=1.5,
                        text="hello",
                        confidence=0.92,
                    )
                ],
            )
        ],
        asr_model="small",
    )

    response = TranscribeServicer()._map_response(
        request_id="job-1",
        result=result,
    )

    assert response.segments[0].words[0].start_seconds == 1.1
    assert response.segments[0].words[0].confidence == pytest.approx(0.92)


@pytest.mark.parametrize(
    ("job_id", "local_path"),
    [
        ("", "/tmp/audio.wav"),
        ("job-1", ""),
    ],
)
def test_transcribe_rejects_missing_required_fields(
    job_id: str,
    local_path: str,
) -> None:
    request = transcribe_pb2.TranscribeRequest(
        job_id=job_id,
        audio=transcribe_pb2.AudioSource(local_path=local_path),
    )

    with pytest.raises(AbortError) as error:
        TranscribeServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_missing_local_path(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.wav"

    with pytest.raises(AbortError) as error:
        TranscribeServicer().Transcribe(_request(missing_path), FakeContext())

    assert error.value.code == grpc.StatusCode.NOT_FOUND


def test_transcribe_returns_failed_response_for_workflow_error(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")

    response = TranscribeServicer(workflow=FailingWorkflow()).Transcribe(
        _request(audio_path),
        FakeContext(),
    )

    assert response.job_id == "job-1"
    assert response.status == transcribe_pb2.TRANSCRIBE_STATUS_FAILED
    assert (
        response.error.code == transcribe_pb2.TRANSCRIBE_ERROR_CODE_ASR_PROVIDER_FAILED
    )
    assert response.error.retryable is True


def test_transcribe_rejects_directory_local_path(tmp_path: Path) -> None:
    request = _request(tmp_path)

    with pytest.raises(AbortError) as error:
        TranscribeServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_empty_local_path(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"")

    with pytest.raises(AbortError) as error:
        TranscribeServicer().Transcribe(_request(audio_path), FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
