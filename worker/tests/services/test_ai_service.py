from pathlib import Path

import grpc
import pytest

from app.schemas.transcribe.input import TranscribeOptions
from app.services import ai_service
from app.services.ai_service import AIServiceTerminalError
from app.schemas.chapters.options import GenerateChaptersJobOptions
from app.schemas.chapters.result import (
    GenerateChaptersTranscript,
    GenerateChaptersTranscriptSegment,
)
from app.utils import ai_generate_chapters_mapper, ai_transcribe_mapper
from chaptering.v1 import chaptering_pb2
from transcribe.v1 import transcribe_pb2


def _options() -> TranscribeOptions:
    return TranscribeOptions.model_validate(
        {
            "language": "en",
            "vad": {"enabled": True, "sensitivity": "medium"},
            "diarization": {
                "enabled": True,
                "numSpeakers": 2,
                "minSpeakers": 1,
                "maxSpeakers": 3,
            },
            "sourceSeparation": {"enabled": False, "mode": "vocals_only"},
            "wordTimestamps": {"enabled": True},
        }
    )


def _response(request_id: str = "job-1") -> transcribe_pb2.TranscribeResponse:
    return transcribe_pb2.TranscribeResponse(
        job_id=request_id,
        status=transcribe_pb2.TRANSCRIBE_STATUS_COMPLETED,
        language="en",
        asr_model="ai-service-mock-transcriber-v1",
        segments=[
            transcribe_pb2.TranscriptSegment(
                start_seconds=0.0,
                end_seconds=1.0,
                text="Hello",
                confidence=0.9,
                speaker="speaker-1",
            ),
            transcribe_pb2.TranscriptSegment(
                start_seconds=1.0,
                end_seconds=2.0,
                text="world",
            ),
        ],
    )


def test_build_request_maps_transcript_options(tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.wav"

    request = ai_transcribe_mapper.build_transcribe_request(
        request_id="job-1",
        audio_path=audio_path,
        options=_options(),
    )

    assert request.job_id == "job-1"
    assert request.audio.local_path == str(audio_path)
    assert request.options.language == "en"
    assert request.options.vad.enabled is True
    assert request.options.vad.sensitivity == "medium"
    assert request.options.diarization.enabled is True
    assert request.options.diarization.num_speakers == 2
    assert request.options.diarization.min_speakers == 1
    assert request.options.diarization.max_speakers == 3
    assert request.options.source_separation.enabled is False
    assert request.options.source_separation.mode == "vocals_only"
    assert request.options.word_timestamps.enabled is True


def test_map_response_returns_transcript_result() -> None:
    result = ai_transcribe_mapper.map_transcribe_response(
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
    with pytest.raises(ValueError, match="job_id does not match"):
        ai_transcribe_mapper.map_transcribe_response(
            request_id="job-1",
            response=_response(request_id="other-job"),
        )


def test_map_response_rejects_empty_segments() -> None:
    response = transcribe_pb2.TranscribeResponse(
        job_id="job-1",
        status=transcribe_pb2.TRANSCRIBE_STATUS_COMPLETED,
        language="en",
        asr_model="ai-service-mock-transcriber-v1",
    )

    with pytest.raises(ValueError, match="did not include transcript segments"):
        ai_transcribe_mapper.map_transcribe_response(
            request_id="job-1", response=response
        )


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
        request: transcribe_pb2.TranscribeRequest,
        *,
        timeout: int,
    ) -> transcribe_pb2.TranscribeResponse:
        raise self.error


class RespondingStub:
    def __init__(self, response: transcribe_pb2.TranscribeResponse) -> None:
        self.response = response

    def Transcribe(
        self,
        request: transcribe_pb2.TranscribeRequest,
        *,
        timeout: int,
    ) -> transcribe_pb2.TranscribeResponse:
        return self.response


def test_client_maps_terminal_grpc_error(monkeypatch: pytest.MonkeyPatch) -> None:
    grpc_error = FakeRpcError(grpc.StatusCode.NOT_FOUND)
    monkeypatch.setattr(
        ai_service.grpc, "insecure_channel", lambda target: FakeChannel()
    )
    monkeypatch.setattr(
        ai_service.transcribe_pb2_grpc,
        "TranscribeServiceStub",
        lambda channel: RaisingStub(grpc_error),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        ai_service.AIServiceClient(target="unused").transcribe(
            request_id="job-1",
            audio_path=Path("audio.wav"),
            options=_options(),
        )

    assert error.value.error_code == "AI_SERVICE_NOT_FOUND"


def test_client_maps_invalid_response_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ai_service.grpc, "insecure_channel", lambda target: FakeChannel()
    )
    monkeypatch.setattr(
        ai_service.transcribe_pb2_grpc,
        "TranscribeServiceStub",
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
    monkeypatch.setattr(
        ai_service.grpc, "insecure_channel", lambda target: FakeChannel()
    )
    monkeypatch.setattr(
        ai_service.transcribe_pb2_grpc,
        "TranscribeServiceStub",
        lambda channel: RaisingStub(grpc_error),
    )

    with pytest.raises(FakeRpcError):
        ai_service.AIServiceClient(target="unused").transcribe(
            request_id="job-1",
            audio_path=Path("audio.wav"),
            options=_options(),
        )


def _generate_chapters_options() -> GenerateChaptersJobOptions:
    return GenerateChaptersJobOptions.model_validate(
        {
            "minChapterDuration": 60,
            "targetChapterDuration": 120,
            "maxChapters": 3,
            "useLlm": True,
            "useEmbeddings": True,
        }
    )


def _generate_chapters_transcript() -> GenerateChaptersTranscript:
    return GenerateChaptersTranscript(
        id="00000000-0000-4000-8000-000000000004",
        media_id="00000000-0000-4000-8000-000000000002",
        language="en",
        version=2,
        media_duration=240.0,
        segments=[
            GenerateChaptersTranscriptSegment(
                id="00000000-0000-4000-8000-000000000006",
                start_time=0.0,
                end_time=120.0,
                text="Topic introduction",
                clean_text="Topic introduction",
            )
        ],
    )


def _generate_chapters_response(
    request_id: str = "job-1",
) -> chaptering_pb2.GenerateChaptersResponse:
    return chaptering_pb2.GenerateChaptersResponse(
        request_id=request_id,
        language="en",
        model="ai-service-generate-chapters-v1",
        source=chaptering_pb2.CHAPTER_SOURCE_LLM,
        chapters=[
            chaptering_pb2.GeneratedChapter(
                index=1,
                start_seconds=0.0,
                end_seconds=240.0,
                title="Introduction",
                summary="The speaker introduces the topic.",
                score=0.9,
                scores=chaptering_pb2.BoundaryScores(
                    score=0.9,
                    boundary_score=0.8,
                    pause_score=0.1,
                    discourse_marker_score=0.2,
                    semantic_shift_score=0.3,
                    duration_score=0.7,
                ),
            )
        ],
    )


def test_build_generate_chapters_request_maps_transcript_and_options() -> None:
    request = ai_generate_chapters_mapper.build_generate_chapters_request(
        request_id="job-1",
        transcript=_generate_chapters_transcript(),
        options=_generate_chapters_options(),
    )

    assert request.request_id == "job-1"
    assert request.language == "en"
    assert request.media_duration_seconds == 240.0
    assert request.segments[0].segment_id == "00000000-0000-4000-8000-000000000006"
    assert request.options.min_chapter_duration_seconds == 60
    assert request.options.target_chapter_duration_seconds == 120
    assert request.options.max_chapter_duration_seconds == 240
    assert request.options.max_chapters == 3
    assert request.options.use_embeddings is True
    assert request.options.use_llm is True


def test_map_generate_chapters_response_returns_result() -> None:
    result = ai_generate_chapters_mapper.map_generate_chapters_response(
        request_id="job-1",
        transcript=_generate_chapters_transcript(),
        response=_generate_chapters_response(),
    )

    assert result.source == "LLM"
    assert result.model == "ai-service-generate-chapters-v1"
    assert result.transcript_version == 2
    assert len(result.chapters) == 1
    assert result.chapters[0].title == "Introduction"
    assert result.chapters[0].score.semantic_shift_score == 0.3


def test_map_generate_chapters_response_rejects_mismatched_request_id() -> None:
    with pytest.raises(ValueError, match="request_id does not match"):
        ai_generate_chapters_mapper.map_generate_chapters_response(
            request_id="job-1",
            transcript=_generate_chapters_transcript(),
            response=_generate_chapters_response(request_id="other-job"),
        )


class ChapteringRaisingStub:
    def __init__(self, error: grpc.RpcError) -> None:
        self.error = error

    def GenerateChapters(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        *,
        timeout: int,
    ) -> chaptering_pb2.GenerateChaptersResponse:
        raise self.error


class ChapteringRespondingStub:
    def __init__(self, response: chaptering_pb2.GenerateChaptersResponse) -> None:
        self.response = response

    def GenerateChapters(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        *,
        timeout: int,
    ) -> chaptering_pb2.GenerateChaptersResponse:
        return self.response


def test_client_generate_chapters_maps_terminal_grpc_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grpc_error = FakeRpcError(grpc.StatusCode.INVALID_ARGUMENT)
    monkeypatch.setattr(
        ai_service.grpc, "insecure_channel", lambda target: FakeChannel()
    )
    monkeypatch.setattr(
        ai_service.chaptering_pb2_grpc,
        "ChapteringServiceStub",
        lambda channel: ChapteringRaisingStub(grpc_error),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        ai_service.AIServiceClient(target="unused").generate_chapters(
            request_id="job-1",
            transcript=_generate_chapters_transcript(),
            options=_generate_chapters_options(),
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_ARGUMENT"


def test_client_generate_chapters_maps_invalid_response_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ai_service.grpc, "insecure_channel", lambda target: FakeChannel()
    )
    monkeypatch.setattr(
        ai_service.chaptering_pb2_grpc,
        "ChapteringServiceStub",
        lambda channel: ChapteringRespondingStub(
            _generate_chapters_response(request_id="other-job")
        ),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        ai_service.AIServiceClient(target="unused").generate_chapters(
            request_id="job-1",
            transcript=_generate_chapters_transcript(),
            options=_generate_chapters_options(),
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_RESPONSE"
