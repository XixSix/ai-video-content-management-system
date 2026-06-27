from pathlib import Path
from types import SimpleNamespace

import grpc
import pytest
import torch

from app.core.config import Settings
from app.grpc.transcription_servicer import TranscriptionServicer
from app.providers.audio import torchaudio_decoder
from app.runtime.container import build_transcription_workflow
from transcription.v1 import transcription_pb2


class AbortError(Exception):
    def __init__(self, code: grpc.StatusCode, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(details)


class FakeContext:
    def abort(self, code: grpc.StatusCode, details: str) -> None:
        raise AbortError(code, details)


def _request(audio_path: Path) -> transcription_pb2.TranscribeRequest:
    return transcription_pb2.TranscribeRequest(
        request_id="job-1",
        local_path=str(audio_path),
        filename=audio_path.name,
        content_type="audio/wav",
        options=transcription_pb2.TranscriptionOptions(
            language="en",
            enable_vad=True,
            enable_diarization=False,
            enable_source_separation=False,
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

    workflow = build_transcription_workflow(
        Settings(
            asr_provider="noop",
            asr_language="en",
            audio_decoder_provider="torchaudio",
        )
    )
    request = _request(audio_path)
    request.options.enable_vad = False
    response = TranscriptionServicer(workflow).Transcribe(request, FakeContext())

    assert response.request_id == "job-1"
    assert response.language == "en"
    assert response.asr_model == ""
    assert response.full_text
    assert len(response.segments) == 1
    assert response.segments[0].start_seconds == 0.0


@pytest.mark.parametrize(
    ("request_id", "local_path"),
    [
        ("", "/tmp/audio.wav"),
        ("job-1", ""),
    ],
)
def test_transcribe_rejects_missing_required_fields(
    request_id: str,
    local_path: str,
) -> None:
    request = transcription_pb2.TranscribeRequest(
        request_id=request_id,
        local_path=local_path,
    )

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_missing_local_path(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.wav"

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(_request(missing_path), FakeContext())

    assert error.value.code == grpc.StatusCode.NOT_FOUND


@pytest.mark.parametrize(
    ("filename", "content_type"),
    [
        ("", "audio/wav"),
        ("audio.wav", ""),
    ],
)
def test_transcribe_rejects_missing_file_metadata(
    tmp_path: Path,
    filename: str,
    content_type: str,
) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")
    request = _request(audio_path)
    request.filename = filename
    request.content_type = content_type

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_path_like_filename(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"wav")
    request = _request(audio_path)
    request.filename = "../audio.wav"

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_unsupported_content_type(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.txt"
    audio_path.write_text("not media")
    request = _request(audio_path)
    request.content_type = "text/plain"

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_directory_local_path(tmp_path: Path) -> None:
    request = _request(tmp_path)
    request.filename = "audio.wav"

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_transcribe_rejects_empty_local_path(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"")

    with pytest.raises(AbortError) as error:
        TranscriptionServicer().Transcribe(_request(audio_path), FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
