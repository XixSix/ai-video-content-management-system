from pathlib import Path

import grpc
import pytest

from app.schemas.transcript.output import TranscriptJobOptions
from app.services import ai_service
from app.services.ai_service import AIServiceTerminalError
from app.utils import ai_transcription_mapper
from transcription.v1 import transcription_pb2


def _options() -> TranscriptJobOptions:
    return TranscriptJobOptions.model_validate(
        {
            "language": "en",
            "useVad": True,
            "useDiarization": True,
            "sourceSeparation": False,
        }
    )


def _response(request_id: str = "job-1") -> transcription_pb2.TranscribeResponse:
    return transcription_pb2.TranscribeResponse(
        request_id=request_id,
        full_text="Hello world",
        language="en",
        asr_model="ai-service-mock-transcriber-v1",
        segments=[
            transcription_pb2.TranscriptSegment(
                segment_id="seg-1",
                start_seconds=0.0,
                end_seconds=1.0,
                text="Hello",
            ),
            transcription_pb2.TranscriptSegment(
                segment_id="seg-2",
                start_seconds=1.0,
                end_seconds=2.0,
                text="world",
            ),
        ],
    )


def test_build_request_maps_transcript_options(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"

    request = ai_transcription_mapper.build_transcribe_request(
        request_id="job-1",
        audio_path=audio_path,
        options=_options(),
    )

    assert request.request_id == "job-1"
    assert request.local_path == str(audio_path)
    assert request.filename == "audio.wav"
    assert request.content_type == "audio/wav"
    assert request.options.language == "en"
    assert request.options.enable_vad is True
    assert request.options.enable_diarization is True
    assert request.options.enable_source_separation is False


def test_map_response_returns_transcript_result() -> None:
    result = ai_transcription_mapper.map_transcribe_response(
        request_id="job-1",
        response=_response(),
    )

    assert result.language == "en"
    assert result.source == "IMPORTED"
    assert result.model == "ai-service-mock-transcriber-v1"
    assert result.full_text == "Hello world"
    assert result.word_count == 2
    assert len(result.segments) == 2


def test_map_response_rejects_mismatched_request_id() -> None:
    with pytest.raises(ValueError, match="request_id does not match"):
        ai_transcription_mapper.map_transcribe_response(
            request_id="job-1",
            response=_response(request_id="other-job"),
        )


def test_map_response_rejects_empty_segments() -> None:
    response = transcription_pb2.TranscribeResponse(
        request_id="job-1",
        full_text="",
        language="en",
        asr_model="ai-service-mock-transcriber-v1",
    )

    with pytest.raises(ValueError, match="did not include transcript segments"):
        ai_transcription_mapper.map_transcribe_response(request_id="job-1", response=response)


class FakeRpcError(grpc.RpcError):
    def __init__(self, code: grpc.StatusCode) -> None:
        self._code = code

    def code(self) -> grpc.StatusCode:
        return self._code

    def details(self) -> str:
        return "grpc failure"


class FakeChannel:
    def __enter__(self) -> "FakeChannel":
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        return None


class RaisingStub:
    def __init__(self, error: grpc.RpcError) -> None:
        self.error = error

    def Transcribe(
        self,
        request: transcription_pb2.TranscribeRequest,
        *,
        timeout: int,
    ) -> transcription_pb2.TranscribeResponse:
        raise self.error


class RespondingStub:
    def __init__(self, response: transcription_pb2.TranscribeResponse) -> None:
        self.response = response

    def Transcribe(
        self,
        request: transcription_pb2.TranscribeRequest,
        *,
        timeout: int,
    ) -> transcription_pb2.TranscribeResponse:
        return self.response


def test_client_maps_terminal_grpc_error(monkeypatch: pytest.MonkeyPatch) -> None:
    grpc_error = FakeRpcError(grpc.StatusCode.NOT_FOUND)
    monkeypatch.setattr(ai_service.grpc, "insecure_channel", lambda target: FakeChannel())
    monkeypatch.setattr(
        ai_service.transcription_pb2_grpc,
        "TranscriptionServiceStub",
        lambda channel: RaisingStub(grpc_error),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        ai_service.AIServiceClient(target="unused").transcribe(
            request_id="job-1",
            audio_path=Path("audio.wav"),
            options=_options(),
        )

    assert error.value.error_code == "AI_SERVICE_NOT_FOUND"


def test_client_maps_invalid_response_to_terminal_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_service.grpc, "insecure_channel", lambda target: FakeChannel())
    monkeypatch.setattr(
        ai_service.transcription_pb2_grpc,
        "TranscriptionServiceStub",
        lambda channel: RespondingStub(_response(request_id="other-job")),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        ai_service.AIServiceClient(target="unused").transcribe(
            request_id="job-1",
            audio_path=Path("audio.wav"),
            options=_options(),
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_RESPONSE"


def test_client_bubbles_retryable_grpc_error(monkeypatch: pytest.MonkeyPatch) -> None:
    grpc_error = FakeRpcError(grpc.StatusCode.UNAVAILABLE)
    monkeypatch.setattr(ai_service.grpc, "insecure_channel", lambda target: FakeChannel())
    monkeypatch.setattr(
        ai_service.transcription_pb2_grpc,
        "TranscriptionServiceStub",
        lambda channel: RaisingStub(grpc_error),
    )

    with pytest.raises(FakeRpcError):
        ai_service.AIServiceClient(target="unused").transcribe(
            request_id="job-1",
            audio_path=Path("audio.wav"),
            options=_options(),
        )
